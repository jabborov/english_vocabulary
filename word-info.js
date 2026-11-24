// Word info for synonyms and opposites.
// A synonym/opposite that is itself a word in Part 1 or Part 2 gets a dotted underline (a <button class="wi-link">).
// Clicking it opens a popup with ALL the synonyms and opposites of that word card that have an entry:
// each original word with its Uzbek translation and English explanation (from Part 1 and Part 2 together);
// the clicked word is highlighted.
// Usage: load after data.js, data_part1.js and synonyms.js; build the lists with window.VocabInfo.list(words, item).
(function(){
  const PARTS = [
    { part: '1', data: window.VOCAB_DATA_PART1 || {} },
    { part: '2', data: window.VOCAB_DATA || {} }
  ];
  // lower-case word -> [{ part, topicKey, title, item }]
  const index = {};
  PARTS.forEach(P => Object.keys(P.data).forEach(k => P.data[k].words.forEach(item => {
    const key = String(item.w).trim().toLowerCase();
    (index[key] = index[key] || []).push({ part: P.part, topicKey: k, title: P.data[k].title, item });
  })));
  const has = w => !!index[String(w).trim().toLowerCase()];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  // Distinct meanings of a word: entries with the same part of speech, explanation and translation are merged.
  // Topics 0001–0006 of Part 2 may keep the Uzbek translation in `def` without `tr`.
  function meanings(w){
    const out = [], seen = {};
    (index[String(w).trim().toLowerCase()] || []).forEach(e => {
      const it = e.item, tr = it.tr || it.def, def = it.tr ? it.def : '';
      const key = [it.p, def, tr].join('\u0001');
      if(!seen[key]){ seen[key] = { w: it.w, p: it.p, ipa: it.ipa, tr, def, sources: [] }; out.push(seen[key]); }
      seen[key].sources.push(e);
    });
    return out;
  }

  // HTML for a list of synonyms/opposites of `owner` (a word item): words with an entry are clickable.
  function list(words, owner){
    return (words || []).map(w => has(w)
      ? `<button type="button" class="wi-link" data-w="${esc(w)}" data-of="${esc(owner.w)}" data-ofp="${esc(owner.p || '')}" title="Show translation and explanation">${esc(w)}</button>`
      : esc(w)).join(', ');
  }

  // ----- Styles (uses the pages' theme variables) -----
  const style = document.createElement('style');
  style.textContent = `
  .wi-link{ font:inherit; color:inherit; background:none; border:0; padding:0; margin:0; cursor:pointer;
    text-decoration: underline dotted; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  .wi-link:hover, .wi-link:focus-visible{ color:var(--accent); }
  .wi-link:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; border-radius:2px; }
  .wi-backdrop{ position:fixed; inset:0; z-index:120; background:rgba(0,0,0,.45);
    display:none; align-items:center; justify-content:center; padding:20px; }
  .wi-backdrop.open{ display:flex; }
  .wi-card{ position:relative; width:100%; max-width:560px; max-height:85vh; display:flex; flex-direction:column;
    background:var(--bg); color:var(--text); border:1px solid var(--line); border-radius:12px;
    box-shadow:0 20px 50px var(--shadow); }
  .wi-head{ padding:18px 60px 12px 22px; border-bottom:1px solid var(--line); }
  .wi-kicker{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--muted);
    text-transform:uppercase; letter-spacing:.04em; }
  .wi-title{ font-family:'Space Grotesk',sans-serif; font-size:21px; font-weight:600; margin:2px 0 0; }
  .wi-close{ position:absolute; top:14px; right:16px; background:none; border:1px solid var(--line); border-radius:6px;
    color:var(--muted); width:30px; height:30px; cursor:pointer; font-size:16px; line-height:1; }
  .wi-close:hover{ color:var(--text); border-color:var(--text); }
  .wi-body{ overflow:auto; padding:6px 22px 18px; }
  .wi-sec{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--accent);
    text-transform:uppercase; letter-spacing:.04em; margin:14px 0 4px; }
  .wi-word{ padding:10px 12px; margin:0 -12px; border-radius:8px; border-left:3px solid transparent; }
  .wi-word + .wi-word{ border-top:1px dashed var(--line); }
  .wi-word.wi-current{ background:color-mix(in srgb, var(--accent-dim) 45%, transparent); border-left-color:var(--accent); }
  .wi-w{ font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:600; }
  .wi-m{ margin-top:6px; }
  .wi-m + .wi-m{ margin-top:10px; }
  .wi-mtop{ display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
  .wi-pos{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--accent);
    border:1px solid var(--accent-dim); border-radius:4px; padding:0 6px; }
  .wi-ipa{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--muted); }
  .wi-row{ display:flex; gap:8px; margin-top:3px; font-size:14.5px; }
  .wi-lbl{ flex:0 0 auto; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted);
    border:1px solid var(--line); border-radius:4px; padding:0 5px; height:17px; line-height:17px; margin-top:2px; }
  .wi-tr{ color:var(--accent); }
  .wi-src{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--muted); margin-top:4px; }
  .wi-src a{ color:var(--muted); }
  .wi-src a:hover{ color:var(--accent); }
  .wi-none{ font-size:13px; color:var(--muted); margin-top:14px; }
  @media print{ .wi-backdrop{ display:none !important; } .wi-link{ text-decoration:none; } }`;
  document.head.appendChild(style);

  // ----- Popup markup -----
  const backdrop = document.createElement('div');
  backdrop.className = 'wi-backdrop';
  backdrop.innerHTML = `
    <div class="wi-card" role="dialog" aria-modal="true" aria-labelledby="wi-title">
      <div class="wi-head">
        <div class="wi-kicker">Synonyms &amp; opposites</div>
        <h2 class="wi-title" id="wi-title"></h2>
      </div>
      <button class="wi-close" type="button" id="wi-close" aria-label="Close">×</button>
      <div class="wi-body" id="wi-body"></div>
    </div>`;
  document.body.appendChild(backdrop);
  const $ = id => backdrop.querySelector('#' + id);

  function wordHTML(w, current){
    const ms = meanings(w);
    return `<div class="wi-word${current ? ' wi-current' : ''}" data-w="${esc(w)}">
      <div class="wi-w">${esc(w)}</div>
      ${ms.map(m => {
        const s = m.sources[0], more = m.sources.length - 1;
        const href = `topic.html?topic=${s.topicKey}${s.part === '1' ? '&part=1' : ''}&word=${encodeURIComponent(s.item.w)}`;
        return `<div class="wi-m">
          <div class="wi-mtop"><span class="wi-pos">${esc(m.p)}</span><span class="wi-ipa">${esc(m.ipa || '')}</span></div>
          <div class="wi-row"><span class="wi-lbl">UZ</span><span class="wi-tr">${esc(m.tr)}</span></div>
          ${m.def ? `<div class="wi-row"><span class="wi-lbl">EN</span><span class="wi-def">${esc(m.def)}</span></div>` : ''}
          <div class="wi-src"><a href="${href}">Part ${s.part} · ${s.topicKey} · ${esc(s.title)} ↗</a>${more > 0 ? ` <span>+${more} more topic${more === 1 ? '' : 's'}</span>` : ''}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  let opener = null;
  function open(word, ofW, ofP){
    const rel = window.adjRelated ? window.adjRelated({ w: ofW, p: ofP }) : null;
    const syn = rel ? rel.syn.filter(has) : (has(word) ? [word] : []);
    const ant = rel ? rel.ant.filter(has) : [];
    const missing = rel ? rel.syn.concat(rel.ant).filter(w => !has(w)) : [];
    const cur = String(word).toLowerCase();
    $('wi-title').textContent = ofW;
    $('wi-body').innerHTML =
      (syn.length ? `<div class="wi-sec">Synonyms</div>` + syn.map(w => wordHTML(w, w.toLowerCase() === cur)).join('') : '') +
      (ant.length ? `<div class="wi-sec">Opposites</div>` + ant.map(w => wordHTML(w, w.toLowerCase() === cur)).join('') : '') +
      (missing.length ? `<div class="wi-none">Not in Part 1 or Part 2 yet: ${missing.map(esc).join(', ')}</div>` : '');
    if(!backdrop.classList.contains('open')){
      opener = document.activeElement;
      backdrop.classList.add('open');
    }
    $('wi-body').scrollTop = 0;
    const c = $('wi-body').querySelector('.wi-current');
    if(c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' });
    $('wi-close').focus();
  }
  function close(){
    backdrop.classList.remove('open');
    if(opener && opener.focus && document.contains(opener)) opener.focus();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.wi-link');
    if(!b) return;
    e.preventDefault();
    open(b.dataset.w, b.dataset.of, b.dataset.ofp);
  });
  $('wi-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
  // Escape closes only this popup (not the Random or Today window behind it).
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && backdrop.classList.contains('open')){ e.stopPropagation(); close(); }
  }, true);

  window.VocabInfo = { has, meanings, list, open, close };
})();
