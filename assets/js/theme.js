'use strict';
(() => {
  const key = 'manticore-atlas-theme-v1';
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  const root = document.documentElement;
  root.dataset.theme = saved === 'dark' ? 'dark' : 'light';
  const sync = () => {
    const dark = root.dataset.theme === 'dark';
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
      button.innerHTML = '<span aria-hidden="true">' + (dark ? '☀' : '☾') + '</span><span class="theme-label">' + (dark ? 'Light' : 'Dark') + '</span>';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0b1117' : '#f6f5f0';
  };
  document.addEventListener('DOMContentLoaded', sync);
  document.addEventListener('click', event => {
    if (!event.target.closest('#theme-toggle')) return;
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, root.dataset.theme); } catch {}
    sync();
    window.dispatchEvent(new CustomEvent('atlas-theme-change', {detail: {theme: root.dataset.theme}}));
  });
})();
