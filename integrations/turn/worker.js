/* Control Room · relay passwords + file links (a Cloudflare Worker)
   1. GET /            short-lived Cloudflare TURN credentials, so phones and CADCAST computers can connect through
                       locked-down school networks. The secret API token stays in Cloudflare; this code holds none.
   2. POST /drop       a file from Control Room or a CADCAST page (Supply Drop, hand-ins), kept for 24 hours in Workers KV
                       under a random id; answers {id, url}. GET /drop/<id> downloads it (anyone holding the link: the id
                       is unguessable). GET /drop/ok says whether file links are set up. Without the KV binding, the pages
                       simply send files directly, as before.

   Set up once (Cloudflare dashboard ▸ Workers ▸ this worker ▸ Settings ▸ Variables and Secrets):
     TURN_KEY_ID         (Text)    the "Turn Token ID" of your TURN Server app
     TURN_KEY_API_TOKEN  (Secret)  the "API Token" shown once when you created it
   For file links (Storage & Databases ▸ KV ▸ Create a namespace, e.g. "controlroom-drops"; then this worker ▸ Settings ▸
   Bindings ▸ Add ▸ KV namespace): variable name DROPS, the namespace you made.
   The pages fetch it with their Origin; opening the address directly in a browser says "Not allowed" (that's right).
   Uploads are only taken from the allowed origins, at most 90 MB each, and every file expires after 24 hours.
   For extra safety: Cloudflare ▸ Notifications ▸ add a usage alert for Realtime/TURN.      */
const ALLOW = [/^https:\/\/gunnitynes\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const TTL = 86400, PART = 20e6, MAX = 90e6;   // KV values are capped at 25 MiB, so a file is kept in 20 MB parts

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const ok = ALLOW.some(rx => rx.test(origin));
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : 'https://gunnitynes.github.io', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Name', 'Access-Control-Expose-Headers': 'Content-Length, X-Name', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // file links: download (anyone with the link), upload (our pages only)
    if (url.pathname.startsWith('/drop')) {
      const rest = url.pathname.slice(5).replace(/^\//, '');
      if (request.method === 'GET' && rest === 'ok') return Response.json({ ok: !!env.DROPS }, { headers: cors });
      if (!env.DROPS) return Response.json({ error: 'file links are not set up (no DROPS binding)' }, { status: 501, headers: cors });
      if (request.method === 'GET' && /^[a-z0-9]{20,40}$/.test(rest)) {
        const meta = await env.DROPS.get(rest + ':meta', 'json');
        if (!meta) return new Response('Not found (files are kept for 24 hours)', { status: 404, headers: { ...cors, 'Access-Control-Allow-Origin': '*' } });
        const { readable, writable } = new TransformStream();
        (async () => { const w = writable.getWriter(); for (let i = 0; i < meta.n; i++) { const b = await env.DROPS.get(rest + ':' + i, 'arrayBuffer'); if (!b) break; await w.write(new Uint8Array(b)); } await w.close(); })();
        const name = String(meta.name || 'file').replace(/["\\\r\n]/g, '_');
        return new Response(readable, { headers: { ...cors, 'Access-Control-Allow-Origin': '*', 'Content-Type': meta.type || 'application/octet-stream', 'Content-Length': String(meta.size),
          'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`, 'X-Name': encodeURIComponent(name), 'Cache-Control': 'private, max-age=86400' } });
      }
      if (request.method === 'POST' && rest === '') {
        if (!ok) return new Response('Not allowed', { status: 403, headers: cors });
        const size = +request.headers.get('Content-Length') || 0;
        if (size > MAX) return Response.json({ error: 'over 90 MB' }, { status: 413, headers: cors });
        const buf = new Uint8Array(await request.arrayBuffer());
        if (!buf.length || buf.length > MAX) return Response.json({ error: 'empty or over 90 MB' }, { status: 413, headers: cors });
        const id = [...crypto.getRandomValues(new Uint8Array(16))].map(b => (b % 36).toString(36)).join('') + Date.now().toString(36);
        const n = Math.ceil(buf.length / PART);
        for (let i = 0; i < n; i++) await env.DROPS.put(id + ':' + i, buf.subarray(i * PART, (i + 1) * PART), { expirationTtl: TTL });
        const name = decodeURIComponent(request.headers.get('X-Name') || 'file').slice(0, 200);
        await env.DROPS.put(id + ':meta', JSON.stringify({ name, type: request.headers.get('Content-Type') || '', size: buf.length, n }), { expirationTtl: TTL });
        return Response.json({ id, url: `${url.origin}/drop/${id}` }, { headers: cors });
      }
      return new Response('Not found', { status: 404, headers: cors });
    }

    // relay passwords: only Control Room / CADCAST pages may ask (a request with no Origin, e.g. a script, is refused too)
    if (!ok) return new Response('Not allowed', { status: 403, headers: cors });
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return Response.json({ error: 'TURN_KEY_ID / TURN_KEY_API_TOKEN not set' }, { status: 500, headers: cors });
    const base = `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials`;
    const ask = path => fetch(`${base}/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }) });
    let r = await ask('generate-ice-servers');
    if (!r.ok) r = await ask('generate');                       // the older endpoint, same credentials
    if (!r.ok) return Response.json({ error: 'Cloudflare said ' + r.status }, { status: 502, headers: cors });
    const j = await r.json();
    const iceServers = Array.isArray(j.iceServers) ? j.iceServers : [j.iceServers];
    return Response.json({ iceServers }, { headers: cors });
  }
};
