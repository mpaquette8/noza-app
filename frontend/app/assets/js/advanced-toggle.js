lucide.createIcons();

const ADV_KEY = 'noza-advanced-open';
const toggleBtn = document.getElementById('advancedToggle');
const advBox   = document.getElementById('advancedSettings');

function setState(open) {
  advBox.classList.toggle('open', open);
  advBox.hidden = !open;
  toggleBtn.setAttribute('aria-expanded', open);
  toggleBtn.querySelector('.chevron').style.transform = open ? 'rotate(180deg)' : '';
}
setState(localStorage.getItem(ADV_KEY) === 'true');

toggleBtn.addEventListener('click', () => {
  const open = !advBox.classList.contains('open');
  setState(open);
  localStorage.setItem(ADV_KEY, open);
});
