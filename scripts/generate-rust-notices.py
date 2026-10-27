#!/usr/bin/env python3
"""Create a conservative notice bundle from cargo metadata JSON for Windows.

Run cargo metadata with --locked --filter-platform x86_64-pc-windows-msvc,
then pass the output path as the first argument. This collects available root
license/notice files, not a substitute for release licensing review.
"""
import hashlib
import json
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parents[1]
metadata = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
packages = sorted((p for p in metadata['packages'] if p['source']), key=lambda p: (p['name'], p['version']))
supplemental = {
    'alloc-stdlib': root / 'licenses/RUST-ALLOC-STDLIB-BSD.txt',
    'webview2-com': root / 'licenses/RUST-WEBVIEW2-COM-MIT.txt',
    'webview2-com-macros': root / 'licenses/RUST-WEBVIEW2-COM-MIT.txt',
    'webview2-com-sys': root / 'licenses/RUST-WEBVIEW2-COM-MIT.txt',
}
# selectors has MPL headers but its published crate omits a copy of the MPL;
# use the complete MPL 2.0 text from the exact cssparser crate in this graph.
cssparser = next(p for p in packages if p['name'] == 'cssparser')
supplemental['selectors'] = pathlib.Path(cssparser['manifest_path']).parent / 'LICENSE'
blocks = {}
missing = []
inventory = []
for p in packages:
    package = f"{p['name']} {p['version']}"
    base = pathlib.Path(p['manifest_path']).parent
    candidates = sorted(f for f in base.iterdir() if f.is_file() and f.name.upper().startswith(('LICENSE', 'LICENCE', 'COPYING', 'COPYRIGHT', 'NOTICE')))
    if p.get('license_file'):
        f = (base / p['license_file']).resolve()
        if f.is_file() and f.is_relative_to(base.resolve()) and f not in candidates:
            candidates.append(f)
    if not candidates and p['name'] in supplemental:
        candidates.append(supplemental[p['name']])
    if not candidates:
        missing.append(package)
    hashes = []
    for f in candidates:
        try:
            content = f.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            missing.append(f'{package}: unreadable {f.name}')
            continue
        digest = hashlib.sha256(content.encode('utf-8')).hexdigest()
        hashes.append(digest)
        if digest not in blocks:
            blocks[digest] = {'text': content, 'used_by': []}
        blocks[digest]['used_by'].append(f'{package} ({f.name})')
    inventory.append(f"{package} | {p.get('license') or 'license expression unavailable'} | {p.get('repository') or 'repository unavailable'} | " + ', '.join(hashes))
if missing:
    raise SystemExit('Missing or unreadable notices: ' + ', '.join(missing))
header = '''Rust dependency notice inventory for the Windows-target Cargo graph

Generated from cargo metadata --locked --filter-platform x86_64-pc-windows-msvc.
Includes build dependencies as well as possible runtime dependencies. Each listed
text is reproduced from the crate distribution unless identified below. Identical
texts are deduplicated by SHA-256. This is an aid to review, not legal advice or
proof that every binary component's separate terms have been captured.

Supplemental source records:
- alloc-stdlib 0.3.0: https://github.com/dropbox/rust-alloc-no-stdlib/blob/0a81fd6928ea3b33c8cd484aa4575d50ffb98012/LICENSE
- webview2-com 0.39.1 and webview2-com-sys 0.39.1: https://github.com/wravery/webview2-rs/blob/edc2caf886175ccaebe86078c9cfe1ae2a187328/LICENSE
- webview2-com-macros 0.8.1: https://github.com/wravery/webview2-rs/blob/dffa41a8a46d3f5565eefbff2de57d38d399f158/LICENSE (identical text)
- selectors 0.38.0: crate sources carry MPL 2.0 headers; the full MPL 2.0 text
  here is taken from the cssparser crate. Source at
  https://github.com/servo/stylo/tree/572ecba2d1600e7c3d490586692a209faf703baa/selectors

Separate Microsoft WebView2 SDK loader and runtime terms still require release
review; a Rust crate's declared license does not establish those terms.

PACKAGE INVENTORY (package | declared expression | upstream | text SHA-256)
'''
out = [header, '\n'.join(inventory), '\n\nLICENSE AND NOTICE TEXTS\n']
for digest, block in sorted(blocks.items()):
    out.append('\n' + '=' * 72 + '\nSHA-256: ' + digest + '\nPackages: ' + ', '.join(block['used_by']) + '\n\n' + block['text'].rstrip() + '\n')
path = root / 'licenses/RUST-DEPENDENCIES.txt'
path.write_text(''.join(out), encoding='utf-8')
print(f'Wrote {path}: {len(packages)} packages, {len(blocks)} unique notice texts.')
