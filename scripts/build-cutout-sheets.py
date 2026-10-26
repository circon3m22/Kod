"""One A4 page with six vector slips and a matching HTML print layout."""
from pathlib import Path
import html
import json
import subprocess
import tempfile
import fitz
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'quiz-data.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
ROUNDS = [r for r in DATA['rounds'] if r['kind'] == 'main']
MM = 72 / 25.4
esc = html.escape


def pdf():
    doc = fitz.open()
    page = doc.new_page(width=210 * MM, height=297 * MM)
    with tempfile.TemporaryDirectory(prefix='quiz-print-') as tmp:
        tmp = Path(tmp)
        fontfile = tmp / 'Onest-500.ttf'
        instantiateVariableFont(TTFont(ROOT / 'assets/fonts/Onest-Variable.ttf'), {'wght': 500}).save(fontfile)
        font = fitz.Font(fontfile=str(fontfile))
        page.insert_font(fontname='Onest', fontfile=str(fontfile))
        for index, rd in enumerate(ROUNDS):
            x, y = 8 + (index % 2) * 99, 8 + (index // 2) * 95
            page.draw_rect(fitz.Rect(x * MM, y * MM, (x + 95) * MM, (y + 91) * MM), width=.45, color=(0, 0, 0), stroke_opacity=.18)
            page.insert_text(((x + 5) * MM, (y + 9) * MM), 'КУЛЬТУРНЫЙ КОД', fontsize=8, fontname='Onest', color=(.32, .32, .32))
            page.insert_text(((x + 5) * MM, (y + 19) * MM), str(index + 1), fontsize=16, fontname='Onest', color=(.12, .12, .12))
            size = 13
            while font.text_length(rd['title'], fontsize=size) > 74 * MM:
                size -= .1
            page.insert_text(((x + 15) * MM, (y + 19) * MM), rd['title'], fontsize=size, fontname='Onest', color=(.12, .12, .12))
            for number in range(1, 11):
                baseline = y + 28 + (number - 1) * 5.4
                page.insert_text(((x + 5) * MM, baseline * MM), str(number), fontsize=8, fontname='Onest', color=(.48, .48, .48))
                page.draw_line(((x + 13) * MM, (baseline + .7) * MM), ((x + 90) * MM, (baseline + .7) * MM), width=.35, color=(0, 0, 0), stroke_opacity=.16)
    doc.set_metadata({'title': 'Культурный код — шесть бланков на одном листе A4', 'author': 'Культурный код', 'subject': 'Одна команда, шесть основных блоков, 60 ответов'})
    doc.save(ROOT / 'design/answer-sheets.pdf', garbage=4, deflate=True)
    doc.close()


def web():
    cards = []
    for index, rd in enumerate(ROUNDS):
        cards.append(f'<section class="slip"><div class="brand">КУЛЬТУРНЫЙ КОД</div><h2><b>{index + 1}</b><span>{esc(rd["title"])}</span></h2><ol>' + ''.join(f'<li value="{n}"><span>{n}</span><i></i></li>' for n in range(1, 11)) + '</ol></section>')
    css = '''@font-face{font-family:Onest;src:url('../assets/fonts/Onest-Variable.ttf');font-weight:500}*{box-sizing:border-box}body{margin:0;background:#eee;color:#202020;font-family:Onest,sans-serif}.sheet{width:210mm;height:297mm;padding:8mm;margin:20px auto;background:#fff;display:grid;grid-template-columns:repeat(2,95mm);grid-template-rows:repeat(3,91mm);gap:4mm}.slip{border:.16mm solid #0003;padding:3mm 5mm;overflow:hidden}.brand{height:9mm;font-size:8pt;color:#555}h2{height:10mm;margin:0;display:flex;align-items:center;gap:5mm;font-size:13pt;font-weight:500;white-space:nowrap}h2 b{font-size:16pt;font-weight:500;width:5mm;flex:none}ol{list-style:none;margin:0;padding:0}li{height:5.4mm;display:flex;align-items:center;gap:3mm}li span{width:5mm;flex:none;font-size:8pt;color:#7a7a7a}li i{height:3.8mm;flex:1;border-bottom:.12mm solid #0003}.tools{text-align:center;margin:18px}.tools button,.tools a{font:500 14px Onest,sans-serif;color:#333;border:0;background:#fff;padding:12px 20px;border-radius:18px;text-decoration:none;cursor:pointer}@page{size:A4 portrait;margin:0}@media print{body{background:#fff}.tools{display:none}.sheet{margin:0;break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}}'''
    (ROOT / 'design/answer-sheets.html').write_text(f'<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Бланки · Культурный код</title><style>{css}</style><body><div class="tools"><button onclick="print()">Печатать</button> <a href="answer-sheets.pdf?v=20261026-simple">Скачать PDF</a></div><main class="sheet">'+''.join(cards)+'</main></body></html>')
    sections = []
    by_id = {q['id']: q for q in DATA['warmup'] + DATA['questions']}
    for rd in DATA['rounds']:
        sections.append('<h2>' + esc(rd['title']) + '</h2>')
        for i, qid in enumerate(rd['questionIds']):
            q = by_id[qid]
            sections.append(f'<article><h3>{i + 1} · {q["value"]}</h3><p>{esc(q["text"])}</p><p><strong>{esc(q["answer"])}</strong></p><p>{esc(q.get("acceptance", "Ответ по существу."))}</p></article>')
    (ROOT / 'design/host-answer-key.html').write_text('<!doctype html><html lang="ru"><meta charset="utf-8"><title>Ключ ведущего · Культурный код</title><style>body{font:16px/1.5 sans-serif;max-width:1050px;margin:40px auto}p{white-space:pre-line}article{break-inside:avoid;border-bottom:1px solid #ddd;padding:12px 0}@page{size:A4;margin:18mm}</style><body><h1>Ключ ведущего</h1>'+''.join(sections)+'</body></html>')


pdf()
web()
print('Built one A4: six rectangular slips, 60 answer rows; refreshed 75-answer host key.')
