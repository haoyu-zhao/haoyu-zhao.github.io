'use client';

import { useEffect, useRef, useState } from 'react';

// Keep the original live counter/account. Its legacy widget runs invisibly;
// only its reported total is displayed in the footer.
const counterEmbed = `<!doctype html><html><head>
<base href="https://mapmyvisitors.com/">
<style>html,body{margin:0}body{width:240px}</style>
</head><body>
<script>
function reportPageviews() {
  var text = (document.querySelector('.mapmyvisitors-visitors')?.textContent || '').replace(/\\s+/g, ' ').trim();
  if (/^[\\d,. ]+ Total Pageviews$/i.test(text)) {
    parent.postMessage({type:'haoyu-pageviews', text:text}, '*');
  }
}
new MutationObserver(reportPageviews).observe(document.body, {subtree:true, childList:true, characterData:true});
window.addEventListener('message', function(event) {
  if (event.source === parent && event.data === 'request-pageviews') reportPageviews();
});
</script>
<script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
<script>
window.vmap_jq = window.jQuery.noConflict(true);
window.vmap_jq.ajaxPrefilter(function(options) {
  options.url = options.url.replace(/^(?:about|file|http):/, 'https:');
});
</script>
<script id="mapmyvisitors" src="https://mapmyvisitors.com/map.js?cl=ffffff&w=240&t=tt&d=oIrgYL1mQM5UBH-rrDPlw0wOupQgSkABmcPfSd01whs"></script>
</body></html>`;

export default function PageviewCounter() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [count, setCount] = useState('Total Pageviews: …');

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'haoyu-pageviews') return;
      if (typeof event.data.text === 'string' && /^[\d,. ]+ Total Pageviews$/i.test(event.data.text)) {
        setCount(event.data.text);
      }
    };
    window.addEventListener('message', receive);
    frame.current?.contentWindow?.postMessage('request-pageviews', '*');
    return () => window.removeEventListener('message', receive);
  }, []);

  return (
    <span className="relative whitespace-nowrap" data-pageviews>
      <span data-pageview-count role="status" aria-live="polite">{count}</span>
      <iframe ref={frame} data-pageview-frame title="Pageview counter" srcDoc={counterEmbed} className="pageview-frame" aria-hidden="true" tabIndex={-1} scrolling="no" loading="eager" />
    </span>
  );
}
