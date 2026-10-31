#!/usr/bin/env python3
"""Hand-built A3 poster: rounded photographic modules form Cyrillic КОД.

No generated imagery. Existing source photographs are embedded once each.
Typography is outlined from the local Montserrat font for portable printing.
"""
from pathlib import Path
import base64,json,math,io
from html import escape
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'design/cultural-code-poster-kod.svg'
font=instantiateVariableFont(TTFont(ROOT/'assets/fonts/Montserrat-Variable.ttf'),{'wght':500},inplace=False)
glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
parts=['''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="297mm" height="420mm" viewBox="0 0 1485 2100" role="img" aria-labelledby="title description">
<title id="title">Культурный код — исторический квиз. 2 ноября 14:00. «Вектор», ул. Фрунзе, 60</title>
<desc id="description">Белая афиша. Слово КОД собрано вручную из округлых фотосекций: подлинные цветные снимки Сергея Прокудина-Горского начала XX века. Выше чёрное КУЛЬТУРНЫЙ и Исторический квиз. Ниже дата и адрес.</desc>
<rect width="1485" height="2100" fill="#fff"/>
<defs>''']
photos={}
for name in ['locomotive','suzdal','wooden-house','spinning','river-bridge']:
 path=ROOT/f'assets/cover-history/{name}.jpg';image=Image.open(path).convert('RGB');w,h=image.size;photos[name]=(w,h)
 # Export-only JPEG compression; source images are retained unchanged.
 encoded=io.BytesIO();image.save(encoded,format='JPEG',quality=88,optimize=True)
 parts.append(f'<image id="photo-{name}" width="{w}" height="{h}" xlink:href="data:image/jpeg;base64,{base64.b64encode(encoded.getvalue()).decode()}"/>')
parts.append('</defs>')

def text(label,y,size,tracking=0,color='#181818'):
 scale=size/units;adv=[glyphs[cmap[ord(c)]].width for c in label];width=sum(adv)*scale+max(0,len(label)-1)*tracking;x=(1485-width)/2
 parts.append(f'<g aria-label="{escape(label)}" fill="{color}" transform="translate({x:.3f} {y})">')
 cursor=0
 for ch,a in zip(label,adv):
  pen=SVGPathPen(glyphs);glyphs[cmap[ord(ch)]].draw(pen);d=pen.getCommands()
  if d:parts.append(f'<path d="{d}" transform="translate({cursor:.3f} 0) scale({scale:.6f} {-scale:.6f})"/>')
  cursor+=a*scale+tracking
 parts.append('</g>')

def polygon(points,r=22):
 # Round each corner with a quadratic curve, retaining wide photographic faces.
 corners=[]
 for i,p in enumerate(points):
  prev=points[i-1];nxt=points[(i+1)%len(points)];l1=math.dist(p,prev);l2=math.dist(p,nxt);v=min(r,l1*.32,l2*.32)
  a=(p[0]+(prev[0]-p[0])*v/l1,p[1]+(prev[1]-p[1])*v/l1)
  b=(p[0]+(nxt[0]-p[0])*v/l2,p[1]+(nxt[1]-p[1])*v/l2)
  corners.append((a,p,b))
 d=f'M{corners[0][0][0]:.2f},{corners[0][0][1]:.2f}'
 for a,p,b in corners:d+=f'L{a[0]:.2f},{a[1]:.2f}Q{p[0]},{p[1]} {b[0]:.2f},{b[1]:.2f}'
 return d+'Z'

count=0
def tile(shape,box,photo,focus=(.5,.5)):
 global count
 count+=1;w,h=photos[photo];x,y,bw,bh=box;scale=max(bw/w,bh/h);tx=x-(w*scale-bw)*focus[0];ty=y-(h*scale-bh)*focus[1]
 parts.append(f'<defs><clipPath id="tile-{count}">{shape}</clipPath></defs><g clip-path="url(#tile-{count})"><use xlink:href="#photo-{photo}" transform="translate({tx:.3f} {ty:.3f}) scale({scale:.6f})"/></g>')

def rect(x,y,w,h,r=28):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}"/>'
text('Исторический квиз',325,25,1.0,'#777777')
text('КУЛЬТУРНЫЙ',490,66,4.2)

# К: interrupted upright and two rounded diagonal arms.
parts.append('<g transform="translate(100 625)" aria-label="К">')
tile(rect(0,0,102,182),(0,0,102,182),'suzdal',(.5,.25))
tile(rect(0,196,102,178),(0,196,102,178),'spinning',(.4,.42))
tile(rect(0,388,102,182),(0,388,102,182),'wooden-house',(.35,.5))
top=[(116,240),(279,0),(375,0),(375,77),(207,307)]
tile(f'<path d="{polygon(top,26)}"/>',(116,0,259,307),'locomotive',(.55,.5))
bottom=[(124,346),(201,285),(375,492),(375,570),(287,570)]
tile(f'<path d="{polygon(bottom,26)}"/>',(124,285,251,285),'river-bridge',(.5,.52))
parts.append('</g>')

