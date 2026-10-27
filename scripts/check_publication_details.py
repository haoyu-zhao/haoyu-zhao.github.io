"""Exercise inline abstracts/citations in both React and the portable HTML."""
import json
import time
from review_preview import ROOT


def click_copy(browser, selector):
    browser.call('Runtime.evaluate', expression=f'document.querySelector({json.dumps(selector + " [data-action=copy-bibtex]")}).click()', userGesture=True)
    for _ in range(50):
        state = browser.evaluate(f'document.querySelector({json.dumps(selector + " [data-action=copy-bibtex]")}).dataset.copyState')
        if state in ('success', 'error'):
            return state
        time.sleep(.05)
    raise AssertionError('Copy did not finish')


def clipboard_text(browser):
    result = browser.call('Runtime.evaluate', expression='navigator.clipboard.readText()', awaitPromise=True, returnByValue=True, userGesture=True)
    assert 'exceptionDetails' not in result, result
    return result['result'].get('value')


def check_publication_details(browser, label):
    # A fresh headless browser gets clipboard access solely for these copy checks.
    browser.call('Browser.grantPermissions', permissions=['clipboardReadWrite', 'clipboardSanitizedWrite'])
    browser.call('Page.bringToFront')
    citations = json.loads((ROOT / 'content/publication-details.json').read_text())
    cards = browser.evaluate("""[...document.querySelectorAll('[data-publication-id]')].map(card => ({
      id:card.dataset.publicationId,
      panels:[...card.querySelectorAll('[data-publication-panel]')].map(p=>({kind:p.dataset.publicationPanel,hidden:p.hidden,text:p.querySelector('[data-bibtex-code]')?.textContent || p.textContent})),
      buttons:[...card.querySelectorAll('[data-detail]')].map(b=>({kind:b.dataset.detail,expanded:b.getAttribute('aria-expanded'),controls:!!document.getElementById(b.getAttribute('aria-controls'))}))
    }))""")
    assert len(cards) == len(citations), cards
    assert {card['id'] for card in cards} == set(citations), cards
    original_url = browser.evaluate('location.href')
    for card in cards:
        assert len(card['panels']) == len(card['buttons']) == 2, card
        assert all(p['hidden'] and len(p['text']) > 100 for p in card['panels']), card
        assert all(b['expanded'] == 'false' and b['controls'] for b in card['buttons']), card
        assert card['panels'][1]['text'].lstrip().startswith('@'), card
        assert card['panels'][1]['text'] == citations[card['id']]['bibtex'], 'Displayed citation text changed'
        selector = f'[data-publication-id="{card["id"]}"]'
        for kind, expected in [('abstract', [False, True]), ('bibtex', [True, False]), ('bibtex', [True, True])]:
            browser.evaluate(f'document.querySelector(\'{selector} [data-detail="{kind}"]\').click()')
            time.sleep(.08)
            state = browser.evaluate(f"""[...document.querySelectorAll('{selector} [data-publication-panel]')].map(p=>p.hidden)""")
            assert state == expected, (card['id'], kind, state)
            if kind == 'bibtex' and expected == [True, False]:
                assert click_copy(browser, selector) == 'success', card['id']
                assert clipboard_text(browser) == citations[card['id']]['bibtex'], 'Clipboard must contain only this paper’s exact citation'
        assert state == [True, True], (card['id'], state)

    first = '[data-publication-id="cle"]'
    second = '[data-publication-id="memento3"]'
    browser.evaluate(f'document.querySelector(\'{first} [data-detail="abstract"]\').focus()')
    browser.call('Page.bringToFront')
    browser.call('Input.dispatchKeyEvent', type='keyDown', key='Enter', code='Enter', windowsVirtualKeyCode=13, text='\r', unmodifiedText='\r')
    browser.call('Input.dispatchKeyEvent', type='keyUp', key='Enter', code='Enter', windowsVirtualKeyCode=13)
    time.sleep(.15)
    assert browser.evaluate(f'!document.querySelector(\'{first} [data-publication-panel="abstract"]\').hidden')
    browser.evaluate(f'document.querySelector(\'{second} [data-detail="bibtex"]\').click()')
    time.sleep(.1)
    assert browser.evaluate('document.querySelectorAll("[data-publication-panel]:not([hidden])").length') == 2
    browser.evaluate(f'document.querySelector(\'{first}\').scrollIntoView({{block:"start",behavior:"instant"}}); window.scrollBy({{top:-110,behavior:"instant"}})')
    time.sleep(.3)
    browser.screenshot(f'{label}-abstract.png')
    browser.evaluate(f'document.querySelector(\'{first} [data-detail="bibtex"]\').click()')
    time.sleep(.15)
    browser.screenshot(f'{label}-bibtex.png')
    typography = browser.evaluate(f"""(() => {{
      const card=document.querySelector('{first}');
      const code=getComputedStyle(card.querySelector('.bibtex-code'));
      const abstract=getComputedStyle(card.querySelector('[data-publication-panel="abstract"] p'));
      return {{codeSize:parseFloat(code.fontSize),codeLine:parseFloat(code.lineHeight),abstractSize:parseFloat(abstract.fontSize),abstractWeight:Number(abstract.fontWeight)}};
    }})()""")
    assert typography['codeSize'] >= 14 and typography['codeLine'] >= 21, typography
    assert typography['abstractSize'] == 15 and typography['abstractWeight'] == 400, typography
    # Clipboard API rejection must fall back to copying in the current document.
    browser.evaluate("""window.__copyOriginal = navigator.clipboard.writeText;
      window.__execOriginal = document.execCommand;
      navigator.clipboard.writeText = () => Promise.reject(new DOMException('Denied for test', 'NotAllowedError')); true""")
    assert click_copy(browser, first) == 'success', 'Clipboard fallback failed'
    assert clipboard_text(browser) == citations['cle']['bibtex']
    # If neither API works, report failure honestly and allow retry.
    browser.evaluate('document.execCommand = () => false; true')
    assert click_copy(browser, first) == 'error'
    assert browser.evaluate(f'!document.querySelector(\'{first} [data-copy-error]\').hidden')
    browser.evaluate('navigator.clipboard.writeText = window.__copyOriginal; document.execCommand = window.__execOriginal; true')
    assert click_copy(browser, first) == 'success'
    assert clipboard_text(browser) == citations['cle']['bibtex']
    browser.screenshot(f'{label}-bibtex-copied.png')
    assert browser.evaluate('location.href') == original_url, 'Details must not navigate or change the URL'
    assert not browser.evaluate('document.documentElement.scrollWidth > innerWidth'), 'Desktop citation overflow'
    browser.viewport(390, 844)
    time.sleep(.2)
    browser.screenshot(f'{label}-bibtex-mobile.png')
    assert not browser.evaluate('document.documentElement.scrollWidth > innerWidth'), 'Mobile citation overflow'
    browser.viewport(1440, 1100)
    browser.evaluate('document.querySelector("[data-action=theme]").click()')
    time.sleep(.2)
    browser.screenshot(f'{label}-bibtex-dark.png')
    browser.evaluate('document.querySelector("[data-action=theme]").click()')
    browser.evaluate('document.querySelectorAll("[data-detail][aria-expanded=true]").forEach(button=>button.click())')
    time.sleep(.15)
    assert browser.evaluate('document.querySelectorAll("[data-publication-panel]:not([hidden])").length') == 0
    browser.evaluate('window.scrollTo({top:0,behavior:"instant"})')
    print(label, f'All {len(cards)} Abs/Bib toggles, exact clipboard contents, copy fallback/failure/retry, keyboard activation, dark mode and responsive layout passed.', flush=True)
