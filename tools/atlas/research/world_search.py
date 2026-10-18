import json,re,sys
import os;sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from commons import api,members
C=['Afghanistan','Argentina','Australia','Belarus','Brazil','Bulgaria','Canada','China','Colombia','England','Estonia','Finland','France','Germany','Greece','Hungary','India','Indonesia','Iran','Ireland','Italy','Japan','Korea','Mexico','Nepal','Peru','Poland','Russia','South Africa','Sweden','Switzerland','Thailand','Ukraine','the United States','Uruguay','Vietnam','Wales']
out={}
for c in C:
    files=[m['title'] for m in members(f'Category:Audio files of music of {c}','file')][:120]
    rows=[]
    for i in range(0,len(files),40):
        d=api(action='query',titles='|'.join(files[i:i+40]),prop='imageinfo',iiprop='url|size|mime|extmetadata',iiextmetadatafilter='LicenseShortName|Artist|ImageDescription|DateTimeOriginal')
        for pg in d['query']['pages'].values():
            ii=(pg.get('imageinfo') or [{}])[0];md=ii.get('extmetadata',{})
            g=lambda k:re.sub(r'\s+',' ',re.sub('<[^>]+>','',md.get(k,{}).get('value',''))).strip()
            rows.append({'title':pg['title'][5:],'lic':g('LicenseShortName'),'artist':g('Artist')[:80],'desc':g('ImageDescription')[:220],'date':g('DateTimeOriginal')[:30],'mb':round(ii.get('size',0)/1e6,2),'url':ii.get('url','')})
    out[c]=rows;print(c,len(rows),flush=True)
json.dump(out,open('world.json','w'),ensure_ascii=False,indent=1)