# О: four thick, individually rounded corner sections; white seams are deliberate.
parts.append('<g transform="translate(525 625)" aria-label="О">')
quarter='M174 0H128Q0 0 0 128V264Q0 278 14 278H91Q105 278 105 264V149Q105 105 149 105H174Q188 105 188 91V14Q188 0 174 0Z'
for transform,photo,focus in [('', 'suzdal',(.5,.5)),('translate(390 0) scale(-1 1)','wooden-house',(.55,.5)),('translate(0 570) scale(1 -1)','locomotive',(.4,.5)),('translate(390 570) scale(-1 -1)','river-bridge',(.55,.55))]:
 # Transform the clipping geometry, not the photograph: source images remain upright.
 shape=f'<path d="{quarter}" transform="{transform}"/>' if transform else f'<path d="{quarter}"/>'
 bx=202 if '390' in transform else 0;by=292 if '570' in transform else 0
 tile(shape,(bx,by,188,278),photo,focus)
parts.append('</g>')

# Д: flat head, slanted left leg, upright right leg, broad base and two feet.
parts.append('<g transform="translate(970 625)" aria-label="Д">')
tile(rect(137,0,238,104),(137,0,238,104),'wooden-house',(.5,.28))
left=[(128,118),(233,118),(133,449),(24,449)]
tile(f'<path d="{polygon(left,24)}"/>',(24,118,209,331),'spinning',(.4,.5))
tile(rect(270,118,105,331),(270,118,105,331),'suzdal',(.5,.4))
tile(rect(0,463,410,107),(0,463,410,107),'river-bridge',(.5,.55))
tile(rect(0,584,105,67,23),(0,584,105,67),'locomotive',(.6,.6))
tile(rect(305,584,105,67,23),(305,584,105,67),'wooden-house',(.5,.2))
parts.append('</g>')

text('2 ноября 14:00',1630,54,.4)
text('«Вектор», ул. Фрунзе, 60',1715,32,.2)
parts.append('</svg>')
OUT.write_text('\n'.join(parts))
manifest={'format':'A3 portrait 297 × 420 mm','svg':str(OUT.relative_to(ROOT)),'text':['Исторический квиз','КУЛЬТУРНЫЙ','КОД','2 ноября 14:00','«Вектор», ул. Фрунзе, 60'],'construction':'Hand-built SVG; 15 rounded photograph sections form Cyrillic КОД; no generated imagery or colorization. Text outlined from local Montserrat Medium 500.','photoSources':'source/cover-history-sources.json','fontSource':'source/montserrat-font-source.json','photos':[f'assets/cover-history/{x}.jpg' for x in photos]}
(ROOT/'source/poster-kod-design.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(OUT)
if '--export' in __import__('sys').argv:
 import subprocess,tempfile
 from PIL.PngImagePlugin import PngInfo
 from pypdf import PdfReader,PdfWriter
 sources=json.loads((ROOT/'source/cover-history-sources.json').read_text())
 attribution='\n'.join(f"{item['caption']} — {item['sourcePage']}" for item in sources)
 png=OUT.with_suffix('.png');pdf=OUT.with_name('cultural-code-poster-kod-A3.pdf')
 subprocess.run(['inkscape',str(OUT),'--export-type=png','--export-filename='+str(png),'--export-width=2480'],check=True,capture_output=True)
 with tempfile.TemporaryDirectory(prefix='kod-a3-poster-') as directory:
  raw=Path(directory)/'raw.pdf';compressed=Path(directory)/'compressed.pdf'
  subprocess.run(['inkscape',str(OUT),'--export-type=pdf','--export-filename='+str(raw)],check=True,capture_output=True)
  subprocess.run(['gs','-q','-sDEVICE=pdfwrite','-dCompatibilityLevel=1.6','-dNOPAUSE','-dBATCH','-dAutoFilterColorImages=false','-dColorImageFilter=/DCTEncode','-dJPEGQ=92','-dDownsampleColorImages=false','-sOutputFile='+str(compressed),str(raw)],check=True,capture_output=True)
  writer=PdfWriter(clone_from=PdfReader(compressed));writer.add_metadata({'/Title':'Культурный код — исторический квиз, 2 ноября 14:00','/Subject':attribution})
  with pdf.open('wb') as file:writer.write(file)
 picture=Image.open(png);picture.load();info=PngInfo();info.add_itxt('Title','Культурный код — 2 ноября 14:00');info.add_itxt('Description',attribution);picture.save(png,pnginfo=info,dpi=(211.9,211.9))
 print('Exported A3 PNG and PDF with source metadata.')
