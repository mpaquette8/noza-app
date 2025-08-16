export function initNavigation() {
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.header-nav');

  if (!menuToggle || !nav) {
    return;
  }

  // Ensure aria-expanded is set
  menuToggle.setAttribute('aria-expanded', 'false');

  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open');
  });
}

// Initialize immediately after import
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }
}
