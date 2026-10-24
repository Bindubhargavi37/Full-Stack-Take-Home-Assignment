// Applies the saved daisyUI theme before React loads, so there is no flash of the wrong theme.
// A separate file (not an inline <script>) so the production Content-Security-Policy allows it.
(function () {
  var saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch {
    // Storage can be blocked (private mode); fall back to the default theme.
  }
  var theme = !saved
    ? 'corporate'
    : saved === 'SYSTEM'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : saved.toLowerCase();
  document.documentElement.setAttribute('data-theme', theme);
})();
