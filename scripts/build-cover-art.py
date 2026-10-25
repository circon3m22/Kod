#!/usr/bin/env python3
"""Build the shared live wordmark and a 4:3 poster from real, unique photos."""
from pathlib import Path
import json,math,base64
from html import escape
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT=Path(__file__).resolve().parents[1]
def rounded(points,r=12):
 corners=[]
 for i,p in enumerate(points):
  prev,nxt=points[i-1],points[(i+1)%len(points)];l1,l2=math.dist(p,prev),math.dist(p,nxt);v=min(r,l1*.48,l2*.48)
  a=(p[0]+(prev[0]-p[0])*v/l1,p[1]+(prev[1]-p[1])*v/l1);b=(p[0]+(nxt[0]-p[0])*v/l2,p[1]+(nxt[1]-p[1])*v/l2);corners.append((a,p,b))
 d=f'M{corners[0][0][0]:.3f},{corners[0][0][1]:.3f}'
 for a,p,b in corners:d+=f'L{a[0]:.3f},{a[1]:.3f}Q{p[0]},{p[1]} {b[0]:.3f},{b[1]:.3f}'
 return d+'Z'

letters=[
 {'name':'К','x':0,'path':rounded([(0,0),(118,0),(118,226),(308,0),(450,0),(219,274),(465,560),(315,560),(118,317),(118,560),(0,560)],56)},
 {'name':'О','x':555,'path':'M280 0A280 280 0 1 1 280 560A280 280 0 1 1 280 0Z M280 132A148 148 0 1 0 280 428A148 148 0 1 0 280 132Z'},
 {'name':'Д','x':1205,'path':rounded([(0,448),(48,448),(145,0),(436,0),(436,448),(520,448),(520,630),(395,630),(395,560),(125,560),(125,630),(0,630)],56)+' '+rounded([(180,448),(310,448),(310,125),(242,125)],40)}
]
photo_sources=json.loads((ROOT/'source/cover-era-sources.json').read_text())['images']
photo_by_id={x['id']:x for x in photo_sources}
sectors=[]
def sector(letter,photo,box,region,exit,align='xMidYMid'):
 sectors.append({'letter':letter,'photo':photo_by_id[photo]['path'],'photoId':photo,'box':box,'region':region,'exit':exit,'align':align})
# Each region meets its neighbours across a narrow seam; the silhouette stays legible.
sector(0,'tolstoy',[0,0,118,560],rounded([(0,0),(115,0),(115,560),(0,560)],60),[-850,-65,-12,30])
sector(0,'bogatyrs',[118,0,347,278],rounded([(121,222),(308,0),(450,0),(219,278),(121,278)],60),[-630,-350,-18,100])
sector(0,'borodino',[118,284,347,276],rounded([(121,284),(223,284),(465,560),(315,560),(121,321)],60),[-640,350,16,60])
# Three annular sectors share a strictly circular outer and inner boundary.
for i,(photo,box,exit) in enumerate([
 ('overseas-guests',[280,0,280,422],[370,-420,13,20]),
 ('moscow-1964',[37,280,486,280],[0,510,-8,120]),
 ('olympics-1980',[0,0,280,422],[-370,-420,-13,70])]):
 a=math.radians(-90+i*120+.65);b=math.radians(30+i*120-.65)
 def polar(radius,angle):return f'{280+radius*math.cos(angle):.3f} {280+radius*math.sin(angle):.3f}'
 radius=48;outer_delta=radius/280;inner_delta=radius/148
 region=(f'M{polar(280-radius,a)}Q{polar(280,a)} {polar(280,a+outer_delta)}'
  f'A280 280 0 0 1 {polar(280,b-outer_delta)}Q{polar(280,b)} {polar(280-radius,b)}'
  f'L{polar(148+radius,b)}Q{polar(148,b)} {polar(148,b-inner_delta)}'
  f'A148 148 0 0 0 {polar(148,a+inner_delta)}Q{polar(148,a)} {polar(148+radius,a)}Z')
 sector(1,photo,box,region,exit)
sector(2,'nicholas-ii',[48,0,194,445],rounded([(145,0),(245,0),(245,125),(181,445),(49,445)],56),[650,-300,-15,80])
sector(2,'kombat',[248,0,188,445],rounded([(251,0),(436,0),(436,445),(310,445),(310,125),(251,125)],56),[870,-70,16,0])
sector(2,'soyuz-1975',[0,451,520,179],rounded([(0,451),(520,451),(520,630),(395,630),(395,560),(125,560),(125,630),(0,630)],60),[760,360,12,110])
for item in sectors:
 focus={'tolstoy':.72,'nicholas-ii':.25,'kombat':.27}.get(item['photoId'])
 if focus is not None:
  x,y,w,h=item['box'];iw,ih=Image.open(ROOT/item['photo']).size;scale=max(w/iw,h/ih)
  item['imageBox']=[x-(iw*scale-w)*focus,y-(ih*scale-h)*.5,iw*scale,ih*scale]
assert len(sectors)==len({x['photo'] for x in sectors})==9
art={'width':1725,'height':630,'letters':letters,'sectors':sectors,'event':{'kicker':'Исторический квиз','title':'КУЛЬТУРНЫЙ','date':'2 ноября 18:30','venue':'«Вектор», ул. Фрунзе, 60'}}
(ROOT/'cover-art.js').write_text('// Shared geometry for the live cover and the 4:3 poster. Local sources only.\nwindow.COVER_ART = '+json.dumps(art,ensure_ascii=False,indent=2)+';\n')

