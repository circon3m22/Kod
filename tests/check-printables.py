"""Check the physical six-up page, text safety and vector-only marks."""
from pathlib import Path
import json
import re
import fitz

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'quiz-data.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
rounds = [r for r in data['rounds'] if r['kind'] == 'main']
pdf = fitz.open(root / 'design/answer-sheets.pdf')
assert len(pdf) == 1
page = pdf[0]
mm = 72 / 25.4
assert abs(page.rect.width - 210 * mm) < .02
assert abs(page.rect.height - 297 * mm) < .02
assert not page.get_images(), 'Page must remain vector-only'
drawings = page.get_drawings()
borders = [d for d in drawings if abs(d['rect'].width - 95 * mm) < .1 and abs(d['rect'].height - 91 * mm) < .1]
assert len(borders) == 6
assert all(.12 < b['stroke_opacity'] < .25 and b['dashes'] == '[] 0' and all(item[0] != 'c' for item in b['items']) for b in borders)
assert all(page.rect.contains(b['rect']) for b in borders)
for index, border in enumerate(borders):
    text = page.get_text(clip=border['rect']).strip().splitlines()
    assert text == ['КУЛЬТУРНЫЙ КОД', str(index + 1), rounds[index]['title'], 'Команда:'] + [str(n) for n in range(1, 11)], text
    rows = [d for d in drawings if abs(d['rect'].width - 77 * mm) < .1 and d['rect'].height < .01 and border['rect'].contains(d['rect'])]
    assert len(rows) == 10
    for word in page.get_text('words', clip=border['rect']):
        assert border['rect'].contains(fitz.Rect(word[:4]))
html = (root / 'design/answer-sheets.html').read_text()
assert html.count('class="slip"') == 6 and html.count('<li value=') == 60
assert html.count('class="brand"') == 6 and 'youth-council' not in html and 'quiz-logo' not in html
assert html.count('class="team"') == 6
assert not re.search('Итого:|Баллы|ножниц|пунктир', html)
print('PASS: one exact A4 page, six rectangular 95×91 mm slips, faint continuous cut lines, 60 writing rows, only required text, text headings; matching HTML print layout.')
