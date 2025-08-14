/**
 * Gestion simplifiée du SDK Google Identity pour l'application.
 * Initialise le SDK et affiche un fallback e-mail en cas d'erreur.
 */
const GoogleAuth = (() => {
    let isReady = false;
    let initPromise = null;
    let cachedClientId = null;
    const widthCache = new Map();

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

    function setLoadingMessage(text) {
        document.querySelectorAll('.google-auth-container').forEach(container => {
            let msg = container.querySelector('.google-auth-message');
            if (!msg) {
                msg = document.createElement('span');
                msg.className = 'google-auth-message';
                container.appendChild(msg);
            }
            msg.innerText = text;
        });
    }

    function fadeOutLoading(container) {
        if (!container) return;
        const message = container.querySelector('.google-auth-message');
        const button = container.querySelector('div[id]');
        const cleanup = () => {
            container.classList.remove('loading');
            if (message) message.remove();
            if (button) button.style.display = '';
            requestAnimationFrame(() => { container.style.opacity = '1'; });
        };
        container.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 400);
        container.style.opacity = '0';
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
                fadeOutLoading(parent);
                showEmailFallback();
                return;
            }

            if (container.hasChildNodes()) {
                fadeOutLoading(parent);
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
                    showEmailFallback();
                } finally {
                    fadeOutLoading(parent);
                }
            });
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

    function init(callback = () => {}, timeout = 10000) {
        if (isReady) return Promise.resolve();
        if (initPromise) return initPromise;

        document.querySelectorAll('.google-auth-container').forEach(c => {
            c.classList.add('loading');
            c.style.opacity = '1';
            const btn = c.querySelector('div[id]');
            if (btn) btn.style.display = 'none';
        });

        setLoadingMessage('Connexion au service…');

        const initSequence = loadSdk()
            .then(() => {
                setLoadingMessage('Récupération de la configuration…');
                return getClientId();
            })
            .then(clientId => {
                if (!clientId) {
                    throw new Error('Missing Google client ID');
                }

                google.accounts.id.initialize({
                    client_id: clientId,
                    callback
                });

                setLoadingMessage('Initialisation de l\'interface…');
                renderButtons();
                observeButtons();
                isReady = true;
            });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('GoogleAuth init timeout')), timeout)
        );

        initPromise = Promise.race([initSequence, timeoutPromise]).catch(err => {
            console.error('GoogleAuth init error:', err);
            showEmailFallback();
            throw err;
        });

        return initPromise;
    }

    return {
        init,
        showEmailFallback
    };
})();

window.GoogleAuth = GoogleAuth;

