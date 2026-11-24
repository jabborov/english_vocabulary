// Last word: the most recently added word = the last word of the last topic in data.js (Part 2,
// where new words are added). Worked out from the data on every page load, so it follows new words automatically.
// Main page: the "⤓ Last word" button (#last-word) opens that word in its topic.
// Topic page: the word gets a "Last word" mark (see topic.html), and ?word=<word> scrolls to it.
// Usage: load after data.js.
(function(){
  const data = window.VOCAB_DATA || {};
  const keys = Object.keys(data).filter(k => (data[k].words || []).length);
  if(!keys.length) return;
  const topicKey = keys[keys.length - 1], t = data[topicKey], item = t.words[t.words.length - 1];
  const url = `topic.html?topic=${topicKey}&word=${encodeURIComponent(item.w)}`;
  window.VocabLast = { part: '2', topicKey, title: t.title, w: item.w, url };

  const btn = document.getElementById('last-word');
  if(btn){
    btn.title = `Most recently added word: "${item.w}" (Part 2 · ${topicKey} · ${t.title})`;
    btn.addEventListener('click', () => { window.location.href = url; });
  }
})();
