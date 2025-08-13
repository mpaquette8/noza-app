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
    let initialized = false;
    let initPromise = null;

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
            message.textContent = 'Connexion par e-mail disponible';
            message.className = 'google-auth-fallback';
            container.insertAdjacentElement('afterend', message);
        });
    }

    async function init(callback = () => {}, timeout = 5000) {
        if (initialized) return;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            const initSequence = (async () => {
                await loadSdk();

                const res = await fetch('/api/config/google');
                const data = await res.json();

                if (!data.client_id) {
                    throw new Error('Missing Google client_id');
                }

                google.accounts.id.initialize({
                    client_id: data.client_id,
                    callback,
                });

                initialized = true;
                state = STATES.READY;
            })();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('GoogleAuth init timeout')), timeout)
            );

            try {
                await Promise.race([initSequence, timeoutPromise]);
            } catch (err) {
                console.error('GoogleAuth init error:', err);
                state = STATES.FAILED;
                showEmailFallback();
                throw err;
            }
        })();

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

    return {
        init,
        promptLogin,
        disableAutoSelect,
        STATES,
        get state() {
            return state;
        }
    };
})();

window.GoogleAuth = GoogleAuth;
