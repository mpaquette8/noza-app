function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}

document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn() && window.location.pathname !== '/app.html') {
        window.location.href = '/app.html';
    }
});

window.isLoggedIn = isLoggedIn;
