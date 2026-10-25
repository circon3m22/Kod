#!/usr/bin/env python3
"""Re-extract the supplied PPTX and DOCX. Development only: python-pptx, python-docx.
Convert the original first: soffice --headless --convert-to pptx --outdir source source/kviz-original.ppt
Then run: python scripts/extract-assets.py --pptx source/kviz-converted.pptx
Does not overwrite quiz-data.js, whose editorial mapping is reviewed separately.
"""
from pathlib import Path
import argparse,json,zipfile
from pptx import Presentation
from docx import Document
root=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument('--pptx',default=str(root/'source/kviz-converted.pptx'));args=a.parse_args()
p=Presentation(args.pptx); slides=[]
with zipfile.ZipFile(args.pptx) as z:
 for name in z.namelist():
  if name.startswith('ppt/media/'):
   dest=root/'assets'/('videos' if Path(name).suffix.lower() in ['.mp4','.wmv','.avi','.mov','.m4v'] else 'images')/Path(name).name
   dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(name))
for n,s in enumerate(p.slides,1):
 d={'slide':n,'texts':[],'images':[],'links':[],'backgroundImages':[],'shapes':[]}
 for sh in s.shapes:
  if sh.has_text_frame:d['texts'].append(sh.text)
  if sh.has_table:
   d['table']=[[c.text for c in r.cells] for r in sh.table.rows]
   d['tableLinks']=[]
   for row in sh.table.rows:
    d['tableLinks'].append([{'text':c.text,'targets':[s.part.rels[x.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')].target_ref for x in c._tc.xpath('.//a:hlinkClick') if x.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')]} for c in row.cells])
  if sh.shape_type==13:d['images'].append('assets/images/'+Path(sh.part.rels[sh._element.blip_rId].target_ref).name)
  d['shapes'].append({'id':sh.shape_id,'type':str(sh.shape_type),'x':sh.left,'y':sh.top,'width':sh.width,'height':sh.height})
 for x in s._element.xpath('.//a:hlinkClick'):
  rid=x.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
  d['links'].append({'action':x.get('action'),'target':s.part.rels[rid].target_ref if rid else None})
 for x in s._element.xpath('.//p:bg//a:blip'):
  rid=x.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
  d['backgroundImages'].append('assets/images/'+Path(s.part.rels[rid].target_ref).name)
 slides.append(d)
(root/'source/slides-extracted.json').write_text(json.dumps(slides,ensure_ascii=False,indent=2))
doc=Document(root/'source/scenario.docx'); paragraphs=[p.text for p in doc.paragraphs]
(root/'source/scenario-extracted.txt').write_text('\n'.join(paragraphs))
print(f'{len(slides)} slides, {len(list((root/"assets/images").glob("*")))} images extracted')
