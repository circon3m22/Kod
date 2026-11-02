#!/usr/bin/env python3
"""Pack the complete playable quiz into one browser-openable HTML file."""
import argparse
import base64
import json
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGES = json.loads((ROOT / 'preload-assets.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
PDF = 'design/answer-sheets.pdf'


def replace_once(source, old, new, name):
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{name}: expected one occurrence, found {count}: {old[:90]}')
    return source.replace(old, new)


def data_url(path):
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    if path.endswith('.svg'):
        mime = 'image/svg+xml'
    if path.endswith('.ttf'):
        mime = 'font/ttf'
    return f'data:{mime};base64,' + base64.b64encode((ROOT / path).read_bytes()).decode('ascii')


def bundled_css(name):
    source = (ROOT / name).read_text()
    return re.sub(r'assets/[\w./-]+', lambda match: data_url(match.group(0)), source)


def bundled_scripts():
    app = (ROOT / 'app.js').read_text()
    flow = (ROOT / 'quiz-flow.js').read_text()
    preload = (ROOT / 'preload.js').read_text()
    map_path = 'assets/design/poster-russia-silhouette.svg'
    app = replace_once(app,
        f"'<g class=\"film-map-window\" mask=\"url(#film-map-reveal)\"><image class=\"film-map\" href=\"{map_path}\" x=\"240\" y=\"0\" width=\"1440\" height=\"1080\"/></g>'",
        "`<g class=\"film-map-window\" mask=\"url(#film-map-reveal)\"><image class=\"film-map\" href=\"${window.KOD_ASSET_URLS['assets/design/poster-russia-silhouette.svg']}\" x=\"240\" y=\"0\" width=\"1440\" height=\"1080\"/></g>`", 'app film map')
    app = replace_once(app, f"source.src='{map_path}'", f"source.src=window.KOD_ASSET_URLS['{map_path}']", 'app canvas map')
    app = replace_once(app, 'src="assets/stage-objects/${image}"', 'src="${window.KOD_ASSET_URLS[\'assets/stage-objects/\'+image]}"', 'app stage cards')
    app = replace_once(app, 'href="design/answer-sheets.pdf?v=20261028-clean"', 'href="${window.KOD_ASSET_URLS[\'design/answer-sheets.pdf\']}"', 'app answer sheet')
    app = replace_once(app, '<button data-action="import">Загрузить игру</button></div>', '<button data-action="import">Загрузить игру</button><button data-action="standalone-pdf">Бланки PDF</button></div>', 'app initial menu')
    flow = replace_once(flow, 'src="assets/stage-objects/${img}"', 'src="${window.KOD_ASSET_URLS[\'assets/stage-objects/\'+img]}"', 'flow stage cards')
    flow = replace_once(flow, 'src="assets/rules/${img}.webp"', 'src="${window.KOD_ASSET_URLS[\'assets/rules/\'+img+\'.webp\']}"', 'flow rule cards')
    flow = replace_once(flow, 'src="assets/stage-objects/captains-compass.png"', 'src="${window.KOD_ASSET_URLS[\'assets/stage-objects/captains-compass.png\']}"', 'flow captain image')
    flow = replace_once(flow, ".join('')}</div>`,'quick-dialog','quick')", ".join('')}<button data-action=\"standalone-pdf\">Бланки PDF</button></div>`,'quick-dialog','quick')", 'flow menu')
    preload = replace_once(preload, 'image.src=src;', 'image.src=window.KOD_ASSET_URLS[src]||src;', 'preload image')
    files = [('quiz-data.js', (ROOT / 'quiz-data.js').read_text()),
             ('cover-art.js', (ROOT / 'cover-art.js').read_text()),
             ('cover-film.js', (ROOT / 'cover-film.js').read_text()),
             ('quiz-flow.js', flow),
             ('preload-assets.js', (ROOT / 'preload-assets.js').read_text())]
    localize = '''(() => {
      const urls=window.KOD_ASSET_URLS;
      function rewrite(value){
       if(typeof value==='string')return urls[value]||value;
       if(Array.isArray(value)){for(let i=0;i<value.length;i++)value[i]=rewrite(value[i]);return value;}
       if(value&&typeof value==='object'){for(const key of Object.keys(value))value[key]=rewrite(value[key]);}
       return value;
      }
      rewrite(window.QUIZ_DATA);rewrite(window.COVER_ART);rewrite(window.COVER_FILM);
    })();'''
    download = '''document.addEventListener('click',event=>{
      if(!event.target.closest('[data-action="standalone-pdf"]'))return;
      event.preventDefault();
      const link=document.createElement('a');link.href=window.KOD_ASSET_URLS['design/answer-sheets.pdf'];
      link.download='Бланки-Культурный-код.pdf';link.click();
    },true);'''
    files += [('asset-localize', localize), ('app.js', app), ('preload.js', preload), ('standalone-pdf', download)]
    return ''.join(f'\n<script data-bundled="{name}">\n{source}\n</script>\n' for name, source in files)


def build(output):
    paths = sorted(set(IMAGES) | {PDF})
    missing = [path for path in paths if not (ROOT / path).is_file()]
    if missing:
        raise SystemExit('Missing bundled assets: ' + ', '.join(missing))
    blobs = {path: [mimetypes.guess_type(path)[0] or 'application/octet-stream', base64.b64encode((ROOT / path).read_bytes()).decode('ascii')] for path in paths}
    html = (ROOT / 'index.html').read_text()
    html = re.sub(r'<link rel="preload"[^>]+>\n', '', html)
    for css in ('styles.css', 'flow.css'):
        html = re.sub(rf'<link rel="stylesheet" href="{re.escape(css)}[^\"]*">', lambda match: f'<style data-bundled="{css}">\n{bundled_css(css)}\n</style>', html)
    html = re.sub(r'<script src="[^\"]+" defer></script>\n', '', html)
    html = html.replace('</head>', '<link rel="icon" href="data:,">\n</head>')
    payload = json.dumps(blobs, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    embedded = f'''<script id="kod-embedded-assets" type="application/json">{payload}</script>
<script>
(() => {{
 const table=JSON.parse(document.getElementById('kod-embedded-assets').textContent);
 const urls=window.KOD_ASSET_URLS={{}};
 for(const [path,[mime,encoded]] of Object.entries(table)){{
  const binary=atob(encoded),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  urls[path]=URL.createObjectURL(new Blob([bytes],{{type:mime}}));
 }}
 document.getElementById('kod-embedded-assets').remove();
}})();
</script>'''
    credits = base64.b64encode((ROOT / 'credits.html').read_bytes()).decode('ascii')
    embedded += f'\n<script id="kod-image-credits" type="application/json">"{credits}"</script>'
    html = html.replace('</body>', embedded + bundled_scripts() + '\n</body>')
    if re.search(r'<(?:script|link) src="|<link rel="stylesheet"', html):
        raise SystemExit('External script or stylesheet remains in bundle')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html)
    print(f'{output}: {output.stat().st_size} bytes; {len(IMAGES)} images and printable answer sheet embedded')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    build(args.output)
