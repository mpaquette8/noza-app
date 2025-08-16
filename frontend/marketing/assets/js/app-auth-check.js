document.addEventListener('DOMContentLoaded', () => {
    if (!window.isLoggedIn || !window.isLoggedIn()) {
        window.location.href = '/auth.html';
    }
});

