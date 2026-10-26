"""Export the live cover's section geometry as an outlined black logo."""
from pathlib import Path
import json, subprocess
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

root = Path(__file__).resolve().parents[1]
art = json.loads((root / 'cover-art.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
font = instantiateVariableFont(TTFont(root / 'assets/fonts/Onest-Variable.ttf'), {'wght': 500})
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
text = art['event']['title']
advance = sum(glyphs[cmap[ord(c)]].width for c in text)
scale = min(185 / font['head'].unitsPerEm, 1450 / advance)
pen = SVGPathPen(glyphs)
x = (1800 - advance * scale) / 2
for char in text:
    glyph = glyphs[cmap[ord(char)]]
    glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, x, 245)))
    x += glyph.width * scale
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1080" role="img" aria-label="Культурный код"><rect width="1800" height="1080" fill="#fff"/><g fill="#000">', '<path d="' + pen.getCommands() + '"/><defs>']
for i, letter in enumerate(art['letters']):
    svg.append(f'<clipPath id="letter-{i}"><path d="{letter["path"]}" clip-rule="evenodd"/></clipPath>')
svg.append('</defs><g transform="translate(92.5 345)">')
for section in art['sectors']:
    letter = art['letters'][section['letter']]
    svg.append(f'<g transform="translate({letter["x"]} 0)"><path clip-path="url(#letter-{section["letter"]})" d="{section["region"]}"/></g>')
svg.append('</g></g></svg>')
target = root / 'assets/brand/quiz-logo-black.svg'
target.write_text(''.join(svg))
subprocess.run(['inkscape', str(target), '--export-type=png', '--export-filename=' + str(target.with_suffix('.png')), '--export-width=3600', '--export-height=2160'], check=True, capture_output=True)
print('Exported outlined Onest heading and original KOD sections: SVG / 3600×2160 PNG.')
