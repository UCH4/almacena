// Cloudflare Worker — AI proxy (Workers AI + fallback Gemini) + Push Notifications
// Deploy: wrangler deploy
// wrangler.toml:
//   name = "almacena-gemini"
//   compatibility_date = "2025-01-01"
//   compatibility_flags = ["nodejs_compat"]
//   [ai]
//   binding = "AI"
//   [vars]
//   GEMINI_API_KEY = "tu-api-key"
//   VAPID_PRIVATE_KEY = "tu-clave-privada"
//   VAPID_PUBLIC_KEY = "tu-clave-publica"
//   PUSH_SUBJECT = "mailto:tu@email.com"

const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const GEMINI_MODEL = 'gemini-2.0-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Solo POST' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/push') {
      return handlePush(request, env, corsHeaders);
    }

    return handleAI(request, env, corsHeaders);
  }
};

const WORKERS_AI_MODELS = {
  'llama': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  'llama-light': '@cf/meta/llama-3.2-3b-instruct',
  'mistral': '@cf/mistral/mistral-7b-instruct-v0.1',
  'qwen': '@cf/qwen/qwen2.5-32b-instruct-awq',
};

async function handleAI(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { prompt, temperature, maxTokens, model } = body;

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try Workers AI first (free tier, 10k req/day)
    if (env.AI) {
      const modelName = WORKERS_AI_MODELS[model] || AI_MODEL;
      const response = await env.AI.run(modelName, {
        prompt,
        max_tokens: maxTokens ?? 2048,
        temperature: temperature ?? 0.7,
      });
      const text = response?.response || '';
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text }] } }]
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fallback to Gemini if Workers AI binding not available
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'No hay AI configurada. Configurá Workers AI o GEMINI_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await fetch(`${BASE_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxTokens ?? 2048
        }
      })
    });

    const data = await result.json();

    return new Response(JSON.stringify(data), {
      status: result.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ── WEB PUSH ──

async function handlePush(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { subscription, title, body: messageBody, url, tag } = body;

    if (!subscription || !title) {
      return new Response(JSON.stringify({ error: 'subscription y title requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = env.VAPID_PUBLIC_KEY || 'BE7SWh5rK8HZVQuxiyCmcRjeY3FCSackkJBx3ggR1fR9YSfo3T0GQ0dndGl7gQj7OGfygYdT2Go7ibUjhgkPrl8';
    const subject = env.PUSH_SUBJECT || 'mailto:admin@alacena.app';

    const payload = JSON.stringify({
      title,
      body: messageBody || '',
      url: url || '/',
      tag: tag || 'alacena',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: url || '/' }
    });

    const result = await sendWebPush(subscription, payload, vapidPublicKey, vapidPrivateKey, subject);

    return new Response(JSON.stringify({ success: true, statusCode: result.statusCode }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ── Web Push encryption using Web Crypto API ──

function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(base64 + padding), c => c.charCodeAt(0));
}

function base64UrlEncode(buf) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateVapidJWT(vapidPrivateKey, audience, subject) {
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const privateKey = await crypto.subtle.importKey(
    'raw', privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = { aud: audience, exp: now + 43200, sub: subject };
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(signingInput)
  );
  // ECDSA signature is DER-encoded by Web Crypto; push servers expect raw R||S (64 bytes)
  const sigBytes = new Uint8Array(signature);
  const rawSig = derToRawSig(sigBytes);
  const sigB64 = base64UrlEncode(rawSig);
  return `${signingInput}.${sigB64}`;
}

function derToRawSig(der) {
  // Convert DER-encoded ECDSA signature to raw R||S format (64 bytes)
  if (der[0] !== 0x30) throw new Error('Bad DER');
  let off = 2;
  const readInt = () => {
    if (der[off] !== 0x02) throw new Error('Bad DER int tag');
    const len = der[off + 1];
    let start = off + 2;
    let val = der.slice(start, start + len);
    if (val[0] === 0x00) val = val.slice(1); // strip leading zero
    off = start + len;
    return val;
  };
  const r = readInt();
  const s = readInt();
  const raw = new Uint8Array(64);
  raw.set(r.length <= 32 ? new Uint8Array(32 - r.length).fill(0).concat(r) : r.slice(-32), 0);
  raw.set(s.length <= 32 ? new Uint8Array(32 - s.length).fill(0).concat(s) : s.slice(-32), 32);
  return raw;
}

async function sendWebPush(subscription, payload, publicKey, privateKey, subject) {
  const endpoint = subscription.endpoint;
  const auth = base64UrlDecode(subscription.keys?.auth || '');
  const p256dh = base64UrlDecode(subscription.keys?.p256dh || '');

  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Generate ephemeral ECDH key pair
  const serverKey = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, ['deriveBits']
  );

  const serverPublicKey = await crypto.subtle.exportKey('raw', serverKey.publicKey);
  const serverPrivateKey = serverKey.privateKey;

  // Import client's public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw', p256dh,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  // Compute shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverPrivateKey,
    256
  );

  // Derive PRK: HMAC-SHA-256(key=auth_secret, msg=shared_secret) per RFC 8291
  const prk = await hkdf(auth, new Uint8Array(sharedSecret), encoder.encode('Content-Encoding: auth\0'), 32);

  // Derive Content Encryption Key (CEK) and Nonce
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  const infoCEK = createInfo('aesgcm', p256dh, serverPublicKey, 16);
  const cek = await hkdfExpand(prk, infoCEK, 16);

  const infoNonce = createInfo('aesgcm', p256dh, serverPublicKey, 12);
  const nonce = await hkdfExpand(prk, infoNonce, 12);

  // Encrypt payload with AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const padding = new Uint8Array(2); // 2-byte padding delimiter: 0x00, 0x00 (no padding)
  const plaintext = new Uint8Array(padding.length + payloadBytes.length);
  plaintext.set(padding, 0);
  plaintext.set(payloadBytes, padding.length);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    aesKey,
    plaintext
  );

  const ciphertext = new Uint8Array(encrypted);
  const tag = ciphertext.slice(-16);
  const ct = ciphertext.slice(0, -16);

  // Build aes128gcm record: salt (16) + record size (4) + server public key (65 uncompressed) + ct + tag
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, ct.length + tag.length, false); // encrypted block size (excl. header)

  // Convert server public key to uncompressed format (0x04 + x + y)
  // Web Crypto exports raw P-256 as 64 bytes (x || y). We need 0x04 prefix.
  const uncompressedKey = new Uint8Array(65);
  uncompressedKey[0] = 0x04;
  uncompressedKey.set(new Uint8Array(serverPublicKey), 1);

  const record = new Uint8Array(salt.length + recordSize.length + uncompressedKey.length + ct.length + tag.length);
  record.set(salt, 0);
  record.set(recordSize, salt.length);
  record.set(uncompressedKey, salt.length + recordSize.length);
  record.set(ct, salt.length + recordSize.length + uncompressedKey.length);
  record.set(tag, salt.length + recordSize.length + uncompressedKey.length + ct.length);

  // Generate VAPID JWT for authorization
  const jwt = await generateVapidJWT(privateKey, new URL(endpoint).origin, subject);
  const vapidPublicKeyB64 = base64UrlEncode(base64UrlDecode(publicKey)); // normalize

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Authorization': `WebPush ${jwt}`,
      'Crypto-Key': `p256ecdsa=${vapidPublicKeyB64}`
    },
    body: record
  });

  return { statusCode: response.status };
}

