export function initNavigation() {
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('headerNav');

  if (!menuToggle || !nav) {
    return;
  }

  const updateAria = () => {
    const expanded = nav.classList.contains('open');
    menuToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  updateAria();

  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    updateAria();
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
