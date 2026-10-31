#!/usr/bin/env python3
"""Generate the offline image list used by the initial loading screen."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'quiz-data.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
paths = set()

def collect(value):
    if isinstance(value, str) and value.startswith('assets/'):
        paths.add(value)
    elif isinstance(value, list):
        for entry in value:
            collect(entry)
    elif isinstance(value, dict):
        for entry in value.values():
            collect(entry)

collect(data)
for filename in ('index.html', 'app.js', 'quiz-flow.js', 'cover-art.js', 'cover-film.js', 'styles.css', 'flow.css'):
    for path in re.findall(r'assets/[\w./-]+', (ROOT / filename).read_text()):
        if (ROOT / path).is_file():
            paths.add(path)
paths.update(str(path.relative_to(ROOT)) for path in (ROOT / 'assets/stage-objects').glob('*') if path.is_file())
paths.update(str(path.relative_to(ROOT)) for path in (ROOT / 'assets/rules').glob('*.webp'))
images = sorted(path for path in paths if Path(path).suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp', '.svg'})
missing = [path for path in images if not (ROOT / path).is_file()]
if missing:
    raise SystemExit('Missing preload images: ' + ', '.join(missing))
(ROOT / 'preload-assets.js').write_text('window.KOD_PRELOAD_ASSETS = ' + json.dumps(images, ensure_ascii=False, indent=2) + ';\n')
print(f'{len(images)} local images in preload-assets.js')
