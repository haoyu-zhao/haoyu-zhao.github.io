// Portable-file adapter for the rendered pages, section navigation, and controls.
const bundle = JSON.parse(document.getElementById('portable-pages').textContent);
const app = document.getElementById('portable-app');
let currentRoute = null;
let currentTheme = 'light';
try { currentTheme = JSON.parse(localStorage.getItem('theme-storage'))?.state?.theme === 'dark' ? 'dark' : 'light'; } catch {}
let filters = {year: 'all', type: 'all'};
let hoveredNavLink = null;
let navFrame = 0;
const copyTimers = new WeakMap();

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const active = document.activeElement;
  const selection = window.getSelection();
  const ranges = selection ? Array.from({length:selection.rangeCount}, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
  document.body.append(field);
  try {
    field.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    active?.focus({preventScroll:true});
    selection?.removeAllRanges();
    ranges.forEach(range => selection?.addRange(range));
  }
}

function setCopyState(button, state) {
  button.dataset.copyState = state;
  button.disabled = state === 'copying';
  button.querySelector('[data-copy-label]').textContent = {idle:'Copy',copying:'Copying…',success:'Copied!',error:'Try again'}[state];
  button.closest('[data-publication-panel]').querySelector('[data-copy-error]').hidden = state !== 'error';
}

async function copyPublicationCitation(button) {
  if (button.disabled) return;
  clearTimeout(copyTimers.get(button));
  const text = button.closest('[data-publication-panel]').querySelector('[data-bibtex-code]').textContent;
  setCopyState(button, 'copying');
  const success = await copyToClipboard(text);
  setCopyState(button, success ? 'success' : 'error');
  if (success) copyTimers.set(button, setTimeout(() => setCopyState(button, 'idle'), 2500));
}

function applyTheme(persist = false) {
  document.documentElement.classList.toggle('dark', currentTheme === 'dark');
  document.documentElement.classList.toggle('light', currentTheme === 'light');
  document.documentElement.dataset.theme = currentTheme;
  document.querySelectorAll('[data-action=theme]').forEach(control => {
    const label = currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    control.title = label;
    control.setAttribute('aria-label', label);
    control.setAttribute('aria-pressed', String(currentTheme === 'dark'));
    control.dataset.themeMode = currentTheme;
    control.querySelectorAll('[data-theme-icon]').forEach(icon => { icon.hidden = icon.dataset.themeIcon !== currentTheme; });
  });
  if (persist) {
    try { localStorage.setItem('theme-storage', JSON.stringify({state:{theme:currentTheme},version:0})); } catch {}
  }
}

function renderRoute({smooth = false} = {}) {
  const raw = location.hash.slice(1);
  const route = raw.startsWith('/') ? raw.slice(1).replace(/\/$/, '') : '';
  const section = raw.startsWith('/') ? '' : raw;
  const key = Object.hasOwn(bundle.pages, route) ? route : '';
  if (currentRoute !== key) {
    currentRoute = key;
    app.innerHTML = bundle.pages[key];
    document.title = bundle.titles[key] || 'Haoyu Zhao';
    filters = {year: 'all', type: 'all'};
    initializeNavigation();
    initializeContacts();
    applyTheme();
  }
  requestAnimationFrame(() => {
    const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant';
    const target = section && section !== 'top' ? document.getElementById(section) : null;
    if (target) target.scrollIntoView({behavior, block:'start'});
    else window.scrollTo({top:0, behavior});
    updateNavigation();
  });
}

function filterPapers() {
  const query = (document.querySelector('[data-search]')?.value || '').trim().toLowerCase();
  document.querySelectorAll('[data-publication]').forEach(card => {
    card.hidden = !(card.textContent.toLowerCase().includes(query)
      && (filters.year === 'all' || filters.year === card.dataset.year)
      && (filters.type === 'all' || filters.type === card.dataset.type));
  });
}

document.addEventListener('input', event => {
  if (event.target.matches('[data-search]')) filterPapers();
});

