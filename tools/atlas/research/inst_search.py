import json,re,sys
import os;sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from commons import api
INST=['piano','violin','cello','double bass','harp','acoustic guitar','electric guitar','banjo','mandolin','ukulele','trumpet','trombone','French horn','tuba','saxophone','clarinet','flute','oboe','bassoon','accordion','harmonica','pipe organ','harpsichord','marimba','xylophone','vibraphone','glockenspiel','timpani','bagpipes','sitar','tabla','koto','shamisen','shakuhachi','erhu','guzheng','pipa','oud','kora','mbira','kalimba','djembe','steelpan','didgeridoo','balalaika','bouzouki','theremin','hang drum','gamelan','duduk','charango','pan flute','hurdy-gurdy','nyckelharpa','santoor','bansuri','berimbau','cajón','hammered dulcimer','musical saw']
out={}
for ins in INST:
    d=api(action='query',generator='search',gsrsearch=f'"{ins}" filetype:audio',gsrnamespace=6,gsrlimit=25,prop='imageinfo',iiprop='url|size|mime|extmetadata',iiextmetadatafilter='LicenseShortName|Artist|ImageDescription|DateTimeOriginal')
    rows=[]
    for pg in (d.get('query',{}).get('pages',{}) or {}).values():
        ii=(pg.get('imageinfo') or [{}])[0];md=ii.get('extmetadata',{})
        g=lambda k:re.sub(r'\s+',' ',re.sub('<[^>]+>','',md.get(k,{}).get('value',''))).strip()
        rows.append({'title':pg['title'][5:],'lic':g('LicenseShortName'),'artist':g('Artist')[:80],'desc':g('ImageDescription')[:200],'mb':round(ii.get('size',0)/1e6,2),'mime':ii.get('mime',''),'url':ii.get('url','')})
    out[ins]=rows;print(ins,len(rows),flush=True)
json.dump(out,open('inst.json','w'),ensure_ascii=False,indent=1)
