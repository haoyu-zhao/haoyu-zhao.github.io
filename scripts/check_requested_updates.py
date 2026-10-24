"""Browser checks for the requested content, contact popovers, and scroll behavior."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import json
import subprocess
import tempfile
import time
import urllib.request
from review_preview import Browser, QuietHandler, ROOT, REVIEW

EXPECTED_NEWS = [
    'https://arxiv.org/abs/2610.11794',
    'https://huggingface.co/papers/2610.11794', 'https://www.qbitai.com/2026/10/502654.html',
    'https://arxiv.org/abs/2610.11794',
    'https://arxiv.org/abs/2512.08629', 'https://www.mittrchina.com/news/detail/15961', 'https://arxiv.org/abs/2512.08629',
    'https://gaussian-property.github.io/', 'https://haoyu-zhao.github.io/LLM-Optic.github.io/',
    'https://g3956.github.io', 'https://g3956.github.io',
]

def check_home(browser, label):
    result = browser.evaluate('''(() => {
      const about = [...document.querySelectorAll('h2')].find(h=>h.textContent==='About').parentElement;
      const news = [...document.querySelectorAll('h2')].find(h=>h.textContent==='News').parentElement;
      const p = about.querySelector('p');
      return {
        heading: document.querySelector('[data-profile-heading]').innerText,
        chineseCount: document.body.innerText.split('赵皓宇').length-1,
        about: about.innerText,
        profile: document.querySelector('[data-profile]').innerText,
        bodyFont: {family:getComputedStyle(p).fontFamily, weight:getComputedStyle(p).fontWeight, size:getComputedStyle(p).fontSize, lineHeight:getComputedStyle(p).lineHeight},
        newsLinks: [...news.querySelectorAll('a')].map(a=>a.getAttribute('href')),
        papers: [...document.querySelectorAll('[data-selected-publications] h3')].map(h=>h.textContent),
        mediaLinks: [...document.querySelectorAll('[data-selected-publications] a')].filter(a=>a.textContent.startsWith('Media Coverage')).map(a=>({label:a.textContent.trim(),href:a.getAttribute('href')})),
        grouped: /Conference Papers|Journal Papers|Preprints/.test(document.body.innerText),
        labels: [...document.querySelectorAll('[data-contacts] > a, [data-contact-trigger]')].map(el=>el.getAttribute('aria-label')),
        visibleLabels: [...document.querySelectorAll('[data-contacts] > a, [data-contact-trigger]')].map(el=>el.innerText),
        socialLinks: [...document.querySelectorAll('[data-contacts] > a')].map(el=>({name:el.getAttribute('aria-label'),href:el.getAttribute('href'),target:el.target})),
        usefulLinks: [...about.querySelector('p:last-child').querySelectorAll('a')].map(el=>el.textContent),
        iconRowTops: [...document.querySelectorAll('[data-contacts] > a, [data-contact-trigger]')].map(el=>el.getBoundingClientRect().top),
        overflow: document.documentElement.scrollWidth > innerWidth,
        imagesLoaded: [...document.images].every(i=>i.complete && i.naturalWidth>0),
        fontsLoaded: document.fonts.check('400 16px Roboto') && document.fonts.check('400 20px Academicons'),
        widget: document.querySelector('iframe').srcdoc,
        navLabels: [...document.querySelectorAll('[data-nav-items] a')].map(a=>a.textContent),
        navText: document.querySelector('nav').innerText,
        scholarLink: document.querySelector('[data-scholar-link]')?.getAttribute('href'),
        footer: document.querySelector('[data-contact-footer]')?.innerText,
        contactEmail: document.querySelector('[data-contact-footer] a[href^="mailto:"]')?.getAttribute('href'),
        favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
        readability: (() => {
          const newsText=news.querySelector('.text-base');
          const author=document.querySelector('[data-selected-publications] h3').nextElementSibling;
          const style=element=>{const s=getComputedStyle(element);return {size:parseFloat(s.fontSize),weight:Number(s.fontWeight),color:s.color,smoothing:s.webkitFontSmoothing};};
          return {body:style(p),news:style(newsText),authors:style(author),link:style(document.querySelector('[data-scholar-link]'))};
        })(),
        publicationActions: (() => {
          const group=document.querySelector('[data-publication-actions]');
          const links=[...group.querySelectorAll('a')];
          const rect=group.getBoundingClientRect();
          return {labels:links.map(a=>a.textContent.trim()),tops:links.map(a=>a.getBoundingClientRect().top),rightGap:Math.abs(rect.right-group.parentElement.getBoundingClientRect().right)};
        })(),
        footerLines: [...document.querySelectorAll('[data-contact-copy] p')].map(el=>({height:el.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el).lineHeight)}))
      };
    })()''')
    assert [line for line in result['heading'].splitlines() if line.strip()][:3] == ['Haoyu Zhao', '赵皓宇', 'Ph.D. Student'], result['heading']
    assert result['chineseCount'] == 1
    assert '赵皓宇' not in result['about']
    assert 'Research Topics:' not in result['about'] and 'I am always open' not in result['about']
    assert 'My research focuses on LLM-based agents, with an emphasis on designing agent harnesses that enable Continual Learning and Recursive Self-Improvement.' in result['about']
    assert 'Research' not in result['profile']
    assert result['bodyFont'] == {'family':'Roboto, sans-serif', 'weight':'400', 'size':'16px', 'lineHeight':'24px'}, result['bodyFont']
    assert result['newsLinks'] == EXPECTED_NEWS, result['newsLinks']
    assert len(result['papers']) == 7 and not result['grouped']
    for actual, expected in zip(result['papers'], ['Memento 3:', 'See-Control:', 'AccidentBench:', 'GaussianProperty:', 'LLM-Optic:', 'Ref-NeuS:', 'Multi-objective Optimization']):
        assert actual.startswith(expected), actual
    assert result['mediaLinks'] == [
        {'label':'Media Coverage · 量子位','href':'https://www.qbitai.com/2026/10/502654.html'},
        {'label':'Media Coverage · MIT Technology Review / DeepTech','href':'https://www.mittrchina.com/news/detail/15961'},
    ], result['mediaLinks']
    assert result['labels'] == ['Email', 'Location', 'Google Scholar', 'GitHub', 'LinkedIn', 'X (Twitter)', '小红书', 'Hugging Face'], result['labels']
    assert result['visibleLabels'] == [''] * 8, result['visibleLabels']
    assert result['usefulLinks'] == ['UCL Profile', 'Google Scholar', 'GitHub', 'LinkedIn', 'X (Twitter)', '小红书', 'Hugging Face'], result['usefulLinks']
    expected_social = {
        'LinkedIn': 'https://www.linkedin.com/in/haoyu-zhao-73101931b/?isSelfProfile=true',
        'X (Twitter)': 'https://x.com/hyzhao23805?s=11',
        '小红书': 'https://xhslink.cn/o/9qrU5oK9Fzc',
        'Hugging Face': 'https://huggingface.co/HaoyuZhao',
    }
    for link in result['socialLinks']:
        assert link['target'] == '_blank', link
        if link['name'] in expected_social:
            assert link['href'] == expected_social[link['name']], link
    assert max(result['iconRowTops']) - min(result['iconRowTops']) < 1, result['iconRowTops']
    assert not result['overflow'] and result['imagesLoaded'] and result['fontsLoaded']
    assert 'w=240&t=tt&d=oIrgYL1mQM5UBH-rrDPlw0wOupQgSkABmcPfSd01whs' in result['widget']
    assert result['navLabels'] == ['About', 'News', 'Selected Publications'], result['navLabels']
    assert 'Haoyu Zhao' not in result['navText'], result['navText']
    assert result['scholarLink'] == 'https://scholar.google.com/citations?hl=en&user=4zjV4oUAAAAJ'
    assert 'Let’s connect!' in result['footer'] and 'Good research starts' in result['footer'] and '© Haoyu Zhao' in result['footer'] and 'Back to top' in result['footer'], result['footer']
    assert result['contactEmail'] == 'mailto:haoyu-zhao@outlook.com'
    if result['favicon'].startswith('data:'):
        import base64
        assert base64.b64decode(result['favicon'].split(',',1)[1]) == (ROOT/'public/ucl-favicon.ico').read_bytes()
    else:
        assert result['favicon'].endswith('/ucl-favicon.ico'), result['favicon']
    assert result['readability']['body']['smoothing'] == 'auto', result['readability']
    for key in ['body','news','authors']:
        assert result['readability'][key]['weight'] >= 400, result['readability']
    assert result['readability']['news']['size'] >= 16 and result['readability']['authors']['size'] >= 15
    actions=result['publicationActions']
    assert len(actions['labels'])==2 and 'Google Scholar' in actions['labels'][0] and 'View All' in actions['labels'][1], actions
    assert actions['rightGap'] < 1 and max(actions['tops'])-min(actions['tops']) < 1, actions
    assert len(result['footerLines']) == 2 and all(line['height'] <= line['lineHeight']+1 for line in result['footerLines']), result['footerLines']
    result.pop('favicon'); result.pop('widget'); result.pop('about'); result.pop('profile')
    for kind in ['email', 'location']:
        browser.evaluate(f'document.querySelector("[data-contact-trigger={kind}]").click()')
        time.sleep(.3)
        popup = browser.evaluate(f'''(() => {{const p=document.querySelector('[data-contact-popup={kind}]'); return {{visible:!p.hidden, href:p.querySelector('a').getAttribute('href'), text:p.innerText}};}})()''')
        assert popup['visible'], popup
        assert 'Click' not in popup['text'] and '(at)' not in popup['text'], popup
        if kind == 'email':
            assert 'haoyu-zhao@outlook.com' in popup['text'] and 'Send Email' not in popup['text'], popup
        assert popup['href'].startswith('mailto:haoyu-zhao@outlook.com' if kind=='email' else 'https://www.google.com/maps/'), popup
        browser.evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))')
        time.sleep(.25)
        assert browser.evaluate(f'document.querySelector("[data-contact-popup={kind}]").hidden')
    compact = browser.evaluate('''(() => {
      const institution=document.querySelector('[data-profile-heading] p:last-child');
      const contacts=document.querySelector('[data-contacts]');
      const heading=document.querySelector('#connect-heading');
      const sectionHeading=document.querySelector('#about h2');
      return {gap:contacts.getBoundingClientRect().top-institution.getBoundingClientRect().bottom,
        footerFont:getComputedStyle(heading).fontFamily, footerWeight:getComputedStyle(heading).fontWeight,
        sectionFont:getComputedStyle(sectionHeading).fontFamily, sectionWeight:getComputedStyle(sectionHeading).fontWeight,
        labelTransform:getComputedStyle(heading).textTransform, labelSpacing:getComputedStyle(heading).letterSpacing};
    })()''')
    assert 0 <= compact['gap'] <= 12, compact
    assert compact['footerFont'] == compact['sectionFont'] and compact['footerWeight'] == compact['sectionWeight'], compact
    assert compact['labelTransform'] == 'none' and compact['labelSpacing'] == 'normal', compact
    result['contactLayout'] = compact
    browser.screenshot(f'{label}-desktop.png')
    browser.evaluate('window.scrollTo({top:850,behavior:"instant"})')
    time.sleep(.6)
    scroll = browser.evaluate('''(() => {const s=getComputedStyle(document.querySelector('[data-nav-surface]'));return {y:scrollY,blur:s.backdropFilter,shadow:s.boxShadow,background:s.backgroundColor};})()''')
    assert scroll['y'] > 20 and scroll['blur'] != 'none' and scroll['shadow'] != 'none', scroll
    assert browser.evaluate("document.querySelector('[data-profile]').getBoundingClientRect().top >= document.querySelector('nav').getBoundingClientRect().bottom"), 'Sticky sidebar overlaps the navigation'
    result['scrolledNavigation'] = scroll
    browser.screenshot(f'{label}-scrolled.png')
    browser.evaluate('window.scrollTo({top:0,behavior:"instant"})');time.sleep(.5)
    assert browser.evaluate('getComputedStyle(document.querySelector("[data-nav-surface]")).backdropFilter') == 'none'
    rect = browser.evaluate('''(() => {let a=document.querySelector('[data-nav-target="news"]');let r=a.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,left:a.offsetLeft};})()''')
    browser.call('Input.dispatchMouseEvent', type='mouseMoved', x=rect['x'], y=rect['y'])
    time.sleep(.6)
    left = browser.evaluate('parseFloat(document.querySelector("[data-nav-indicator]").style.left)')
    assert abs(left - rect['left']) < 1, (left,rect)
    browser.call('Input.dispatchMouseEvent', type='mouseMoved', x=10, y=300)
    time.sleep(.3)
    # Each navigation item scrolls to the matching heading without remounting the profile.
    browser.evaluate('window.__profileBeforeNavigation = document.querySelector("[data-profile]"); true')
    for section in ['news', 'selected-publications', 'about']:
        browser.evaluate(f'document.querySelector("[data-nav-items] [data-nav-target={section}]").click()')
        time.sleep(1)
        navigation = browser.evaluate(f'''(() => {{
          const section=document.getElementById('{section}');
          const active=document.querySelector('[data-nav-items] [aria-current]');
          return {{top:section.getBoundingClientRect().top, active:active?.dataset.navTarget, sameProfile:window.__profileBeforeNavigation===document.querySelector('[data-profile]')}};
        }})()''')
        assert abs(navigation['top']-112) < 3, (section,navigation)
        assert navigation['active'] == section and navigation['sameProfile'], (section,navigation)
        if section == 'selected-publications':
            browser.screenshot(f'{label}-publications.png')
    browser.evaluate('window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})')
    time.sleep(.4)
    browser.screenshot(f'{label}-footer.png')
    browser.evaluate('document.querySelector("[data-back-to-top]").click()')
    time.sleep(1)
    assert browser.evaluate('scrollY') < 1
    # Only light and dark are selectable; both the icon and persisted setting follow the mode.
    browser.evaluate('document.querySelector("[data-action=theme]").click()')
    time.sleep(.3)
    assert browser.evaluate('document.documentElement.dataset.theme') == 'dark'
    assert browser.evaluate('document.querySelector("[data-action=theme] [data-theme-icon=dark]").hidden') is False
    browser.screenshot(f'{label}-dark.png')
    browser.navigate(browser.evaluate('location.href'))
    assert browser.evaluate('document.documentElement.dataset.theme') == 'dark'
    browser.evaluate('document.querySelector("[data-action=theme]").click()')
    time.sleep(.3)
    assert browser.evaluate('document.documentElement.dataset.theme') == 'light'
    assert browser.evaluate('document.querySelector("[data-action=theme] [data-theme-icon=light]").hidden') is False
    result['sectionNavigation'] = 'All three anchors align below the header, with active-section highlighting'
    result['themeToggle'] = 'Light/dark icons and persistence verified'
    result['backToTop'] = 'Returns to page top'
    # Read the live third-party widget in its own frame without hardcoding its count.
    frames = browser.call('Page.getFrameTree')['frameTree'].get('childFrames', [])
    widget_text = ''
    if frames:
        frame_id = frames[0]['frame']['id']
        context = browser.call('Page.createIsolatedWorld', frameId=frame_id)['executionContextId']
        for _ in range(15):
            read = browser.call('Runtime.evaluate', contextId=context, expression='document.body.innerText', returnByValue=True)
            widget_text = read.get('result',{}).get('value','')
            if 'Total Pageviews' in widget_text: break
            time.sleep(.3)
    result['liveVisitorWidget'] = widget_text
    result['footerPageviews'] = browser.evaluate('document.querySelector("footer [data-pageview-count]").textContent')
    assert result['footerPageviews'] in widget_text and result['footerPageviews'] != 'Total Pageviews: …', result['footerPageviews']
    assert browser.evaluate('document.querySelector("[data-visitor-map]") === null')
    assert browser.evaluate('getComputedStyle(document.querySelector("[data-pageview-frame]")).opacity') == '0'
    count_before = result['footerPageviews']
    browser.evaluate("window.postMessage({type:'haoyu-pageviews',text:'999999 Total Pageviews'}, '*')")
    time.sleep(.1)
    assert browser.evaluate('document.querySelector("[data-pageview-count]").textContent') == count_before, 'Reject counts from unrelated message sources'
    print(label, json.dumps(result,ensure_ascii=False),flush=True)
    return result

if __name__ == '__main__':
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'out')))
    Thread(target=server.serve_forever,daemon=True).start()
    with tempfile.TemporaryDirectory(prefix='haoyu-updates-') as profile:
        process=subprocess.Popen(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1',f'--user-data-dir={profile}','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        browser=None
        try:
            portfile=Path(profile)/'DevToolsActivePort'
            for _ in range(150):
                if portfile.exists():break
                time.sleep(.1)
            port=portfile.read_text().splitlines()[0]
            tabs=json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list'))
            browser=Browser(next(t['webSocketDebuggerUrl'] for t in tabs if t['type']=='page'))
            browser.call('Page.enable')
            browser.viewport(1440,1100)
            results={}
            for name,url in [('source',f'http://127.0.0.1:{server.server_port}/'),('html',(ROOT/'Haoyu-Zhao.html').as_uri())]:
                browser.navigate(url)
                results[name]=check_home(browser,name)
            (REVIEW/'requested-updates-checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
            assert 'Total Pageviews' in results['source']['liveVisitorWidget'], 'Live site visitor widget failed to load'
            assert 'Total Pageviews' in results['html']['liveVisitorWidget'], 'Standalone visitor widget failed to load'
            print('All requested updates verified on source and standalone HTML.',flush=True)
        finally:
            if browser:
                try:browser.call('Browser.close')
                except Exception:pass
                browser.ws.close()
            try:process.wait(timeout=8)
            except subprocess.TimeoutExpired:process.terminate();process.wait(timeout=5)
            server.shutdown();server.server_close()
