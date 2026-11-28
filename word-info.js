// Word info for synonyms and opposites.
// - A synonym/opposite that is a word in Part 1 or Part 2 gets a dotted underline (<button class="wi-link">).
// - A synonym/opposite that is not in any topic but has an entry in the synonym dictionary (extra/<letter>.js,
//   listed in extra/index.js) is shown in green with a dotted underline (<button class="wi-link wi-extra">).
// Clicking either opens one popup with ALL the synonyms and opposites of that word card: each original word with its
// pronunciation, Uzbek translation, English explanation and A / B / C example sentences with their Uzbek translations.
// The clicked word is highlighted.
// Usage: load after data.js, data_part1.js, examples*.js, synonyms.js, tr-loader.js and extra/index.js;
// build the lists with window.VocabInfo.list(words, item).
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
  const norm = w => String(w).trim().toLowerCase();
  const has = w => !!index[norm(w)];
  // Synonym dictionary: words that are not in a topic (extra/index.js sets window.VOCAB_EXTRA_INDEX = [...])
  const extraSet = new Set((window.VOCAB_EXTRA_INDEX || []).map(norm));
  const hasExtra = w => !has(w) && extraSet.has(norm(w));

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  // ----- Synonym dictionary files: extra/<letter>.js calls VOCAB_EXTRA_STORE(letter, {word: entry}) -----
  // (a <script> tag, not fetch(), so the pages also work when opened from disk)
  const extraFiles = {}, extraWaiting = {};
  const letterOf = w => { const c = norm(w)[0] || '_'; return /[a-z]/.test(c) ? c : '_'; };
  window.VOCAB_EXTRA_STORE = function(letter, data){
    extraFiles[letter] = data || {};
    (extraWaiting[letter] || []).forEach(f => f(extraFiles[letter])); delete extraWaiting[letter];
  };
  function loadExtra(letter){
    if(extraFiles[letter]) return Promise.resolve(extraFiles[letter]);
    return new Promise(resolve => {
      const first = !extraWaiting[letter];
      (extraWaiting[letter] = extraWaiting[letter] || []).push(resolve);
      if(!first) return;
      const s = document.createElement('script');
      s.src = `extra/${letter}.js`;
      s.onerror = () => window.VOCAB_EXTRA_STORE(letter, {});
      document.head.appendChild(s);
    });
  }
  const extraEntry = w => (extraFiles[letterOf(w)] || {})[norm(w)] || null;

  // Distinct meanings of a word: entries with the same part of speech, explanation and translation are merged.
  // Topics 0001–0006 of Part 2 may keep the Uzbek translation in `def` without `tr`.
  function meanings(w){
    const out = [], seen = {};
    (index[norm(w)] || []).forEach(e => {
      const it = e.item, tr = it.tr || it.def, def = it.tr ? it.def : '';
      const key = [it.p, def, tr].join('\u0001');
      if(!seen[key]){ seen[key] = { w: it.w, p: it.p, ipa: it.ipa, tr, def, sources: [] }; out.push(seen[key]); }
      seen[key].sources.push(e);
    });
    return out;
  }

  // HTML for a list of synonyms/opposites of `owner` (a word item): words with any entry are clickable.
  function list(words, owner){
    return (words || []).map(w => {
      const cls = has(w) ? 'wi-link' : hasExtra(w) ? 'wi-link wi-extra' : '';
      return cls
        ? `<button type="button" class="${cls}" data-w="${esc(w)}" data-of="${esc(owner.w)}" data-ofp="${esc(owner.p || '')}" title="Show translation, explanation and examples">${esc(w)}</button>`
        : esc(w);
    }).join(', ');
  }

  // ----- Styles (uses the pages' theme variables) -----
  const style = document.createElement('style');
  style.textContent = `
  :root, [data-theme="dark"]{ --wi-green: #6CC08B; }
  [data-theme="light"]{ --wi-green: #2F7D4F; }
  .wi-link{ font:inherit; color:inherit; background:none; border:0; padding:0; margin:0; cursor:pointer;
    text-decoration: underline dotted; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  .wi-link.wi-extra{ color:var(--wi-green); }
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
  .wi-word.wi-xword .wi-w{ color:var(--wi-green); }
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
  .wi-none, .wi-loading{ font-size:13px; color:var(--muted); margin-top:14px; }
  .wi-loading{ margin-top:6px; font-style:italic; }
  /* Example sentences by level group: A (A1, A2), B (B1, B2), C (C1, C2), each with its Uzbek translation */
  .wi-exs{ margin-top:8px; }
  .wi-exg{ display:flex; gap:8px; }
  .wi-exg + .wi-exg{ margin-top:8px; }
  .wi-g{ flex:0 0 auto; width:17px; height:17px; line-height:17px; margin-top:2px; text-align:center; border-radius:4px;
    font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:500; color:var(--bg); background:var(--accent); }
  .wi-exl{ flex:1; min-width:0; }
  .wi-ex{ font-size:14px; color:var(--muted); font-style:italic; }
  .wi-ex + .wi-ex, .wi-exuz + .wi-ex{ margin-top:4px; }
  .wi-ex .wi-lv{ font-family:'JetBrains Mono',monospace; font-style:normal; font-size:10.5px; color:var(--muted);
    border:1px solid var(--line); border-radius:4px; padding:0 4px; margin-right:6px; }
  .wi-ex .t::before{ content:"\\201C"; } .wi-ex .t::after{ content:"\\201D"; }
  .wi-exuz{ font-size:14px; color:var(--text); margin-top:1px; }
  .wi-exuz .wi-ul{ font-family:'JetBrains Mono',monospace; font-style:normal; font-size:10.5px; color:var(--accent);
    border:1px solid var(--accent-dim); border-radius:4px; padding:0 4px; margin-right:6px; }
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

  // A / B / C groups of sentences [{lv, en, uz}] (uz may be missing until the translations have loaded).
  const LEVELS = ['A1','A2','B1','B2','C1','C2'];
  function groupsHTML(rows){
    const groups = ['A', 'B', 'C'].map(g => {
      const rs = rows.filter(x => x.lv[0] === g && x.en);
      return rs.length ? `<div class="wi-exg" data-g="${g}"><span class="wi-g" title="Level ${g}">${g}</span><div class="wi-exl">` +
        rs.map(x => `<div class="wi-ex"><i class="wi-lv">${x.lv}</i><span class="t">${esc(x.en)}</span></div>` +
          (x.uz ? `<div class="wi-exuz"><i class="wi-ul">UZ</i>${esc(x.uz)}</div>` : '')).join('') +
        `</div></div>` : '';
    }).join('');
    return groups ? `<div class="wi-exs">${groups}</div>` : '';
  }
  // Example sentences of a topic word (and their Uzbek translations from translations/part<P>/<topic>.js).
  function examplesHTML(src){
    const all = src.part === '1' ? window.VOCAB_EXAMPLES_PART1 : window.VOCAB_EXAMPLES;
    const set = ((all || {})[src.topicKey] || {})[src.item.w];
    if(!set) return '';
    const tr = window.getTopicTranslations ? (window.getTopicTranslations(src.part, src.topicKey) || {}) : {};
    return groupsHTML(LEVELS.map((lv, i) => ({ lv, en: set[i], uz: (tr[lv] || {})[src.item.w] })));
  }

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
          ${examplesHTML(s)}
          <div class="wi-src"><a href="${href}">Part ${s.part} · ${s.topicKey} · ${esc(s.title)} ↗</a>${more > 0 ? ` <span>+${more} more topic${more === 1 ? '' : 's'}</span>` : ''}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
  // A word from the synonym dictionary (not in a topic): shown in green.
  function extraHTML(w, current){
    const e = extraEntry(w);
    return `<div class="wi-word wi-xword${current ? ' wi-current' : ''}" data-w="${esc(w)}">
      <div class="wi-w">${esc(w)}</div>
      ${e ? `<div class="wi-m">
          <div class="wi-mtop"><span class="wi-pos">${esc(e.p)}</span><span class="wi-ipa">${esc(e.ipa || '')}</span></div>
          <div class="wi-row"><span class="wi-lbl">UZ</span><span class="wi-tr">${esc(e.tr)}</span></div>
          <div class="wi-row"><span class="wi-lbl">EN</span><span class="wi-def">${esc(e.def)}</span></div>
          ${groupsHTML(LEVELS.map((lv, i) => ({ lv, en: (e.lv || [])[i], uz: (e.uz || [])[i] })))}
          <div class="wi-src">Synonym dictionary · not in a topic</div>
        </div>` : `<div class="wi-loading">Loading…</div>`}
    </div>`;
  }

  let opener = null, shown = null;   // shown = { word, ofW, ofP } of the open popup
  function render(){
    const { word, ofW, ofP } = shown;
    const rel = window.adjRelated ? window.adjRelated({ w: ofW, p: ofP }) : null;
    const known = w => has(w) || hasExtra(w);
    const syn = rel ? rel.syn.filter(known) : (known(word) ? [word] : []);
    const ant = rel ? rel.ant.filter(known) : [];
    const missing = rel ? rel.syn.concat(rel.ant).filter(w => !known(w)) : [];
    const cur = norm(word);
    const one = w => has(w) ? wordHTML(w, norm(w) === cur) : extraHTML(w, norm(w) === cur);
    $('wi-title').textContent = ofW;
    $('wi-body').innerHTML =
      (syn.length ? `<div class="wi-sec">Synonyms</div>` + syn.map(one).join('') : '') +
      (ant.length ? `<div class="wi-sec">Opposites</div>` + ant.map(one).join('') : '') +
      (missing.length ? `<div class="wi-none">Not in Part 1 or Part 2 yet: ${missing.map(esc).join(', ')}</div>` : '');
    return syn.concat(ant);
  }
  // Redraw when translations or dictionary entries arrive, keeping the popup's scroll position.
  function rerender(key){
    if(!shown || shown.key !== key || !backdrop.classList.contains('open')) return;
    const body = $('wi-body'), top = body.scrollTop;
    render(); body.scrollTop = top;
  }
  function open(word, ofW, ofP){
    shown = { word, ofW, ofP, key: {} };
    const words = render();
    if(!backdrop.classList.contains('open')){
      opener = document.activeElement;
      backdrop.classList.add('open');
    }
    $('wi-body').scrollTop = 0;
    const c = $('wi-body').querySelector('.wi-current');
    if(c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' });
    $('wi-close').focus();
    // load what is still missing: Uzbek translations of topic words' sentences, dictionary entries of the others
    const key = shown.key, jobs = [];
    words.forEach(w => {
      if(has(w)) meanings(w).forEach(m => {
        const s = m.sources[0];
        if(window.loadTopicTranslations && window.getTopicTranslations && !window.getTopicTranslations(s.part, s.topicKey))
          jobs.push(window.loadTopicTranslations(s.part, s.topicKey));
      });
      else if(!extraEntry(w)) jobs.push(loadExtra(letterOf(w)));
    });
    jobs.forEach(j => j.then(() => rerender(key)));
    return Promise.all(jobs);
  }
  function close(){
    backdrop.classList.remove('open');
    shown = null;
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

  window.VocabInfo = { has, hasExtra, meanings, list, open, close, loadExtra, extraEntry };
})();
