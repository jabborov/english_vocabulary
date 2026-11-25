// Loads the Uzbek translations of the example sentences one topic at a time.
// Each file translations/part<P>/<topic>.js calls VOCAB_TR_STORE(part, topic, {A1:{word:uz}, A2:…, B1:…, B2:…, C1:…, C2:…, EX:…}).
// EX = the original example sentence of each word (shown when no level is selected).
// A <script> tag is used instead of fetch() so the pages also work when opened from disk (file://).
(function(){
  const cache = {}, waiting = {};

  function done(key, data){
    cache[key] = data;
    (waiting[key] || []).forEach(resolve => resolve(data));
    delete waiting[key];
  }

  window.VOCAB_TR_STORE = function(part, topic, data){ done(part + '/' + topic, data || {}); };

  // Returns the topic's translations if they are already loaded, otherwise null.
  window.getTopicTranslations = function(part, topic){ return cache[part + '/' + topic] || null; };

  // Loads the topic's translations once; resolves with {} if the file is missing.
  window.loadTopicTranslations = function(part, topic){
    const key = part + '/' + topic;
    if(cache[key]) return Promise.resolve(cache[key]);
    return new Promise(resolve => {
      const first = !waiting[key];
      (waiting[key] = waiting[key] || []).push(resolve);
      if(!first) return;
      const s = document.createElement('script');
      s.src = `translations/part${part}/${topic}.js`;
      s.onerror = () => done(key, {});
      document.head.appendChild(s);
    });
  };
})();
