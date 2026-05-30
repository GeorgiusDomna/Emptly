# Dev TLS certificates

Self-signed certificates for local `https` / `wss` testing. **Do not use in production.**

Generate:

```bash
cd server
npm run certs:dev
```

Then start the server with TLS:

```bash
npm run dev:secure
```

Set matching URLs in `client/.env`:

```env
VITE_WS_URL=wss://localhost:5001/ws
VITE_HEALTH_URL=https://localhost:5001/health
```

Open `https://localhost:5001/health` once in the browser and accept the self-signed certificate so WebSocket and health checks succeed.
