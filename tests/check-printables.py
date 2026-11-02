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
cut_lines = [d for d in drawings if (d['rect'].height > 290 * mm and d['rect'].width < .01) or (d['rect'].width > 200 * mm and d['rect'].height < .01)]
assert len(cut_lines) == 3, 'One central and two horizontal shared cut lines'
for index, rd in enumerate(rounds):
    x, y = (index % 2) * 105 * mm, (index // 2) * 99 * mm
    cell = fitz.Rect(x, y, x + 105 * mm, y + 99 * mm)
    text = page.get_text(clip=cell).strip().splitlines()
    assert text == ['КУЛЬТУРНЫЙ КОД', str(index + 1), rd['title'], 'Команда'] + [f'{n:02d}' for n in range(1, 11)], text
    rows = [d for d in drawings if abs(d['rect'].width - 78 * mm) < .1 and d['rect'].height < .01 and cell.contains(d['rect'])]
    assert len(rows) == 10
    for word in page.get_text('words', clip=cell):
        assert cell.contains(fitz.Rect(word[:4]))
html = (root / 'design/answer-sheets.html').read_text()
assert html.count('class="slip"') == 6 and html.count('<li value=') == 60
assert html.count('class="brand"') == 6 and 'youth-council' not in html and 'quiz-logo' not in html
assert html.count('class="team"') == 6
assert not re.search('Итого:|Баллы|ножниц|пунктир', html)
print('PASS: one exact A4 page, six 105×99 mm slips with rounded header panels, clear continuous cut lines, 60 writing rows, only required text, text headings; matching HTML print layout.')