credits='\n\n'.join(f"{x['caption']}\n{x['author']} · {x['license']}\n{x['sourceUrl']}\n{x.get('licenseUrl','')}\nИзменения: кадрирование по скруглённым секциям; исходный цвет сохранён." for x in photo_sources)
(ROOT/'design/cultural-code-poster-kod-4x3-credits.txt').write_text('Источники фотосекций афиши Культурный код\n\n'+credits+'\n')

# The poster uses exactly the same clipped regions as the live website.
font=instantiateVariableFont(TTFont(ROOT/'assets/fonts/Onest-Variable.ttf'),{'wght':500},inplace=False);glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
parts=['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400mm" height="300mm" viewBox="0 0 1920 1440" role="img" aria-labelledby="title">','<title id="title">Культурный код. Исторический квиз. 2 ноября 18:30. «Вектор», ул. Фрунзе, 60</title>','<rect width="1920" height="1440" fill="white"/>']
def text(label,y,size,tracking=0,color='#171717'):
 scale=size/units;width=sum(glyphs[cmap[ord(c)]].width for c in label)*scale+tracking*(len(label)-1);x=(1920-width)/2;cursor=0
 parts.append(f'<g aria-label="{escape(label)}" fill="{color}" transform="translate({x:.3f} {y})">')
 for c in label:
  g=glyphs[cmap[ord(c)]];pen=SVGPathPen(glyphs);g.draw(pen)
  if pen.getCommands():parts.append(f'<path d="{pen.getCommands()}" transform="translate({cursor:.3f} 0) scale({scale:.6f} {-scale:.6f})"/>')
  cursor+=g.width*scale+tracking
 parts.append('</g>')
parts.append('<metadata id="photo-attribution">'+escape(credits)+'</metadata>')
text(art['event']['kicker'],200,39,1.4,'#777777');text(art['event']['title'],340,94,5.6)
parts.append('<g transform="translate(110 460) scale(.985)"><defs>')
for i,letter in enumerate(letters):parts.append(f'<clipPath id="letter-{i}"><path d="{letter["path"]}" clip-rule="evenodd"/></clipPath>')
for i,s in enumerate(sectors):parts.append(f'<clipPath id="sector-{i}"><path d="{s["region"]}"/></clipPath>')
parts.append('</defs>')
for i,s in enumerate(sectors):
 x,y,w,h=s.get('imageBox',s['box']);photo=ROOT/s['photo'];raw=base64.b64encode(photo.read_bytes()).decode();align='none' if 'imageBox' in s else s['align']+' slice'
 parts.append(f'<g transform="translate({letters[s["letter"]]["x"]} 0)"><g clip-path="url(#letter-{s["letter"]})"><g clip-path="url(#sector-{i})"><image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="{align}" xlink:href="data:image/jpeg;base64,{raw}"/></g></g></g>')
parts.append('</g>');text(art['event']['date'],1225,56,.4);text(art['event']['venue'],1300,32,.2);parts.append('</svg>')
(ROOT/'design/cultural-code-poster-kod-4x3.svg').write_text('\n'.join(parts))
(ROOT/'source/live-cover-design.json').write_text(json.dumps({'format':'4:3, 400 × 300 mm, 1920 × 1440 viewBox','sectors':9,'uniquePhotographs':9,'font':'Onest Medium 500','layout':'cover-art.js','photoSources':['source/cover-era-sources.json'],'animation':'Text fades; the assembled word zooms through the centre of O. Stage cards fade in from left to right with 120 ms stagger. System and app reduced motion skip both transitions.'},ensure_ascii=False,indent=2)+'\n')
print('Built shared nine-sector wordmark and 4:3 poster.')

if '--export' in __import__('sys').argv:
 import subprocess,tempfile
 from PIL.PngImagePlugin import PngInfo
 from pypdf import PdfReader,PdfWriter
 svg=ROOT/'design/cultural-code-poster-kod-4x3.svg';png=svg.with_suffix('.png');pdf=svg.with_suffix('.pdf')
 subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename='+str(png),'--export-width=3200'],check=True,capture_output=True)
 with tempfile.TemporaryDirectory(prefix='kod-poster-') as td:
  raw=Path(td)/'raw.pdf';compressed=Path(td)/'compressed.pdf'
  subprocess.run(['inkscape',str(svg),'--export-type=pdf','--export-filename='+str(raw)],check=True,capture_output=True)
  subprocess.run(['gs','-q','-sDEVICE=pdfwrite','-dCompatibilityLevel=1.6','-dNOPAUSE','-dBATCH','-dAutoFilterColorImages=false','-dColorImageFilter=/DCTEncode','-dAutoFilterGrayImages=false','-dGrayImageFilter=/DCTEncode','-dJPEGQ=92','-dDownsampleColorImages=false','-dDownsampleGrayImages=false','-sOutputFile='+str(compressed),str(raw)],check=True,capture_output=True)
  writer=PdfWriter(clone_from=PdfReader(compressed));writer.add_metadata({'/Title':'Культурный код — исторический квиз','/Author':'Культурный код; авторы фотосекций указаны в описании','/Subject':credits,'/Keywords':'4:3; источники и лицензии фотографий; 2 ноября 18:30'})
  with pdf.open('wb') as f:writer.write(f)
 image=Image.open(png);image.load();info=PngInfo();info.add_itxt('Description',credits);info.add_itxt('Copyright','Фотосекции сохраняют индивидуальные лицензии, приведённые в Description.');info.add_itxt('Title','Культурный код — исторический квиз')
 image.save(png,pnginfo=info,dpi=(203.2,203.2))
 print('Exported PNG and PDF with embedded photo attribution; credits sidecar retained.')