document.addEventListener('click', event => {
  const anchor = event.target.closest('a[data-nav-target], a[data-back-to-top]');
  if (anchor && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
    event.preventDefault();
    history.pushState(null, '', anchor.hasAttribute('data-back-to-top') ? '#top' : anchor.getAttribute('href'));
    renderRoute({smooth:true});
    return;
  }
  const button = event.target.closest('[data-action], [data-filter]');
  if (!button) return;
  if (button.dataset.action === 'copy-bibtex') {
    copyPublicationCitation(button);
    return;
  }
  if (button.dataset.action === 'publication-detail') {
    const scope = button.closest('[data-publication-details]');
    const copyButton = scope.querySelector('[data-action="copy-bibtex"]');
    if (copyButton) {
      clearTimeout(copyTimers.get(copyButton));
      setCopyState(copyButton, 'idle');
    }
    const open = button.getAttribute('aria-expanded') !== 'true';
    scope.querySelectorAll('[data-detail]').forEach(control => {
      control.setAttribute('aria-expanded', String(open && control === button));
    });
    scope.querySelectorAll('[data-publication-panel]').forEach(panel => {
      panel.hidden = !(open && panel.dataset.publicationPanel === button.dataset.detail);
    });
  }
  if (button.dataset.action === 'theme') {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(true);
  }
  if (button.dataset.action === 'menu') {
    const existing = document.getElementById('portable-menu');
    if (existing) {
      existing.remove();
      button.setAttribute('aria-expanded', 'false');
    } else {
      const menu = document.createElement('div');
      menu.id = 'portable-menu';
      menu.className = 'lg:hidden bg-background/95 backdrop-blur-xl border-b border-neutral-200/50 shadow-lg';
      const inner = document.createElement('div');
      inner.className = 'px-2 pt-2 pb-3 space-y-1 sm:px-3';
      document.querySelectorAll('[data-nav-items] a').forEach(source => {
        const link = source.cloneNode(true);
        link.className = 'block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 text-neutral-600 hover:text-primary hover:bg-neutral-50';
        link.onclick = () => { menu.remove(); button.setAttribute('aria-expanded', 'false'); };
        inner.append(link);
      });
      menu.append(inner);
      button.closest('nav').append(menu);
      button.setAttribute('aria-expanded', 'true');
    }
  }
  if (button.dataset.action === 'filters') {
    const panel = document.querySelector('[data-filter-panel]');
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  }
  if (button.dataset.filter) {
    filters[button.dataset.filter] = button.dataset.value;
    document.querySelectorAll(`[data-filter="${button.dataset.filter}"]`).forEach(item => {
      const active = item === button;
      item.classList.toggle('bg-accent', active);
      item.classList.toggle('text-white', active);
      item.classList.toggle('bg-white', !active);
      item.classList.toggle('text-neutral-600', !active);
    });
    filterPapers();
  }
});

