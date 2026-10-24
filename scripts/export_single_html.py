"""Package rendered upstream-template pages into a directly openable HTML file."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from bs4 import BeautifulSoup, Comment
import base64
import json
import mimetypes
import re
import subprocess
import tempfile
import time
import urllib.request

from review_preview import Browser, QuietHandler, ROOT, REVIEW
from check_requested_updates import check_home
from check_publication_details import check_publication_details

DEST = ROOT / 'Haoyu-Zhao.html'
OUT = ROOT / 'out'
favicon_href = BeautifulSoup((OUT / 'index.html').read_text(), 'html.parser').select_one('link[rel="icon"]')['href']

def data_uri(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()

css = '\n'.join(p.read_text() for p in sorted((OUT / '_next/static/css').glob('*.css')))
# Embed local font assets as well as the upstream heading font.
for font in (OUT / 'fonts').iterdir():
    if font.suffix in {'.woff2', '.woff', '.ttf'}:
        css = css.replace('/fonts/' + font.name, data_uri(font))
font_url = 'https://jialeliu.com/fonts/georgiab.woff2'
font_path = ROOT / 'review/georgiab.woff2'
if not font_path.exists():
    request = urllib.request.Request(font_url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://innse.github.io/'})
    font_path.write_bytes(urllib.request.urlopen(request, timeout=25).read())
css = css.replace(font_url, data_uri(font_path))

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(OUT)))
Thread(target=server.serve_forever, daemon=True).start()
base_url = f'http://127.0.0.1:{server.server_port}'
pages = {}
titles = {}
checks = {}

def package_page(html, route):
    soup = BeautifulSoup(html, 'html.parser')
    titles[route] = soup.title.get_text()
    for tag in soup.select('script, link, style, next-route-announcer'):
        tag.decompose()
    for comment in soup.find_all(string=lambda x: isinstance(x, Comment)):
        comment.extract()
    for image in soup.select('img[src]'):
        image.attrs.pop('srcset', None)
        src = image['src']
        if src.startswith('/'):
            image['src'] = data_uri(OUT / src.lstrip('/'))
    for link in soup.select('a[href]'):
        href = link['href']
        if href.startswith('/'):
            link['href'] = href[1:] if href.startswith('/#') else '#/' + href.strip('/')
            link.attrs.pop('target', None)
    # The original content, class names, and rendered layout are preserved.
    for tag in soup.select('[style]'):
        style = tag['style']
        style = re.sub(r'visibility:\s*hidden', 'visibility:visible', style)
        style = re.sub(r'opacity:\s*0(?:;|$)', 'opacity:1;', style)
        tag['style'] = style
    for button in soup.select('button[title^="Current theme"]'):
        button['data-action'] = 'theme'
    for button in soup.select('nav button[aria-expanded]'):
        button['data-action'] = 'menu'
    for popup in soup.select('[data-contact-popup]'):
        popup['hidden'] = ''
        popup['style'] = 'opacity:1;transform:none'
    for button in soup.select('[data-contact-trigger]'):
        button['aria-expanded'] = 'false'
    for panel in soup.select('[data-publication-panel]'):
        panel['hidden'] = ''
    for button in soup.select('[data-action="publication-detail"]'):
        button['aria-expanded'] = 'false'
    for button in soup.select('[data-action="copy-bibtex"]'):
        button['data-copy-state'] = 'idle'
        button.attrs.pop('disabled', None)
        button.select_one('[data-copy-label]').string = 'Copy'
    for notice in soup.select('[data-copy-error]'):
        notice['hidden'] = ''
    for counter in soup.select('[data-pageview-count]'):
        counter.string = 'Total Pageviews: …'

    if route == 'publications':
        query = soup.select_one('input[type="text"]')
        query['data-search'] = 'publications'
        filter_button = next(b for b in soup.select('button') if b.get_text(strip=True) == 'Filters')
        filter_button['data-action'] = 'filters'
        panel = next(d for d in soup.select('div') if 'p-4' in d.get('class', []) and d.find('label'))
        panel['data-filter-panel'] = ''
        panel['style'] = 'display:none'
        for group in panel.find_all('div', recursive=False):
            label = group.find('label')
            if not label:
                continue
            field = 'year' if 'Year' in label.get_text() else 'type'
            for button in group.select('button'):
                button['data-filter'] = field
                button['data-value'] = button.get_text(strip=True).lower()
        # Publication cards carry their actual year/type from the parsed BibTeX.
        # Preserve those attributes for filtering in the standalone HTML.
        for heading in soup.select('main h2'):
            if heading.get_text(strip=True) in ['Conference Papers', 'Journal Papers', 'Preprints']:
                heading.parent['data-paper-group'] = ''
    return ''.join(str(c) for c in soup.body.contents)

with tempfile.TemporaryDirectory(prefix='haoyu-html-export-') as profile:
    process = subprocess.Popen([
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new',
        '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--disable-background-networking', '--remote-debugging-port=0',
        '--remote-debugging-address=127.0.0.1', f'--user-data-dir={profile}', 'about:blank',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    browser = None
    try:
        port_file = Path(profile) / 'DevToolsActivePort'
        for _ in range(150):
            if port_file.exists(): break
            time.sleep(.1)
        port = port_file.read_text().splitlines()[0]
        tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list'))
        browser = Browser(next(t['webSocketDebuggerUrl'] for t in tabs if t['type'] == 'page'))
        browser.call('Page.enable')
        browser.call('Emulation.setEmulatedMedia', features=[{'name':'prefers-color-scheme','value':'light'}])
        browser.viewport(1440, 1100)
        for route in ('', 'publications', 'teaching'):
            browser.navigate(base_url + '/' + (route + '/' if route else ''))
            if route == '':
                checks['source'] = check_home(browser, 'source')
                assert 'Total Pageviews' in checks['source']['liveVisitorWidget'], 'Visitor widget did not load on source'
                check_publication_details(browser, 'source')
            if route == 'publications':
                for _ in range(60):
                    if browser.evaluate('!![...document.querySelectorAll("button")].find(b=>b.innerText.trim()==="Filters")'):
                        break
                    time.sleep(.1)
                else:
                    browser.screenshot('export-publications-error.png')
                    raise RuntimeError(browser.evaluate('({url:location.href,title:document.title,text:document.body.innerText.slice(0,1200)})'))
                browser.evaluate('[...document.querySelectorAll("button")].find(b=>b.innerText.trim()==="Filters").click()')
                time.sleep(.4)
                check_publication_details(browser, 'source-full-publications')
            pages[route] = package_page(browser.evaluate('document.documentElement.outerHTML'), route)

        script = (ROOT / 'scripts/portable_runtime.js').read_text()
        document = '<!doctype html><html lang="en" class="light" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Haoyu Zhao</title><link rel="icon" href="' + data_uri(OUT / favicon_href.lstrip('/')) + '"><style>' + css + '\n[hidden]{display:none!important}</style></head><body class="font-sans"><div id="portable-app"></div>'
        payload = json.dumps({'pages': pages, 'titles': titles}, ensure_ascii=False).replace('</', '<\\/')
        document += '<script type="application/json" id="portable-pages">' + payload + '</script><script>' + script + '</script><!--\n' + (ROOT/'LICENSE').read_text() + '\n' + '\n'.join(p.read_text() for p in sorted((ROOT/'public/fonts').glob('*.txt'))) + '\n' + (ROOT/'public/icons/SOURCES.txt').read_text() + '\n--></body></html>'
        DEST.write_text(document, encoding='utf-8')
        browser.navigate(DEST.as_uri())
        checks['html'] = check_home(browser, 'html')
        assert 'Total Pageviews' in checks['html']['liveVisitorWidget'], 'Visitor widget did not load in standalone HTML'
        check_publication_details(browser, 'html')
        (REVIEW/'requested-updates-checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2))
        assert browser.evaluate('document.querySelector("h1").innerText') == 'Haoyu Zhao'
        assert browser.evaluate('[...document.images].every(i=>i.complete && i.naturalWidth>0)')
        assert browser.evaluate('document.querySelectorAll("h3 a").length') == 7
        browser.screenshot('standalone-html.png')
        browser.evaluate('location.hash="#/publications"')
        time.sleep(.3)
        assert browser.evaluate('document.querySelectorAll("[data-publication]").length') == 7
        check_publication_details(browser, 'html-full-publications')
        assert browser.evaluate('document.querySelector("[data-publication]").dataset.publicationId') == 'memento3'
        assert browser.evaluate('document.querySelector("[data-publication]").dataset.year') == '2026'
        browser.evaluate("""document.querySelector('[data-filter="year"][data-value="2026"]').click()""")
        assert browser.evaluate('document.querySelectorAll("[data-publication]:not([hidden])").length') == 1
        assert browser.evaluate('document.querySelector("[data-publication]:not([hidden])").dataset.publicationId') == 'memento3'
        browser.evaluate('document.querySelector("[data-filter=year][data-value=all]").click()')
        browser.evaluate('const input=document.querySelector("[data-search]"); input.value="See-Control"; input.dispatchEvent(new Event("input",{bubbles:true}))')
        assert browser.evaluate('document.querySelectorAll("[data-publication]:not([hidden])").length') == 1
        browser.evaluate('document.querySelector("[data-nav-target=news]").click()')
        time.sleep(1)
        assert browser.evaluate('location.hash') == '#news'
        assert browser.evaluate('Math.abs(document.querySelector("#news").getBoundingClientRect().top - 112) < 3')
        browser.evaluate('location.hash="#/teaching"')
        time.sleep(.2)
        assert browser.evaluate('document.body.innerText.includes("UCMP 6050")')
        browser.navigate(DEST.as_uri() + '#news')
        assert browser.evaluate('Math.abs(document.querySelector("#news").getBoundingClientRect().top - 112) < 3')
        print(f'HTML ready: {DEST}\nSize: {DEST.stat().st_size/1024/1024:.1f} MB. Desktop layout, name placement, Roboto font, News links, popovers, navigation scroll, paper order and live pageviews verified.', flush=True)
    finally:
        if browser:
            try: browser.call('Browser.close')
            except Exception: pass
            browser.ws.close()
        try: process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            process.terminate()
            process.wait(timeout=5)
        server.shutdown()
        server.server_close()