async function hkdf(salt, ikm, info, length) {
  // Extract
  const extractKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', extractKey, ikm);
  // Expand
  return hkdfExpand(new Uint8Array(prk), info, length);
}

async function hkdfExpand(prk, info, length) {
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  let result = new Uint8Array(0);
  let T = new Uint8Array(0);
  const counterMax = Math.ceil(length / 32);
  for (let i = 1; i <= counterMax; i++) {
    const input = new Uint8Array(T.length + info.length + 1);
    input.set(T, 0);
    input.set(info, T.length);
    input[T.length + info.length] = i;
    const sig = await crypto.subtle.sign('HMAC', prkKey, input);
    T = new Uint8Array(sig);
    const combined = new Uint8Array(result.length + T.length);
    combined.set(result, 0);
    combined.set(T, result.length);
    result = combined;
  }
  return result.slice(0, length);
}

function createInfo(contentEncoding, clientPublicKey, serverPublicKey, length) {
  const prefix = encoder => {
    const enc = new TextEncoder();
    const parts = [
      enc.encode(`Content-Encoding: ${contentEncoding}\0`),
      new Uint8Array([0x01]), // P-256
    ];
    const clientLen = new Uint8Array(2);
    new DataView(clientLen.buffer).setUint16(0, clientPublicKey.length, false);
    parts.push(clientLen, clientPublicKey);
    const serverLen = new Uint8Array(2);
    new DataView(serverLen.buffer).setUint16(0, serverPublicKey.length, false);
    parts.push(serverLen, serverPublicKey);
    return parts;
  };
  // Build the info byte array
  const enc = new TextEncoder();
  const parts = prefix(enc);
  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const p of parts) {
    result.set(p, off);
    off += p.length;
  }
  return result;
}
