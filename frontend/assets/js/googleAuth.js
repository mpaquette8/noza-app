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
    let cachedClientId = null;
    const widthCache = new Map();

    function setState(newState) {
        if (state !== newState) {
            state = newState;
        }
    }

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

    function getClientId() {
        if (cachedClientId) {
            return Promise.resolve(cachedClientId);
        }

        try {
            const storedId = localStorage.getItem('googleClientId');
            if (storedId) {
                cachedClientId = storedId;
                return Promise.resolve(cachedClientId);
            }
        } catch (_) {}

        return fetch('/api/config/google')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                cachedClientId = data.clientId;
                try {
                    localStorage.setItem('googleClientId', cachedClientId);
                } catch (_) {}
                return cachedClientId;
            })
            .catch(err => {
                console.error('GoogleAuth fetch config error:', err);
                const fallback = typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID;
                if (fallback) {
                    cachedClientId = fallback;
                    return cachedClientId;
                }
                throw err;
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

    function computeWidth(container) {
        const rect = container.getBoundingClientRect();
        const parentRect = container.parentElement?.getBoundingClientRect();
        const width = Math.min(
            rect.width || parentRect?.width || window.innerWidth - 40,
            300
        );
        widthCache.set(container, width);
        return width;
    }

    function renderButtons() {
        if (googleButtonsRendered) return;
        const configs = [
            { id: 'googleSignInButton', text: 'signin_with' },
            { id: 'googleSignInButtonRegister', text: 'signup_with' }
        ];

        const tasks = [];

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

            const width = computeWidth(container);
            tasks.push({ container, parent, width, text });
        });

        requestAnimationFrame(() => {
            tasks.forEach(({ container, parent, width, text }) => {
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
                    enforceButtonDimensions(container, width);
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
        });
    }

    function enforceButtonDimensions(container, width = widthCache.get(container)) {
        if (typeof width !== 'number') {
            width = computeWidth(container);
        }
        const widthPx = width + 'px';
        container.style.width = '100%';
        container.style.maxWidth = '100%';
        container.style.minWidth = widthPx;
        container.style.minHeight = '50px';
        const inner = container.querySelector('div');
        if (inner) {
            inner.style.width = '100%';
            inner.style.maxWidth = '100%';
            inner.style.minWidth = widthPx;
        }
        const iframe = container.querySelector('iframe');
        if (iframe) {
            iframe.style.width = '100%';
            iframe.style.maxWidth = '100%';
            iframe.style.minWidth = widthPx;
            iframe.style.height = '50px';
        }
    }

    function observeButtons() {
        ['googleSignInButton', 'googleSignInButtonRegister'].forEach(id => {
            const container = document.getElementById(id);
            if (!container) return;
            const schedule = () => {
                const width = computeWidth(container);
                requestAnimationFrame(() => enforceButtonDimensions(container, width));
            };
            schedule();
            new ResizeObserver(schedule).observe(container);
            new MutationObserver(schedule).observe(container, { childList: true, subtree: true });
        });
    }

    function init(callback = () => {}, timeout = 10000, skipRetry = false) {
        if (googleInitialized) return Promise.resolve();
        if (initPromise) return initPromise;

        document.querySelectorAll('.google-auth-container').forEach(c => c.classList.add('loading'));

        const sdkPromise = loadSdk();
        const clientIdPromise = getClientId();

        const initSequence = Promise.all([sdkPromise, clientIdPromise])
            .then(([, clientId]) => {
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
                setState(STATES.READY);
            });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('GoogleAuth init timeout')), timeout)
        );

        initPromise = Promise.race([initSequence, timeoutPromise]).catch(err => {
            console.error('GoogleAuth init error:', err);
            if (!skipRetry && err instanceof TypeError) {
                return retryInit(3, callback, timeout);
            }
            if (!skipRetry && state !== STATES.FAILED) {
                setState(STATES.FAILED);
                showEmailFallback();
            }
            throw err;
        });

        return initPromise;
    }

    function retryInit(maxAttempts = 3, callback = () => {}, timeout = 10000) {
        let attempt = 0;
        const attemptInit = () =>
            init(callback, timeout, true).catch(err => {
                if (err instanceof TypeError && attempt < maxAttempts) {
                    const delay = 2 ** attempt * 1000;
                    attempt++;
                    return new Promise(res => setTimeout(res, delay)).then(attemptInit);
                }
                if (state !== STATES.FAILED) {
                    setState(STATES.FAILED);
                    showEmailFallback();
                }
                throw err;
            });
        return attemptInit();
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
        setState(STATES.LOADING);
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
        retryInit,
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
    if (GoogleAuth.state !== GoogleAuth.STATES.LOADING) {
        GoogleAuth.reset();
    }
});

