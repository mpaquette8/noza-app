# Backend

## Environment variables

The backend uses `scripts/check-env.js` to ensure required configuration is present before the server starts.

### TLS configuration

In `production` mode the server expects `TLS_CERT_PATH` and `TLS_KEY_PATH` to start in HTTPS. Set `ALLOW_HTTP=true` to bypass this check and run the server over plain HTTP. This flag defaults to `false` and should only be used for development or testing.