function placeNavIndicator(link) {
  const indicator = document.querySelector('[data-nav-indicator]');
  if (!indicator) return;
  indicator.hidden = !link;
  if (!link) return;
  Object.assign(indicator.style, {left:`${link.offsetLeft}px`, top:`${link.offsetTop}px`, width:`${link.offsetWidth}px`, height:`${link.offsetHeight}px`});
}
function updateActiveSection() {
  const links = [...document.querySelectorAll('[data-nav-items] [data-nav-target]')];
  const sections = links.map(link => ({link, section:document.getElementById(link.dataset.navTarget)})).filter(entry => entry.section);
  let active = sections[0]?.link;
  const marker = (document.querySelector('nav')?.getBoundingClientRect().bottom || 80) + 40;
  sections.forEach(({link,section}) => { if (section.getBoundingClientRect().top <= marker) active = link; });
  if (sections.length && scrollY + innerHeight >= document.documentElement.scrollHeight - 2) active = sections.at(-1).link;
  links.forEach(link => {
    if (link === active) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
    link.classList.toggle('text-primary', link === active || link === hoveredNavLink);
    link.classList.toggle('text-neutral-600', link !== active && link !== hoveredNavLink);
  });
  placeNavIndicator(hoveredNavLink || active);
}
function updateNavigation() {
  const surface = document.querySelector('[data-nav-surface]');
  if (!surface) return;
  const scrolled = window.scrollY > 20;
  if (surface.dataset.scrolled !== String(scrolled)) {
    surface.dataset.scrolled = String(scrolled);
    surface.className = 'transition-all duration-300 ease-out ' + (scrolled
      ? 'bg-background/80 backdrop-blur-xl border-b border-neutral-200/50 shadow-lg'
      : 'bg-transparent');
  }
  updateActiveSection();
}
function initializeNavigation() {
  hoveredNavLink = null;
  const items = document.querySelector('[data-nav-items]');
  if (!items) return;
  if (!items.querySelector('[data-nav-indicator]')) {
    const indicator = document.createElement('div');
    indicator.dataset.navIndicator = '';
    indicator.className = 'absolute rounded-lg pointer-events-none bg-accent/10';
    items.prepend(indicator);
  }
  items.querySelectorAll('[data-nav-href]').forEach(link => {
    const show = () => { hoveredNavLink = link; updateActiveSection(); };
    const reset = () => { hoveredNavLink = null; updateActiveSection(); };
    link.addEventListener('pointerenter', show);
    link.addEventListener('pointerleave', reset);
    link.addEventListener('focus', show);
    link.addEventListener('blur', reset);
  });
  updateNavigation();
  document.fonts.ready.then(updateNavigation);
}
window.addEventListener('scroll', () => {
  if (!navFrame) navFrame = requestAnimationFrame(() => { navFrame = 0; updateNavigation(); });
}, {passive:true});
window.addEventListener('resize', updateNavigation);
// Preserve the original hover popovers and click-to-pin behavior in the HTML file.
let pinnedContact = null;
let contactTimer = null;
function showContact(kind) {
  clearTimeout(contactTimer);
  document.querySelectorAll('[data-contact]').forEach(wrapper => {
    const visible = wrapper.dataset.contact === kind;
    const panel = wrapper.querySelector('[data-contact-popup]');
    const button = wrapper.querySelector('[data-contact-trigger]');
    const wasHidden = panel.hidden;
    panel.hidden = !visible;
    button.setAttribute('aria-expanded', String(visible));
    button.classList.toggle('text-accent', pinnedContact === wrapper.dataset.contact);
    if (visible && wasHidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      panel.animate([{opacity:0, transform:'translateY(10px) scale(.8)'}, {opacity:1, transform:'none'}], {duration:180, easing:'ease-out'});
    }
  });
}
function initializeContacts() {
  clearTimeout(contactTimer);
  pinnedContact = null;
  document.querySelectorAll('[data-contact]').forEach(wrapper => {
    const kind = wrapper.dataset.contact;
    const reveal = () => { if (!pinnedContact || pinnedContact === kind) showContact(kind); };
    const leave = () => { if (!pinnedContact) contactTimer = setTimeout(() => showContact(null), 120); };
    wrapper.addEventListener('pointerenter', reveal);
    wrapper.addEventListener('pointerleave', leave);
    wrapper.addEventListener('focusin', reveal);
    wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) leave(); });
    wrapper.querySelector('[data-contact-trigger]').addEventListener('click', () => {
      pinnedContact = pinnedContact === kind ? null : kind;
      showContact(pinnedContact);
    });
  });
}
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('[data-contact]')) { pinnedContact = null; showContact(null); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { pinnedContact = null; showContact(null); }
});

window.addEventListener('hashchange', () => renderRoute());
window.addEventListener('message', event => {
  const frame = document.querySelector('[data-pageview-frame]');
  if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'haoyu-pageviews') return;
  if (typeof event.data.text === 'string' && /^[\d,. ]+ Total Pageviews$/i.test(event.data.text)) {
    document.querySelector('[data-pageview-count]').textContent = event.data.text;
  }
});
applyTheme();
renderRoute();
