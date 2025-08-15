# Backend

## Environment variables

The backend uses `scripts/check-env.js` to ensure required configuration is present before the server starts.

### TLS configuration

In `production` mode the server expects `TLS_CERT_PATH` and `TLS_KEY_PATH` to start in HTTPS. Set `ALLOW_HTTP=true` to bypass this check and run the server over plain HTTP. This flag defaults to `false` and should only be used for development or testing.

## Anthropic recovery

If the connection to Anthropic fails, the service enters an offline mode. A background task periodically sends a lightweight heartbeat to the Anthropic API. When a heartbeat succeeds the service resets its offline flag, allowing normal AI requests to resume automatically.
