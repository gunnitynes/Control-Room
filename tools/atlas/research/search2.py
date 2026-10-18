import json,re,sys
import os;sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from commons import api
Q={
 # instruments still missing a clean solo recording
 'i:double bass':'intitle:"double bass" OR intitle:contrabass filetype:audio','i:trumpet':'intitle:trumpet filetype:audio','i:clarinet':'intitle:clarinet filetype:audio','i:flute':'intitle:flute -intitle:LL filetype:audio',
 'i:oboe':'intitle:oboe filetype:audio','i:bassoon':'intitle:bassoon filetype:audio','i:koto':'intitle:koto -intitle:LL filetype:audio','i:pipa':'pipa lute chinese filetype:audio',
 'i:kora':'intitle:kora -intitle:LL filetype:audio','i:duduk':'intitle:duduk -intitle:LL filetype:audio','i:balalaika':'intitle:balalaika -intitle:LL filetype:audio','i:tabla':'intitle:tabla -intitle:LL filetype:audio',
 'i:steelpan':'"steel drum" OR "steelpan" OR "steel pan" filetype:audio','i:bass guitar':'"bass guitar" filetype:audio','i:drum kit':'"drum kit" OR "drum solo" filetype:audio','i:conga':'conga OR bongo filetype:audio',
 'i:electric guitar':'intitle:"electric guitar" filetype:audio','i:glockenspiel':'intitle:glockenspiel -intitle:LL filetype:audio','i:bouzouki':'intitle:bouzouki -intitle:LL filetype:audio','i:banjo':'intitle:banjo -intitle:LL filetype:audio',
 'i:cello':'intitle:cello filetype:audio','i:mbira':'intitle:mbira filetype:audio','i:balafon':'balafon filetype:audio','i:sitar':'intitle:sitar -intitle:LL filetype:audio','i:accordion':'intitle:accordion filetype:audio',
 # places by style
 'w:Spain':'flamenco filetype:audio','w:Argentina':'tango bandoneon filetype:audio','w:Brazil':'samba OR choro filetype:audio','w:Mexico':'mariachi OR son jarocho filetype:audio','w:Cuba':'son cubano OR rumba cuba filetype:audio',
 'w:Jamaica':'mento OR reggae jamaica filetype:audio','w:Trinidad':'calypso OR steelband filetype:audio','w:Mali':'kora mali OR griot filetype:audio','w:Mongolia':'mongolian throat OR khoomei OR morin khuur filetype:audio','w:Tuva':'tuvan throat singing filetype:audio',
 'w:Ireland':'irish reel OR jig fiddle filetype:audio','w:Scotland':'scottish bagpipe OR pipe band filetype:audio','w:India':'raga OR carnatic OR hindustani filetype:audio','w:Indonesia':'gamelan filetype:audio','w:Japan':'koto OR shakuhachi OR gagaku filetype:audio',
 'w:China':'erhu OR guzheng OR chinese traditional filetype:audio','w:Korea':'gayageum OR pansori OR korean traditional filetype:audio','w:Turkey':'turkish saz OR ney OR makam filetype:audio','w:Egypt':'egyptian oud OR arabic music filetype:audio','w:Ethiopia':'ethiopian OR krar OR masinko filetype:audio',
 'w:South Africa':'south african choir OR mbaqanga OR zulu filetype:audio','w:Australia':'didgeridoo aboriginal filetype:audio','w:Hawaii':'hawaiian slack key OR steel guitar hawaii filetype:audio','w:Peru':'andean OR huayno OR quena filetype:audio','w:Bulgaria':'bulgarian choir OR folk bulgaria filetype:audio',
 'w:Georgia':'georgian polyphony filetype:audio','w:Greece':'rebetiko OR bouzouki greek filetype:audio','w:Iran':'persian santur OR tar setar filetype:audio','w:Vietnam':'vietnamese dan bau OR ca tru filetype:audio','w:Thailand':'thai piphat OR ranat filetype:audio',
 'w:USA':'bluegrass OR delta blues OR appalachian filetype:audio','w:Sweden':'nyckelharpa polska filetype:audio','w:Russia':'balalaika russian folk filetype:audio','w:Senegal':'sabar OR mbalax filetype:audio','w:Ghana':'highlife OR ghana drumming filetype:audio','w:Portugal':'fado filetype:audio','w:Austria':'yodel OR jodler filetype:audio','w:Hungary':'hungarian folk OR csárdás filetype:audio',
}
out={}
for k,q in Q.items():
    try:d=api(action='query',generator='search',gsrsearch=q,gsrnamespace=6,gsrlimit=30,prop='imageinfo',iiprop='url|size|mime|extmetadata',iiextmetadatafilter='LicenseShortName|Artist|ImageDescription|DateTimeOriginal')
    except SystemExit: print('rate',k);continue
    rows=[]
    for pg in (d.get('query',{}).get('pages',{}) or {}).values():
        ii=(pg.get('imageinfo') or [{}])[0];md=ii.get('extmetadata') or {};md=md if isinstance(md,dict) else {}
        g=lambda x:re.sub(r'\s+',' ',re.sub('<[^>]+>','',md.get(x,{}).get('value',''))).strip()
        t=pg['title'][5:]
        if t.startswith('LL-Q') or re.search(r'\.(mid|midi|webm|ogv|mp4)$',t,re.I):continue
        rows.append({'title':t,'lic':g('LicenseShortName'),'artist':g('Artist')[:80],'desc':g('ImageDescription')[:240],'date':g('DateTimeOriginal')[:30],'mb':round(ii.get('size',0)/1e6,2),'url':ii.get('url','')})
    out[k]=rows;print(k,len(rows),flush=True)
json.dump(out,open('search2.json','w'),ensure_ascii=False,indent=1)
