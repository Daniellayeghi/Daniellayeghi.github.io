(function () {
  var storageKey = 'theme';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var toggleButton = null;

  function storedTheme() {
    try {
      var stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (error) {}
    return null;
  }

  function currentTheme() {
    return root.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function resolvedTheme() {
    return storedTheme() || (media.matches ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (!toggleButton) {
      return;
    }
    var dark = theme === 'dark';
    toggleButton.textContent = dark ? 'Light' : 'Dark';
    toggleButton.setAttribute('aria-pressed', String(dark));
    toggleButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  applyTheme(resolvedTheme());

  function mountToggle() {
    if (toggleButton || !document.body) {
      return;
    }
    toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'theme-toggle';
    toggleButton.addEventListener('click', function () {
      var nextTheme = currentTheme() === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(storageKey, nextTheme);
      } catch (error) {}
      applyTheme(nextTheme);
    });
    document.body.appendChild(toggleButton);
    applyTheme(currentTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle, { once: true });
  } else {
    mountToggle();
  }

  var updateFromSystem = function (event) {
    if (storedTheme()) {
      return;
    }
    applyTheme(event.matches ? 'dark' : 'light');
  };

  if (media.addEventListener) {
    media.addEventListener('change', updateFromSystem);
  } else if (media.addListener) {
    media.addListener(updateFromSystem);
  }
})();
