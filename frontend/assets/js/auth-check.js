function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}

document.addEventListener('DOMContentLoaded', () => {
    const authLink = document.getElementById('authNavLink');
    const authSection = document.getElementById('authSection');

    if (authLink) {
        if (isLoggedIn()) {
            authLink.textContent = 'Mon espace';
            authLink.href = '/app.html';
            if (authSection) authSection.style.display = 'none';
        } else {
            authLink.textContent = 'Login/Signup';
            authLink.href = '#authSection';
            if (authSection) authSection.style.display = '';
        }
    }
});

window.isLoggedIn = isLoggedIn;
