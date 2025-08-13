/**
 * Gestionnaire du SDK Google Identity pour l'application.
 * Garantit une initialisation unique et expose des méthodes utilitaires.
 */
const GoogleAuth = (() => {
    const STATES = {
        LOADING: 'LOADING',
        READY: 'READY',
        FAILED: 'FAILED'
    };

    let state = STATES.LOADING;
    let googleInitialized = false;
    let initPromise = null;
    let googleButtonsRendered = false;

    function loadSdk() {
        return new Promise((resolve, reject) => {
            if (typeof google !== 'undefined') {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Google SDK failed to load'));
            document.head.appendChild(script);
        });
    }

    function showEmailFallback() {
        document.querySelectorAll('.google-auth-container').forEach(container => {
            container.style.display = 'none';
            const message = document.createElement('div');
            message.textContent = 'Connexion Google indisponible. Connexion par e-mail disponible';
            message.className = 'google-auth-fallback';
            container.insertAdjacentElement('afterend', message);
        });
    }

    function renderButtons() {
        if (googleButtonsRendered) return;
        const configs = [
            { id: 'googleSignInButton', text: 'signin_with' },
            { id: 'googleSignInButtonRegister', text: 'signup_with' }
        ];

        configs.forEach(({ id, text }) => {
            const container = document.getElementById(id);
            const parent = container?.parentElement || (
                id === 'googleSignInButton'
                    ? document.querySelector('#loginForm .google-auth-container')
                    : document.querySelector('#registerForm .google-auth-container')
            );

            if (!container) {
                console.warn(`GoogleAuth renderButtons: container #${id} not found`);
                parent?.classList.remove('loading');
                return;
            }

            if (container.hasChildNodes()) {
                parent?.classList.remove('loading');
                return;
            }

            const width = Math.min(container.offsetWidth || window.innerWidth - 40, 300);
            try {
                google.accounts.id.renderButton(container, {
                    theme: 'outline',
                    size: 'large',
                    type: 'standard',
                    shape: 'rectangular',
                    text,
                    logo_alignment: 'left',
                    width
                });
            } catch (err) {
                console.error('GoogleAuth renderButton error:', err);
                if (!document.querySelector('.google-auth-fallback')) {
                    showEmailFallback();
                }
            } finally {
                parent?.classList.remove('loading');
            }
        });
        googleButtonsRendered = true;
    }

    function enforceButtonDimensions(container) {
        const width = Math.min(
            container.offsetWidth ||
            container.parentElement?.offsetWidth ||
            window.innerWidth - 40,
            300
        ) + 'px';
        container.style.width = '100%';
        container.style.maxWidth = '100%';
        container.style.minWidth = width;
        container.style.minHeight = '50px';
        const inner = container.querySelector('div');
        if (inner) {
            inner.style.width = '100%';
            inner.style.maxWidth = '100%';
            inner.style.minWidth = width;
        }
        const iframe = container.querySelector('iframe');
        if (iframe) {
            iframe.style.width = '100%';
            iframe.style.maxWidth = '100%';
            iframe.style.minWidth = width;
            iframe.style.height = '50px';
        }
    }

    function observeButtons() {
        ['googleSignInButton', 'googleSignInButtonRegister'].forEach(id => {
            const container = document.getElementById(id);
            if (!container) return;
            const apply = () => enforceButtonDimensions(container);
            apply();
            new ResizeObserver(apply).observe(container);
            new MutationObserver(apply).observe(container, { childList: true, subtree: true });
        });
    }

    function init(callback = () => {}, timeout = 5000) {
        if (googleInitialized) return Promise.resolve();
        if (initPromise) return initPromise;

        initPromise = loadSdk()
            .then(() => {
                const initSequence = (async () => {
                    document.querySelectorAll('.google-auth-container').forEach(c => c.classList.add('loading'));

                    let clientId;
                    try {
                        const res = await fetch('/api/config/google');
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}`);
                        }
                        const data = await res.json();
                        clientId = data.clientId;
                    } catch (err) {
                        console.error('GoogleAuth fetch config error:', err);
                        const fallback = typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID;
                        if (fallback) {
                            clientId = fallback;
                        } else {
                            state = STATES.FAILED;
                            showEmailFallback();
                            throw err;
                        }
                    }

                    if (!clientId) {
                        throw new Error('Missing Google client ID');
                    }

                    google.accounts.id.initialize({
                        client_id: clientId,
                        callback,
                    });

                    renderButtons();
                    observeButtons();
                    googleInitialized = true;
                    state = STATES.READY;
                })();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('GoogleAuth init timeout')), timeout)
                );

                return Promise.race([initSequence, timeoutPromise]);
            })
            .catch(err => {
                console.error('GoogleAuth init error:', err);
                if (state !== STATES.FAILED) {
                    state = STATES.FAILED;
                    showEmailFallback();
                }
                throw err;
            });

        return initPromise;
    }

    function promptLogin(notificationCallback) {
        if (state !== STATES.READY) return;
        try {
            google.accounts.id.prompt(notificationCallback);
        } catch (err) {
            console.error('GoogleAuth prompt error:', err);
        }
    }

    function disableAutoSelect() {
        if (google?.accounts?.id) {
            try {
                google.accounts.id.disableAutoSelect();
            } catch (err) {
                console.error('GoogleAuth disableAutoSelect error:', err);
            }
        }
    }

    function reset() {
        googleInitialized = false;
        googleButtonsRendered = false;
        initPromise = null;
        state = STATES.LOADING;
        document.querySelectorAll('.google-auth-container').forEach(container => {
            container.classList.remove('loading');
            container.style.display = '';
        });

        ['googleSignInButton', 'googleSignInButtonRegister'].forEach(id => {
            let buttonContainer = document.getElementById(id);
            if (!buttonContainer) {
                buttonContainer = document.createElement('div');
                buttonContainer.id = id;
                const parent = id === 'googleSignInButton'
                    ? document.querySelector('#loginForm .google-auth-container')
                    : document.querySelector('#registerForm .google-auth-container');
                parent?.appendChild(buttonContainer);
            } else {
                buttonContainer.innerHTML = '';
            }
            buttonContainer?.parentElement?.classList.remove('loading');
            if (buttonContainer?.parentElement) {
                buttonContainer.parentElement.style.display = '';
            }
        });

        document.querySelectorAll('.google-auth-fallback').forEach(el => el.remove());
    }

    return {
        init,
        promptLogin,
        disableAutoSelect,
        reset,
        STATES,
        get state() {
            return state;
        }
    };
})();

window.GoogleAuth = GoogleAuth;

document.addEventListener('DOMContentLoaded', () => {
    GoogleAuth.reset();
});

