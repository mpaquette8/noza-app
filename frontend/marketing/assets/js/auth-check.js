function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}

document.addEventListener('DOMContentLoaded', () => {
    const authLink = document.getElementById('authNavLink');
    const authSection = document.getElementById('authSection');

    if (authLink) {
        if (isLoggedIn()) {
            authLink.textContent = 'Mon espace';
            authLink.href = '/app/';
            if (authSection) {
                authSection.style.display = 'none';
                window.location.href = '/app/';
            }
        } else {
            authLink.textContent = 'Login/Signup';
            authLink.href = '/auth.html';
        }
    }
});

window.isLoggedIn = isLoggedIn;
