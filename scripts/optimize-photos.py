#!/usr/bin/env python3
"""Shrink local runtime JPEGs without changing dimensions or color profiles."""
import hashlib
import io
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
runtime = set(json.loads((ROOT / 'preload-assets.js').read_text().split(' = ', 1)[1].rstrip(';\n')))
changes = {}
for rel in sorted(runtime):
    if Path(rel).suffix.lower() not in {'.jpg', '.jpeg'}:
        continue
    path = ROOT / rel
    before = path.read_bytes()
    image = Image.open(io.BytesIO(before))
    buffer = io.BytesIO()
    options = {'format': 'JPEG', 'quality': 78, 'optimize': True, 'progressive': True, 'subsampling': 2}
    if image.info.get('icc_profile'):
        options['icc_profile'] = image.info['icc_profile']
    image.save(buffer, **options)
    after = buffer.getvalue()
    if len(after) >= len(before) * .95:
        continue
    path.write_bytes(after)
    changes[rel] = {
        'beforeBytes': len(before), 'afterBytes': len(after),
        'beforeSha256': hashlib.sha256(before).hexdigest(),
        'afterSha256': hashlib.sha256(after).hexdigest(),
    }

def update(value, key=None):
    if isinstance(value, list):
        for entry in value:
            update(entry)
    elif isinstance(value, dict):
        path = next((value[k] for k in ('path', 'file', 'src', 'optimized') if isinstance(value.get(k), str) and value[k] in changes), None)
        if key in changes:
            path = key
        if path:
            info = changes[path]
            if 'sha256' in value:
                value['sha256'] = info['afterSha256']
            if 'optimizedSha256' in value:
                value['optimizedSha256'] = info['afterSha256']
            if 'bytes' in value:
                value['bytes'] = info['afterBytes']
            if key in changes and 'method' in value and 'recompressed 2026-10-31' not in value['method']:
                value['method'] += '; recompressed 2026-10-31 at JPEG quality 78, ICC profile preserved'
        for child_key, child in value.items():
            if isinstance(child, (dict, list)):
                update(child, child_key)

if changes:
    for path in (ROOT / 'source').glob('*.json'):
        data = json.loads(path.read_text())
        before = json.dumps(data, ensure_ascii=False, indent=2)
        update(data)
        after = json.dumps(data, ensure_ascii=False, indent=2)
        if after != before:
            path.write_text(after + '\n')
    (ROOT / 'source/photo-compression-20261031.json').write_text(json.dumps({
        'date': '2026-10-31', 'method': 'JPEG quality 78, optimized progressive, preserve dimensions and ICC profile; keep original if less than 5% smaller',
        'files': changes,
    }, ensure_ascii=False, indent=2) + '\n')
    manifest = {}
    for path in sorted((ROOT / 'assets').rglob('*')):
        if path.is_file():
            rel = str(path.relative_to(ROOT))
            blob = path.read_bytes()
            manifest[rel] = {'bytes': len(blob), 'sha256': hashlib.sha256(blob).hexdigest()}
    (ROOT / 'tests/asset-checksums.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'{len(changes)} photos optimized; {sum(x["beforeBytes"]-x["afterBytes"] for x in changes.values())} bytes saved')
