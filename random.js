// Random word: picks one word from ALL topics and shows it in a modal card.
// Usage: load after data.js (and examples.js), then add any element with
// the attribute data-random-word; clicking it opens a random word.
(function(){
  // Part 1 = data_part1.js / examples_part1.js, Part 2 = data.js / examples.js
  const PARTS = [
    { part: '1', data: window.VOCAB_DATA_PART1 || {}, examples: window.VOCAB_EXAMPLES_PART1 || {} },
    { part: '2', data: window.VOCAB_DATA || {}, examples: window.VOCAB_EXAMPLES || {} }
  ];
  const LEVELS = ['A1','A2','B1','B2','C1','C2'];
  // The level buttons are groups: A = A1 + A2, B = B1 + B2, C = C1 + C2.
  const GROUPS = { A: ['A1','A2'], B: ['B1','B2'], C: ['C1','C2'] };
  // Saved level groups -> list in A, B, C order. Older saves were one group ("B") or one level ("B2").
  function savedGroups(v){
    if(!Array.isArray(v)) v = [v];
    const on = v.filter(x => typeof x === 'string').map(x => LEVELS.includes(x) ? x[0] : x);
    return Object.keys(GROUPS).filter(g => on.includes(g));
  }

  // Flatten every topic of both parts into one pool: [{ part, examples, topicKey, topicTitle, item }]
  const pool = [];
  PARTS.forEach(P => Object.keys(P.data).forEach(k => P.data[k].words.forEach(item =>
    pool.push({ part: P.part, examples: P.examples, topicKey: k, topicTitle: P.data[k].title, item })
  )));
  if(!pool.length) return;

  // Topics 0001–0006 store the Uzbek translation in `def` and have no `tr`.
  // Topics 0007+ store the English meaning in `def` and Uzbek in `tr`.
  function fields(entry){
    const it = entry.item;
    let saved = null;
    try{ saved = JSON.parse(localStorage.getItem('vocab-level')); }catch(e){}
    const levels = savedGroups(saved).flatMap(g => GROUPS[g]);   // e.g. A + C -> A1, A2, C1, C2
    const set = (entry.examples[entry.topicKey] || {})[it.w];
    // The sentences shown: [{lv, en}] (lv = null for the original example).
    let exs = set ? levels.map(lv => ({ lv, en: set[LEVELS.indexOf(lv)] })).filter(x => x.en) : [];
    const grouped = exs.length > 0;
    if(!grouped) exs = [{ lv: null, en: it.ex }];
    return {
      en: it.tr ? it.def : null,
      uz: it.tr || it.def,
      exs, level: grouped ? levels.join(' + ') : null
    };
  }

  // ----- Styles (uses the pages' existing theme variables) -----
  const css = `
  .rw-backdrop{ position:fixed; inset:0; z-index:100; background:rgba(0,0,0,.55);
    display:none; align-items:center; justify-content:center; padding:20px; }
  .rw-backdrop.open{ display:flex; }
  .rw-card{ width:100%; max-width:560px; max-height:90vh; overflow:auto;
    background:var(--bg); color:var(--text); border:1px solid var(--line); border-radius:12px;
    padding:24px 26px; box-shadow:0 20px 50px var(--shadow); }
  .rw-head{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
  .rw-topic{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--accent); }
  .rw-topic:hover{ text-decoration:underline; }
  .rw-close{ background:none; border:1px solid var(--line); border-radius:6px; color:var(--muted);
    width:30px; height:30px; cursor:pointer; font-size:16px; line-height:1; flex-shrink:0; }
  .rw-close:hover{ color:var(--text); border-color:var(--text); }
  .rw-top{ display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
  .rw-word{ font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:600; }
  .rw-pos{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--accent);
    border:1px solid var(--accent-dim); border-radius:4px; padding:2px 8px; }
  .rw-ipa{ font-family:'JetBrains Mono',monospace; font-size:14px; color:var(--muted); }
  .rw-forms{ font-size:13px; color:var(--muted); }
  .rw-forms b{ font-weight:600; color:var(--text); }
  .rw-forms .lbl{ font-style:normal; color:var(--accent); }
  [data-related="off"] .rw-related{ display:none; }
  .rw-row{ margin-bottom:12px; }
  .rw-label{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--muted);
    text-transform:uppercase; letter-spacing:.04em; margin-bottom:2px; }
  .rw-en{ font-size:15px; }
  .rw-uz{ font-size:15px; color:var(--accent); }
  .rw-ex{ font-size:14.5px; color:var(--muted); font-style:italic; }
  .rw-ex::before{ content:"\\201C"; } .rw-ex::after{ content:"\\201D"; }
  .rw-ex .rw-lv{ font-family:'JetBrains Mono',monospace; font-style:normal; font-size:11px; color:var(--muted);
    border:1px solid var(--line); border-radius:4px; padding:0 5px; margin-right:6px; }
  .rw-ex .rw-t::before{ content:"\\201C"; } .rw-ex .rw-t::after{ content:"\\201D"; }
  .rw-ex.has-lv::before, .rw-ex.has-lv::after{ content:none; }
  .rw-ex.has-lv ~ .rw-ex.has-lv{ margin-top:6px; }
  .rw-ex.has-lv ~ .rw-ex.has-lv.ex-grp{ margin-top:14px; }   /* new level group (A → B, B → C) */
  .rw-uzex{ display:none; margin-top:4px; font-size:14.5px; }
  [data-translate="on"] .rw-uzex.has{ display:block; }
  .rw-uzex .lbl{ font-family:'JetBrains Mono',monospace; font-style:normal; font-size:11px; color:var(--accent);
    border:1px solid var(--accent-dim); border-radius:4px; padding:0 5px; margin-right:6px; }
  .rw-missing{ font-size:14px; color:var(--muted); }
  .rw-missing a{ color:var(--accent); }
  .rw-actions{ display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;
    margin-top:18px; padding-top:14px; border-top:1px dashed var(--line); }
  .rw-btn{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--accent); background:none;
    border:1px solid var(--accent); border-radius:6px; padding:6px 14px; cursor:pointer; }
  .rw-btn:hover{ background:var(--accent-dim); }
  .rw-oxford{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--muted); }
  .rw-oxford:hover{ color:var(--accent); }
  @media print{ .rw-backdrop{ display:none !important; } [data-random-word]{ display:none !important; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ----- Modal markup -----
  const backdrop = document.createElement('div');
  backdrop.className = 'rw-backdrop';
  backdrop.innerHTML = `
    <div class="rw-card" role="dialog" aria-modal="true" aria-labelledby="rw-word">
      <div class="rw-head">
        <a class="rw-topic" id="rw-topic"></a>
        <button class="rw-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="rw-top">
        <span class="rw-word" id="rw-word"></span>
        <span class="rw-pos" id="rw-pos"></span>
        <span class="rw-ipa" id="rw-ipa"></span>
        <span class="rw-forms" id="rw-forms"></span>
        <span class="rw-forms rw-related" id="rw-related"></span>
      </div>
      <div class="rw-row"><div class="rw-label">English meaning</div><div id="rw-en"></div></div>
      <div class="rw-row"><div class="rw-label">Uzbek translation</div><div class="rw-uz" id="rw-uz"></div></div>
      <div class="rw-row"><div class="rw-label" id="rw-ex-label">Example</div><div id="rw-ex"></div></div>
      <div class="rw-actions">
        <button class="rw-btn" type="button" id="rw-next">↻ Another random word</button>
        <a class="rw-oxford" id="rw-oxford" target="_blank" rel="noopener">Oxford ↗</a>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  const $ = id => backdrop.querySelector('#' + id);
  const oxfordUrl = w => `https://www.oxfordlearnersdictionaries.com/search/english/?q=${encodeURIComponent(w)}`;
  let lastIndex = -1, opener = null;

  function show(){
    let i;
    do { i = Math.floor(Math.random() * pool.length); } while(pool.length > 1 && i === lastIndex);
    lastIndex = i;
    const entry = pool[i], it = entry.item, f = fields(entry);

    const topic = $('rw-topic');
    topic.textContent = `Part ${entry.part} · ${entry.topicKey} · ${entry.topicTitle}`;
    topic.href = `topic.html?topic=${entry.topicKey}${entry.part === '1' ? '&part=1' : ''}`;
    $('rw-word').textContent = it.w;
    $('rw-pos').textContent = it.p;
    $('rw-ipa').textContent = it.ipa;
    const vf = window.verbForms ? window.verbForms(it) : null;
    const rel = window.adjRelated ? window.adjRelated(it) : null;
    const relParts = rel ? [
      rel.syn.length ? `<i class="lbl">Synonyms:</i> <b>${window.VocabInfo ? window.VocabInfo.list(rel.syn, it) : rel.syn.join(', ')}</b>` : '',
      rel.ant.length ? `<i class="lbl">Opposites:</i> <b>${window.VocabInfo ? window.VocabInfo.list(rel.ant, it) : rel.ant.join(', ')}</b>` : ''
    ].filter(Boolean) : [];
    $('rw-forms').innerHTML = vf ? `<i class="lbl">Past:</i> <b>${vf.past}</b> · <i class="lbl">Past participle:</i> <b>${vf.participle}</b>` : '';
    $('rw-related').innerHTML = relParts.join(' · ');

    const en = $('rw-en');
    en.className = f.en ? 'rw-en' : 'rw-missing';
    if(f.en){ en.textContent = f.en; }
    else{
      en.textContent = 'Not in this reference yet — ';
      const a = document.createElement('a');
      a.href = oxfordUrl(it.w); a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'see Oxford';
      en.appendChild(a);
    }
    $('rw-uz').textContent = f.uz;
    $('rw-ex-label').textContent = f.level ? `Example · ${f.level}` : 'Example';
    // Each sentence, followed by its Uzbek translation (level sentences only, not the original example).
    // The topic's translation file is loaded on demand the first time.
    const fillEx = data => {
      const box = $('rw-ex');
      box.innerHTML = '';
      f.exs.forEach((x, i) => {
        const ex = document.createElement('div');
        const grp = i > 0 && f.exs[i - 1].lv && x.lv && f.exs[i - 1].lv[0] !== x.lv[0];   // first sentence of a new group
        ex.className = x.lv ? 'rw-ex has-lv' + (grp ? ' ex-grp' : '') : 'rw-ex';
        if(x.lv){
          const lv = document.createElement('i'); lv.className = 'rw-lv'; lv.textContent = x.lv;
          const t = document.createElement('span'); t.className = 'rw-t'; t.textContent = x.en;
          ex.append(lv, t);
        } else ex.textContent = x.en;
        box.appendChild(ex);
        const uz = x.lv ? ((data || {})[x.lv] || {})[it.w] : null;
        if(uz){
          const u = document.createElement('div');
          u.className = 'rw-uzex has';
          u.innerHTML = '<i class="lbl">UZ</i>'; u.appendChild(document.createTextNode(uz));
          box.appendChild(u);
        }
      });
    };
    const cached = window.getTopicTranslations ? window.getTopicTranslations(entry.part, entry.topicKey) : null;
    fillEx(cached);
    if(!cached && f.level && window.loadTopicTranslations){
      window.loadTopicTranslations(entry.part, entry.topicKey).then(d => { if(lastIndex === i) fillEx(d); });
    }
    $('rw-oxford').href = oxfordUrl(it.w);

    if(!backdrop.classList.contains('open')){
      opener = document.activeElement;
      backdrop.classList.add('open');
      $('rw-next').focus();
    }
  }
  function close(){
    backdrop.classList.remove('open');
    if(opener && opener.focus) opener.focus();
  }

  document.addEventListener('click', e => {
    if(e.target.closest('[data-random-word]')){ e.preventDefault(); show(); }
  });
  $('rw-next').addEventListener('click', show);
  backdrop.querySelector('.rw-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && backdrop.classList.contains('open')) close();
  });

  window.VocabRandom = { show, close, poolSize: pool.length };
})();
