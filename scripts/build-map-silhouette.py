#!/usr/bin/env python3
"""Build the decorative vector from attributed local geometry. Build deps: shapely, pyproj."""
from pathlib import Path
import json,hashlib
import xml.etree.ElementTree as ET
from shapely.geometry import shape
from shapely.ops import transform,unary_union
from pyproj import Transformer
ROOT=Path(__file__).resolve().parents[1]
metadata_path=ROOT/'source/poster-background-source.json'
meta=json.loads(metadata_path.read_text())
data=json.loads((ROOT/meta['geometrySource']).read_text())
def unwrap(x,y,z=None):
    try:return tuple(a+360 if a<0 else a for a in x),y
    except TypeError:return (x+360 if x<0 else x),y
land=unary_union([transform(unwrap,shape(f['geometry'])) for f in data['features']])
projection=Transformer.from_crs('EPSG:4326',meta['projection'],always_xy=True)
land=transform(projection.transform,land).buffer(1800).buffer(-1800).simplify(2500,preserve_topology=True)
minx,miny,maxx,maxy=land.bounds
scale=1880/(maxx-minx);top=(1440-(maxy-miny)*scale)/2
paths=[]
for polygon in land.geoms if hasattr(land,'geoms') else [land]:
    if polygon.area*scale*scale<.6:continue
    for ring in [polygon.exterior,*polygon.interiors]:
        paths.append('M'+'L'.join(f'{20+(x-minx)*scale:.2f},{top+(maxy-y)*scale:.2f}' for x,y in ring.coords)+'Z')
svg=ET.Element('svg',xmlns='http://www.w3.org/2000/svg',width='1920',height='1440',viewBox='0 0 1920 1440')
ET.SubElement(svg,'title').text='Светлый силуэт карты для афиши'
ET.SubElement(svg,'metadata').text=f"{meta['author']}. {meta['license']}. {meta['licenseUrl']} . Sources: "+' ; '.join(s['url'] for s in meta['sources'])+f" . Derived geometry: {meta['geometrySource']} (ODbL 1.0). Changes: {meta['changes']} . Boundary convention: {meta['boundaryConvention']}"
group=ET.SubElement(svg,'g',fill=meta['fill'],stroke='none')
ET.SubElement(group,'path',attrib={'fill-rule':'evenodd','d':''.join(paths)})
p=ROOT/meta['path'];ET.ElementTree(svg).write(p,encoding='utf-8',xml_declaration=True)
meta['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();metadata_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('Built Albers vector silhouette, no outline, uniform scale; 1880 px wide.')
