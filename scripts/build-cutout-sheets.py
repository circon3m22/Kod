"""One A4 page with six vector slips and a matching HTML print layout."""
from pathlib import Path
import html
import json
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
        ink = (.11, .11, .11)
        muted = (.43, .43, .43)
        light = (.94, .94, .93)
        # One shared cut line between columns and one across each row boundary.
        # The six slips touch, so the whole sheet needs only three straight cuts.
        page.draw_line((105 * MM, 3 * MM), (105 * MM, 294 * MM), width=.65, color=(.48, .48, .48))
        for y_cut in (99, 198):
            page.draw_line((3 * MM, y_cut * MM), (207 * MM, y_cut * MM), width=.65, color=(.48, .48, .48))
        for index, rd in enumerate(ROUNDS):
            x, y = (index % 2) * 105, (index // 2) * 99
            page.draw_rect(fitz.Rect((x + 6) * MM, (y + 5) * MM, (x + 99) * MM, (y + 28) * MM),
                           fill=light, color=light, radius=4 / 23)
            page.insert_text(((x + 8) * MM, (y + 11) * MM), 'КУЛЬТУРНЫЙ КОД',
                             fontsize=7.5, fontname='Onest', color=muted)
            page.insert_text(((x + 8) * MM, (y + 23) * MM), str(index + 1),
                             fontsize=23, fontname='Onest', color=ink)
            size = 11.5
            while font.text_length(rd['title'], fontsize=size) > 75 * MM:
                size -= .1
            page.insert_text(((x + 22) * MM, (y + 23) * MM), rd['title'],
                             fontsize=size, fontname='Onest', color=ink)
            page.insert_text(((x + 8) * MM, (y + 37.5) * MM), 'Команда',
                             fontsize=8.5, fontname='Onest', color=ink)
            page.draw_line(((x + 27) * MM, (y + 38.5) * MM), ((x + 97) * MM, (y + 38.5) * MM),
                           width=.45, color=muted)
            for number in range(1, 11):
                baseline = y + 46 + (number - 1) * 4.8
                page.insert_text(((x + 8) * MM, baseline * MM), f'{number:02d}',
                                 fontsize=8, fontname='Onest', color=muted)
                page.draw_line(((x + 19) * MM, (baseline + 1) * MM),
                               ((x + 97) * MM, (baseline + 1) * MM),
                               width=.4, color=(.58, .58, .58))
    doc.set_metadata({'title': 'Культурный код — шесть бланков на одном листе A4', 'author': 'Культурный код', 'subject': 'Одна команда, шесть основных блоков, 60 ответов'})
    doc.save(ROOT / 'design/answer-sheets.pdf', garbage=4, deflate=True)
    doc.close()


def web():
    cards = []
    for index, rd in enumerate(ROUNDS):
        cards.append(f'<section class="slip"><div class="head"><div class="brand">КУЛЬТУРНЫЙ КОД</div><h2><b>{index + 1}</b><span>{esc(rd["title"])}</span></h2></div><div class="team"><span>Команда</span><i></i></div><ol>' + ''.join(f'<li value="{n}"><span>{n:02d}</span><i></i></li>' for n in range(1, 11)) + '</ol></section>')
    css = '''@font-face{font-family:Onest;src:url('../assets/fonts/Onest-Variable.ttf');font-weight:500}*{box-sizing:border-box}body{margin:0;background:#eee;color:#1c1c1c;font-family:Onest,sans-serif}.sheet{width:210mm;height:297mm;margin:20px auto;background:#fff;display:grid;grid-template-columns:repeat(2,105mm);grid-template-rows:repeat(3,99mm)}.slip{padding:5mm 7mm;overflow:hidden}.slip:nth-child(2n+1){border-right:.23mm solid #888}.slip:nth-child(-n+4){border-bottom:.23mm solid #888}.head{height:23mm;background:#f0f0ed;border-radius:4mm;padding:2mm}.brand{height:7mm;font-size:7.5pt;color:#666}h2{height:11mm;margin:0;display:flex;align-items:center;gap:4mm;font-size:11.5pt;font-weight:500;white-space:nowrap}h2 b{font-size:23pt;font-weight:500;width:10mm;flex:none}.team{height:13mm;display:flex;align-items:center;gap:4mm;padding:0 2mm;font-size:8.5pt}.team i{flex:1;border-bottom:.15mm solid #777;height:4mm}ol{list-style:none;margin:0;padding:0 2mm}li{height:4.8mm;display:flex;align-items:center;gap:3mm}li span{width:8mm;flex:none;font-size:8pt;color:#666}li i{height:3.8mm;flex:1;border-bottom:.14mm solid #999}.tools{text-align:center;margin:18px}.tools button,.tools a{font:500 14px Onest,sans-serif;color:#333;border:0;background:#fff;padding:12px 20px;text-decoration:none;cursor:pointer}@page{size:A4 portrait;margin:0}@media print{body{background:#fff}.tools{display:none}.sheet{margin:0;break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}}'''
    (ROOT / 'design/answer-sheets.html').write_text(f'<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Бланки · Культурный код</title><style>{css}</style><body><div class="tools"><button onclick="print()">Печатать</button> <a href="answer-sheets.pdf?v=20261101-rounded">Скачать PDF</a></div><main class="sheet">'+''.join(cards)+'</main></body></html>')
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
