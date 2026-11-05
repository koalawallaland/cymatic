#!/usr/bin/env python3
"""Turn Astro's dist/ into the static tree served from `main` on GitHub Pages.

usage: scripts/publish-main.py <dist> <main-checkout>

The site lives under /cymatic/ with no build step, so links become relative,
_astro/ becomes kwl-assets/ (Pages' Jekyll skips underscore folders), the feed
is left out, and every page gets noindex. While the site is closed,
scripts/coming-soon.html is index.html and the real home page is home.html.
"""
import os, re, shutil, sys

CLOSED = True  # Katie decides when this flips.
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))

for name in os.listdir(dst):
    if name in ('.git', '.nojekyll', 'README.md'):
        continue
    p = os.path.join(dst, name)
    shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)

def page_path(rel):
    return 'home.html' if CLOSED and rel == 'index.html' else rel

def transform(html, rel):
    depth = page_path(rel).count('/')
    up = '../' * depth
    def fix(m):
        attr, p = m.group(1), m.group(2)
        q = p[1:]
        if q == '' or q == '#':
            q = ('home.html' if CLOSED else 'index.html') + q
        elif q.startswith('#'):
            q = ('home.html' if CLOSED else 'index.html') + q
        elif q.startswith('_astro/'):
            q = 'kwl-assets/' + q[7:]
        elif q.endswith('/'):
            q += 'index.html'
        elif '/#' in q:
            q = q.replace('/#', '/index.html#')
        return f'{attr}="{up}{q}"'
    html = re.sub(r'<link rel="alternate" type="application/rss\+xml"[^>]*>', '', html)
    html = re.sub(r'\s*<a class="rss" href="/rss.xml">rss</a>', '', html)
    html = re.sub(r'\b(href|src|poster)="(/(?!/)[^"]*)"', fix, html)
    if 'name="robots"' not in html:
        html = re.sub(r'(<meta charset=[^>]*>)', r'\1<meta name="robots" content="noindex">', html, count=1, flags=re.I)
    return html

for root, _, files in os.walk(src):
    for f in files:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, src)
        if rel == 'rss.xml':
            continue
        out = page_path(rel)
        if rel.startswith('_astro' + os.sep):
            out = 'kwl-assets' + rel[6:]
        target = os.path.join(dst, out)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        if f.endswith('.html'):
            with open(full, encoding='utf-8') as fh:
                html = transform(fh.read(), rel)
            with open(target, 'w', encoding='utf-8') as fh:
                fh.write(html)
        else:
            shutil.copy2(full, target)

if CLOSED:
    shutil.copy2(os.path.join(here, 'coming-soon.html'), os.path.join(dst, 'index.html'))
