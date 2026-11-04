// Scroll buttons: fixed ↑ / ↓ on the right side to jump to the top or bottom.
// Usage: load on any page; it injects its own styles and markup.
(function(){
  const css = `
  .sc-group{ position:fixed; right:20px; top:50%; transform:translateY(-50%); z-index:25;
    display:flex; flex-direction:column; gap:8px; }
  .sc-btn{ width:40px; height:40px; border-radius:8px;
    border:1px solid var(--line); background:var(--bg-alt); color:var(--muted);
    font-family:'JetBrains Mono',monospace; font-size:17px; line-height:1;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    box-shadow:0 4px 14px var(--shadow);
    transition:border-color .15s ease, color .15s ease, opacity .15s ease; }
  .sc-btn:hover{ border-color:var(--accent); color:var(--accent); }
  .sc-btn:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }
  .sc-btn.is-end{ opacity:.45; }
  @media (max-width: 600px){
    .sc-group{ right:14px; }
    .sc-btn{ width:38px; height:38px; }
  }
  @media print{ .sc-group{ display:none !important; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const group = document.createElement('div');
  group.className = 'sc-group';
  group.innerHTML = `
    <button class="sc-btn" type="button" id="sc-top" aria-label="Scroll to top" title="Scroll to top">↑</button>
    <button class="sc-btn" type="button" id="sc-bottom" aria-label="Scroll to bottom" title="Scroll to bottom">↓</button>`;
  document.body.appendChild(group);

  const topBtn = group.querySelector('#sc-top');
  const bottomBtn = group.querySelector('#sc-bottom');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = reduceMotion ? 'auto' : 'smooth';
  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior }));
  bottomBtn.addEventListener('click', () => window.scrollTo({ top: maxScroll(), behavior }));

  // Dim a button when the page is already at that end.
  function sync(){
    const y = window.scrollY || window.pageYOffset || 0;
    topBtn.classList.toggle('is-end', y <= 2);
    bottomBtn.classList.toggle('is-end', y >= maxScroll() - 2);
  }
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();

  window.VocabScroll = { sync };
})();
