/* Control Room · relay passwords (a Cloudflare Worker)
   Hands out short-lived Cloudflare TURN credentials so phones and CADCAST computers can connect through
   locked-down school networks. The secret API token stays in Cloudflare; this code holds none.

   Set up once (Cloudflare dashboard ▸ Workers ▸ this worker ▸ Settings ▸ Variables and Secrets):
     TURN_KEY_ID         (Text)    the "Turn Token ID" of your TURN Server app
     TURN_KEY_API_TOKEN  (Secret)  the "API Token" shown once when you created it
   The pages fetch it with their Origin; opening the address directly in a browser now says "Not allowed" (that's right).
   It answers only the allowed origins. For extra safety: Cloudflare ▸ Notifications ▸ add a usage alert for Realtime/TURN.      */
const ALLOW = [/^https:\/\/gunnitynes\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const ok = ALLOW.some(rx => rx.test(origin));
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : 'https://gunnitynes.github.io', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    // only Control Room / CADCAST pages may ask (a request with no Origin, e.g. a script, is refused too)
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
