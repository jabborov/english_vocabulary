// Last word: one word you mark yourself with the "⤓ Last word" button on a word card (topic pages),
// e.g. the word where you stopped. Saved in localStorage "vocab-last" as the word id
// ("0004|cramped", Part 1: "p1:0001|self-sufficient" — the same ids as the learning status).
// Marking another word moves the mark; clicking the button on the marked word removes it.
// Main page: the "⤓ Last word" button (#last-word) opens the marked word in its topic.
// Usage: load after data.js and data_part1.js.
(function(){
  const KEY = 'vocab-last';
  const PARTS = { '1': window.VOCAB_DATA_PART1 || {}, '2': window.VOCAB_DATA || {} };

  // id -> { id, part, topicKey, title, w, url } if the word exists, otherwise null
  function parse(id){
    const m = /^(p1:)?(\d{4})\|(.+)$/.exec(typeof id === 'string' ? id : '');
    if(!m) return null;
    const part = m[1] ? '1' : '2', topicKey = m[2], w = m[3], t = PARTS[part][topicKey];
    if(!t || !t.words.some(x => x.w === w)) return null;
    const url = `topic.html?topic=${topicKey}${part === '1' ? '&part=1' : ''}&word=${encodeURIComponent(w)}`;
    return { id, part, topicKey, title: t.title, w, url };
  }
  function get(){
    let id = null;
    try{ id = JSON.parse(localStorage.getItem(KEY)); }catch(e){}
    return parse(id);
  }
  function set(id){
    try{
      if(id) localStorage.setItem(KEY, JSON.stringify(id));
      else localStorage.removeItem(KEY);
    }catch(e){}
  }
  window.VocabLast = { get, set, parse };

  // ----- Main page button -----
  const btn = document.getElementById('last-word');
  if(!btn) return;
  function sync(){
    const L = get();
    btn.disabled = !L;
    btn.setAttribute('aria-disabled', L ? 'false' : 'true');
    btn.title = L ? `Go to your Last word: "${L.w}" (Part ${L.part} · ${L.topicKey} · ${L.title})`
                  : 'No Last word yet — open a topic and press ⤓ Last word on a word to mark it';
  }
  btn.addEventListener('click', () => { const L = get(); if(L) window.location.href = L.url; });
  // Keep the button right when the mark changes in another tab or when coming back from a topic page.
  window.addEventListener('storage', e => { if(e.key === KEY) sync(); });
  window.addEventListener('pageshow', sync);
  sync();
})();
