"""Check the exported original-template site and save review screenshots."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import base64
import hashlib
import json
import subprocess
import tempfile
import time
import urllib.request
import websocket

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / 'review'
REVIEW.mkdir(exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

class Browser:
    def __init__(self, url):
        self.ws = websocket.create_connection(url, timeout=30, suppress_origin=True)
        self.seq = 0

    def call(self, method, **params):
        self.seq += 1
        seq = self.seq
        self.ws.send(json.dumps({'id': seq, 'method': method, 'params': params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == seq:
                if 'error' in msg:
                    raise RuntimeError(msg['error'])
                return msg.get('result', {})

    def evaluate(self, expression):
        result = self.call('Runtime.evaluate', expression=expression, returnByValue=True, awaitPromise=True)
        if 'exceptionDetails' in result:
            raise RuntimeError(result['exceptionDetails'])
        return result.get('result', {}).get('value')

    def viewport(self, width, height):
        self.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=False)

    def navigate(self, url):
        self.call('Page.navigate', url=url)
        for _ in range(120):
            time.sleep(.1)
            if self.evaluate('document.readyState === "complete" && document.querySelector("h1") !== null'):
                break
        self.evaluate('''(async () => {
          document.querySelectorAll('img').forEach(img => img.loading = 'eager');
          await Promise.all([...document.images].map(img => img.decode().catch(() => null)));
          await document.fonts.ready;
        })()''')
        time.sleep(1.6)

    def screenshot(self, name, full=False):
        args = dict(format='png', captureBeyondViewport=full)
        if full:
            size = self.call('Page.getLayoutMetrics')['cssContentSize']
            args['clip'] = dict(x=0, y=0, width=size['width'], height=size['height'], scale=1)
        (REVIEW / name).write_bytes(base64.b64decode(self.call('Page.captureScreenshot', **args)['data']))

    def check(self):
        result = self.evaluate('''({
          title: document.title,
          heading: document.querySelector('h1')?.textContent,
          overflow: document.documentElement.scrollWidth > innerWidth,
          brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
          originalAuthorPresent: document.body.innerText.includes('Yingxue Xu'),
          paperCount: document.querySelectorAll('h3 a').length
        })''')
        assert not result['brokenImages'], result
        assert not result['originalAuthorPresent'], result
        assert not result['overflow'], result
        return result


if __name__ == '__main__':
    style_files = ['tailwind.config.mjs']
    for file in style_files:
        original = subprocess.check_output(['git', 'show', f'HEAD:{file}'], cwd=ROOT)
        assert original == (ROOT / file).read_bytes(), f'Original design changed: {file}'

    assert (ROOT / 'LICENSE').read_bytes() == subprocess.check_output(['git', 'show', 'HEAD:LICENSE'], cwd=ROOT)
    original_photo = Path('/Users/zhaohaoyu/Desktop/Code/2508051792856497_.pic.jpg')
    assert hashlib.sha256(original_photo.read_bytes()).digest() == hashlib.sha256((ROOT / 'public/images/haoyu-coast.jpg').read_bytes()).digest()

    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'out')))
    Thread(target=server.serve_forever, daemon=True).start()
    base_url = f'http://127.0.0.1:{server.server_port}'
    report = {'unchangedDesignFiles': style_files, 'licensePreserved': True, 'originalPhotoPreserved': True, 'pages': {}}

    with tempfile.TemporaryDirectory(prefix='haoyu-original-template-') as profile:
        process = subprocess.Popen([
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking', '--disable-component-update',
            '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
            f'--user-data-dir={profile}', 'about:blank',
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        browser = None
        try:
            port_file = Path(profile) / 'DevToolsActivePort'
            for _ in range(150):
                if port_file.exists(): break
                if process.poll() is not None: raise RuntimeError('Chrome did not start.')
                time.sleep(.1)
            port = port_file.read_text().splitlines()[0]
            tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list'))
            browser = Browser(next(t['webSocketDebuggerUrl'] for t in tabs if t['type'] == 'page'))
            browser.call('Page.enable')
            browser.call('Emulation.setEmulatedMedia', features=[{'name': 'prefers-color-scheme', 'value': 'light'}])
            browser.viewport(1440, 1100)
            browser.navigate(base_url + '/')
            report['pages']['home'] = browser.check()
            assert report['pages']['home']['paperCount'] == 6
            assert browser.evaluate("""document.querySelector('img[alt="Haoyu Zhao"]').getAttribute('src')""") == '/images/haoyu-coast.jpg'
            browser.screenshot('desktop.png')
            browser.screenshot('desktop-full.png', full=True)
            browser.evaluate('document.querySelector("button[aria-label=Email]").click()')
            time.sleep(.2)
            assert browser.evaluate('document.body.innerText.includes("haoyu-zhao (at) outlook.com")')
            browser.evaluate('document.querySelector("button[aria-label=Email]").click()')
            theme = """document.querySelector('button[title^="Current theme"]')"""
            # Use the original theme controls: System -> Light -> Dark -> System.
            browser.evaluate(f'{theme}.click()')
            time.sleep(.1)
            browser.evaluate(f'{theme}.click()')
            time.sleep(.2)
            assert browser.evaluate('document.documentElement.classList.contains("dark")')
            browser.evaluate(f'{theme}.click()')
            time.sleep(.2)
            assert browser.evaluate('document.documentElement.classList.contains("light")')
            report['themeAndEmailControls'] = 'passed'
            for width in (320, 390, 768):
                browser.viewport(width, 844)
                browser.evaluate('window.scrollTo({top:0,behavior:"instant"})')
                time.sleep(.25)
                report['pages'][f'home-{width}'] = browser.check()
                if width == 390:
                    browser.screenshot('mobile.png')
                    browser.screenshot('mobile-full.png', full=True)
                    browser.evaluate('document.querySelector("button[aria-expanded]").click()')
                    time.sleep(.25)
                    assert browser.evaluate('document.querySelector("button[aria-expanded]").getAttribute("aria-expanded") === "true"')
                    browser.evaluate('document.querySelector("button[aria-expanded]").click()')
            print('Homepage: six publications, new photograph, responsive layouts, email, theme and mobile menu passed.', flush=True)

            for route in ('publications', 'teaching'):
                browser.viewport(1440, 1100)
                browser.navigate(base_url + '/' + route + '/')
                report['pages'][route] = browser.check()
                browser.screenshot(f'{route}.png', full=True)
                if route == 'publications':
                    assert browser.evaluate('document.querySelectorAll("h3 a").length') == 6
                    browser.evaluate('''(() => {
                      const input = document.querySelector('input[type=text]');
                      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'See-Control');
                      input.dispatchEvent(new Event('input', {bubbles:true}));
                    })()''')
                    time.sleep(.3)
                    assert browser.evaluate('document.querySelectorAll("h3 a").length') == 1
                    browser.evaluate('''(() => {
                      const input = document.querySelector('input[type=text]');
                      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '');
                      input.dispatchEvent(new Event('input', {bubbles:true}));
                    })()''')
                    time.sleep(.2)
                    browser.evaluate('[...document.querySelectorAll("button")].find(b => b.innerText.trim() === "Filters").click()')
                    time.sleep(.3)
                    browser.evaluate('[...document.querySelectorAll("button")].find(b => b.innerText.trim() === "2025").click()')
                    time.sleep(.3)
                    assert browser.evaluate('document.querySelectorAll("h3 a").length') == 3
                    report['publicationSearchAndYearFilter'] = 'passed'
                if route == 'cv':
                    assert browser.evaluate('document.body.innerText.includes("Xiamen University") && document.body.innerText.includes("Honors & Awards")')
                if route == 'teaching':
                    assert browser.evaluate('document.body.innerText.includes("UCMP 6050") && document.body.innerText.includes("RedBird")')
                browser.viewport(390, 844)
                time.sleep(.2)
                report['pages'][f'{route}-mobile'] = browser.check()
                print(f'{route}: desktop/mobile and content checks passed.', flush=True)

            (REVIEW / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
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

    (REVIEW / 'index.html').write_text('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Haoyu Zhao — 原仓库版本预览</title><style>body{font:14px/1.6 system-ui;margin:0;color:#253247;background:#f4f5f7}header{padding:20px 30px;background:white;border-bottom:1px solid #ddd}nav{display:flex;flex-wrap:wrap;gap:20px}a{color:#926b30}main{max-width:1440px;margin:24px auto}img{display:block;width:100%;height:auto;background:white}h1{font-size:20px;margin:0 0 10px}p{color:#667;margin:0 0 14px}</style></head><body><header><h1>原仓库版本 · Haoyu Zhao</h1><p>直接使用 Innse/innse.github.io 源码，更换个人资料与照片。以下为实际构建页面的截图。</p><nav><a href="desktop-full.png">桌面完整截图</a><a href="mobile-full.png">手机完整截图</a><a href="publications.png">Publications</a><a href="teaching.png">Teaching</a></nav></header><main><img src="desktop-full.png" alt="使用原仓库代码构建的 Haoyu Zhao 主页"></main></body></html>''')
    print(f'Review screenshots saved to {REVIEW}', flush=True)
