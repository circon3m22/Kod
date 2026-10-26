#!/usr/bin/env python3
"""Create a self-contained, buildless ZIP of the production quiz."""
from pathlib import Path
import argparse
import json
import re
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = ['index.html', 'app.js', 'quiz-flow.js', 'quiz-data.js', 'cover-art.js',
              'cover-film.js', 'styles.css', 'flow.css', 'credits.html',
              'design/answer-sheets.html', 'design/answer-sheets.pdf',
              'design/host-answer-key.html', 'source/russia-silhouette-geodata.geojson']
GUIDE = '''КУЛЬТУРНЫЙ КОД — АВТОНОМНЫЙ КВИЗ

1. Распакуйте архив целиком на флешку или в папку на устройстве.
2. Откройте папку KULTURNYY-KOD и дважды нажмите index.html.
3. Используйте современный браузер, например Chrome, Edge или Firefox.
   Интернет для игры не нужен. Ссылки на внешние источники в разделе
   «Источники фото» требуют интернет.
4. Бланки для печати: design/answer-sheets.pdf (шесть бланков на A4).

Сохраняйте всю папку: изображения, шрифты и скрипты нужны сайту.
Браузеры и файловые менеджеры некоторых телефонов и планшетов ограничивают
запуск локальных HTML-файлов или сохранение данных. Если страница не открывается,
перенесите папку на компьютер или откройте опубликованный сайт в браузере.
Сохранение игры зависит от настроек браузера и устройства; для переноса игры
используйте экспорт и импорт файла сохранения в меню ведущего.
'''


def asset_paths():
    # Game content stores all question, answer and event images as literal paths.
    data = json.loads((ROOT / 'quiz-data.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
    paths = set()
    def walk(value):
        if isinstance(value, str) and value.startswith('assets/'):
            paths.add(value)
        elif isinstance(value, list):
            for item in value: walk(item)
        elif isinstance(value, dict):
            for item in value.values(): walk(item)
    walk(data)
    # Collect literal paths from the UI, CSS, film, poster, and credits.
    for filename in ROOT_FILES:
        if not filename.endswith(('.html', '.js', '.css')):
            continue
        text = (ROOT / filename).read_text()
        for path in re.findall(r'assets/[\w./-]+', text):
            if (ROOT / path).is_file(): paths.add(path)
    # These paths are assembled dynamically in the UI.
    for directory in ('assets/rules', 'assets/stage-objects'):
        paths.update(str(p.relative_to(ROOT)) for p in (ROOT / directory).glob('*') if p.is_file())
    missing = sorted(path for path in paths if not (ROOT / path).is_file())
    if missing: raise SystemExit('Missing runtime assets: ' + ', '.join(missing))
    return paths


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    files = sorted(set(ROOT_FILES) | asset_paths())
    with ZipFile(args.output, 'w', ZIP_DEFLATED, compresslevel=6) as z:
        for name in files:
            z.write(ROOT / name, 'KULTURNYY-KOD/' + name)
        z.writestr('KULTURNYY-KOD/ПРОЧТИ-МЕНЯ.txt', GUIDE)
    with ZipFile(args.output) as z:
        bad = z.testzip()
        if bad: raise SystemExit('Damaged file in archive: ' + bad)
    print(f'{args.output}: {len(files) + 1} files, {args.output.stat().st_size} bytes')


if __name__ == '__main__':
    main()
