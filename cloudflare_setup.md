# Configuración Cloudflare Worker para Gemini Proxy

## Por qué

Firebase Cloud Functions requiere plan Blaze (tarjeta de crédito).  
Cloudflare Workers tiene un tier gratis generoso (100k requests/día, sin tarjeta).

## 1. Prerrequisitos

- Cuenta en Cloudflare (gratis en https://dash.cloudflare.com/sign-up)
- Node.js 18+
- `npm install -g wrangler`

## 2. Deploy del Worker

```bash
# Ir a la carpeta functions
cd functions

# Iniciar sesión en Cloudflare
wrangler login

# Configurar wrangler.toml (crear si no existe)
cat > wrangler.toml << 'EOF'
name = "almacena-gemini"
compatibility_date = "2025-01-01"

[vars]
GEMINI_API_KEY = "aca-va-tu-api-key-de-gemini"
EOF

# Deploy
wrangler deploy gemini-worker.js
```

## 3. Configurar la app

Una vez deployado, Cloudflare te da una URL tipo:  
`https://almacena-gemini.tu-nombre.workers.dev`

Agregala al `.env` del frontend:

```env
VITE_GEMINI_PROXY_URL=https://almacena-gemini.tu-nombre.workers.dev
```

**No commits** (`.env` está en `.gitignore`).

## 4. Seguridad (opcional pero recomendada)

Para evitar que cualquiera use tu worker, agregá un token de autenticación:

En `wrangler.toml`:
```toml
[vars]
GEMINI_API_KEY = "..."
AUTH_TOKEN = "un-token-secreto"
```

En `gemini-worker.js`, al inicio de `fetch`:
```js
const auth = request.headers.get('X-Auth-Token');
if (auth !== env.AUTH_TOKEN) {
  return new Response('Unauthorized', { status: 401 });
}
```

En `gemini.js` del frontend:
```js
headers: {
  'Content-Type': 'application/json',
  'X-Auth-Token': import.meta.env.VITE_GEMINI_AUTH_TOKEN
}
```

## 5. Verificar

```bash
curl -X POST https://almacena-gemini.tu-nombre.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Decime hola en JSON: {\"msg\":\"...\"}"}'
```

## 6. Costos

- Cloudflare Workers gratis: 100,000 requests/día  
- Gemini 2.0 Flash gratis: 1,500 requests/día  
- Firestore gratis: 50,000 lecturas, 20,000 escrituras/día  
- Firebase Auth gratis: 50,000 usuarios activos  

El sistema corre completamente en tiers gratuitos.
