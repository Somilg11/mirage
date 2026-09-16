// Applies the stored or system theme before first paint to avoid a flash of the wrong theme.
// Loaded as a blocking external script so the Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var stored = localStorage.getItem('mirage-theme');
    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark';
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
