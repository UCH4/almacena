# AlacenaApp — Estado del Proyecto & Plan de Implementación
> **Última actualización:** Junio 2026 · Sprint 1 listo para arrancar

---

## ✅ Qué ya está listo

### Relevamiento y diseño
- [x] Relevamiento completo con entrevista estructurada (doc Word v1.0)
- [x] Stack tecnológico definido y justificado
- [x] Modelo de datos Firestore diseñado (7 colecciones)
- [x] Arquitectura de seguridad documentada
- [x] Roadmap de 4 sprints aprobado

### Decisiones bloqueadas (todas confirmadas)
- [x] **Usuarios:** 2 fijos (Tomas + Hermana)
- [x] **Auth:** Google OAuth exclusivo vía Firebase Auth
- [x] **Base de datos:** Firestore con persistence offline (IndexedDB)
- [x] **IA recetas:** Firebase Vertex AI (no Claude API)
- [x] **IA OCR facturas:** Claude API únicamente (proxy serverless)
- [x] **Moneda:** ARS fija
- [x] **Sheets:** Se crea desde cero con estructura definida
- [x] **Categorías:** Personalizables por hogar
- [x] **Historial de deudas:** Completo
- [x] **Offline support:** Sí
- [x] **Notificaciones:** Push + alertas (stock bajo, compra nueva, deuda pendiente)
- [x] **Idiomas:** ES / EN
- [x] **Deploy:** Firebase Hosting o Vercel (el dev lo hace solo)
- [x] **Frontend:** React + Vite + PWA instalable

### Demo beta validada
- [x] HTML single-file funcional con datos de ejemplo
- [x] Flujo OCR simulado (upload → extracción IA → revisión → confirmación)
- [x] Demo de OCR real con factura de Carrefour del 04/06/2026
- [x] Dashboard con gráficos, stock, gastos y deudas
- [x] Módulo de recetas con descuento de stock

### Documentación generada
- [x] `AlacenaApp_Relevamiento_v1.0.docx` — arquitectura completa
- [x] `google_sheets_setup.md` — webhook bidireccional con Apps Script
- [x] `alacena-beta.html` — demo interactiva

---

## 🏗️ Estructura del proyecto (a crear en Sprint 1)

```
alacena-app/
├── public/
│   ├── manifest.json          # PWA config
│   └── icons/                 # Íconos 192px y 512px
├── src/
│   ├── db/
│   │   ├── firebase.js        # Init Firebase + Auth + Firestore offline
│   │   ├── firebaseDb.js      # Métodos reales: getPurchases, addPurchase, etc.
│   │   ├── dbProvider.js      # Router: Firebase en prod, mock en local
│   │   └── __tests__/
│   │       ├── splitLogic.test.js
│   │       └── securityRules.test.js
│   ├── components/
│   │   ├── Login.jsx          # Google Sign-In
│   │   └── HouseSetup.jsx     # Crear casa / unirse con código
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Compras.jsx
│   │   ├── Stock.jsx          # Categorías dinámicas desde Firestore
│   │   ├── Gastos.jsx
│   │   ├── Recetas.jsx        # Vertex AI + Plan alimentario semanal
│   │   └── Notificaciones.jsx
│   ├── App.jsx                # onAuthStateChanged + routing
│   └── main.jsx
├── functions/                 # Firebase Functions (Node.js)
│   ├── index.js               # Proxy Claude API + syncSheetsStock
│   └── package.json
├── firestore.rules            # Reglas de seguridad por houseId
├── firebase.json
├── .env.local                 # Variables de entorno (NO commitear)
├── .env.example               # Template sin secrets
├── vite.config.js
└── package.json
```

---

## 🗄️ Modelo de datos Firestore

### Estructura raíz (seguridad por `houseId`)

```
/houses/{houseId}/
  ├── members: [uid1, uid2]
  ├── name: "Casa Tomas"
  ├── inviteToken: "ABC123"  (1 uso, expira 24hs)
  ├── categories: [{id, name, emoji}]  (personalizables)
  │
  ├── products/{productId}
  │   ├── name, category, unit
  │   ├── stockCurrent, stockMin
  │   ├── consumers: ["uid1","uid2"]
  │   └── isShared: bool
  │
  ├── purchases/{purchaseId}
  │   ├── uploadedBy (uid), date, totalAmount
  │   ├── receiptUrl (Firebase Storage)
  │   ├── status: "pending" | "confirmed"
  │   └── items/
  │       └── {itemId}
  │           ├── productRef, quantity, unit
  │           ├── unitPrice, totalPrice
  │           ├── consumers[], splitRatio
  │           └── hasDiscount, discountAmount
  │
  ├── balances/{balanceId}
  │   ├── fromUser, toUser
  │   ├── amount, currency: "ARS"
  │   ├── updatedAt, settledAt
  │   └── breakdown[]         (historial completo)
  │
  └── notifications/{notifId}
      ├── type: "purchase"|"stock"|"debt"
      ├── targetUser, message
      ├── read: bool
      └── createdAt
```

---

## 🔐 Seguridad — archivo `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Nadie puede leer/escribir fuera de /houses/
    match /{document=**} {
      allow read, write: if false;
    }

    match /houses/{houseId} {
      // Solo miembros de la casa pueden leer el documento de la casa
      allow read: if request.auth != null
        && request.auth.uid in resource.data.members;

      // Solo miembros pueden actualizar (no crear ni borrar casas libremente)
      allow update: if request.auth != null
        && request.auth.uid in resource.data.members;

      // Cualquier usuario autenticado puede crear una casa nueva
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.members;

      // Todas las subcolecciones: solo miembros de la casa
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/houses/$(houseId)).data.members;
      }

      match /{subcollection}/{docId}/{nested=**} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/houses/$(houseId)).data.members;
      }
    }
  }
}
```

---

## 📦 Sprint 1 — Tareas concretas

### Paso 1 · Setup inicial del proyecto

```bash
# Crear proyecto
npm create vite@latest alacena-app -- --template react
cd alacena-app

# Dependencias principales
npm install firebase
npm install react-router-dom
npm install recharts          # gráficos
npm install -D vite-plugin-pwa

# Firebase CLI (global)
npm install -g firebase-tools
firebase login
firebase init                 # Firestore + Functions + Hosting
```

### Paso 2 · Variables de entorno

Crear `.env.local` (nunca commitear):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Crear `.env.example` (sí commitear, sin valores):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Paso 3 · `src/db/firebase.js`

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Offline persistence (IndexedDB)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence: múltiples tabs abiertas');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence: navegador no compatible');
  }
});
```

### Paso 4 · `src/db/firebaseDb.js` (métodos principales)

```javascript
import {
  collection, doc, addDoc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const housePath = (houseId) => `houses/${houseId}`;

// Compras — escucha en tiempo real
export const subscribePurchases = (houseId, callback) => {
  const q = query(
    collection(db, housePath(houseId), 'purchases'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// Agregar compra
export const addPurchase = async (houseId, purchase) => {
  return addDoc(
    collection(db, housePath(houseId), 'purchases'),
    { ...purchase, createdAt: serverTimestamp() }
  );
};

// Productos — escucha en tiempo real
export const subscribeProducts = (houseId, callback) => {
  const q = query(collection(db, housePath(houseId), 'products'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// Descontar stock
export const consumeProduct = async (houseId, productId, amount) => {
  const ref = doc(db, housePath(houseId), 'products', productId);
  return updateDoc(ref, {
    stockCurrent: increment(-amount),
    updatedAt: serverTimestamp()
  });
};

// Balance
export const subscribeBalances = (houseId, callback) => {
  const q = query(collection(db, housePath(houseId), 'balances'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};
```

### Paso 5 · `src/components/Login.jsx`

```jsx
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../db/firebase';

export default function Login() {
  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged en App.jsx toma el control
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <div className="login-screen">
      <h1>🏠 AlacenaApp</h1>
      <p>Gestioná tu alacena con tu hermana</p>
      <button onClick={handleGoogle}>
        Iniciar sesión con Google
      </button>
    </div>
  );
}
```

### Paso 6 · `src/components/HouseSetup.jsx` (código de invitación)

```jsx
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../db/firebase';
import { nanoid } from 'nanoid'; // npm install nanoid

export default function HouseSetup({ onReady }) {
  const createHouse = async (name) => {
    const houseId  = nanoid(10);
    const token    = nanoid(6).toUpperCase(); // Token de 6 chars
    const uid      = auth.currentUser.uid;
    const expires  = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hs

    await setDoc(doc(db, 'houses', houseId), {
      name,
      members:     [uid],
      inviteToken: token,
      tokenExpiry: expires,
      createdAt:   new Date(),
      categories: [
        { id:'lacteos',   name:'Lácteos',   emoji:'🥛' },
        { id:'carnes',    name:'Carnes',     emoji:'🥩' },
        { id:'verduras',  name:'Verduras',   emoji:'🥦' },
        { id:'despensa',  name:'Despensa',   emoji:'🧂' },
        { id:'bebidas',   name:'Bebidas',    emoji:'🧃' },
        { id:'limpieza',  name:'Limpieza',   emoji:'🧹' },
      ],
    });

    // Guardar houseId en perfil del usuario
    await setDoc(doc(db, 'users', uid), { houseId }, { merge: true });
    onReady(houseId);
  };

  const joinHouse = async (token) => {
    // Buscar casa por token (Cloud Function para evitar exposición)
    const res = await fetch('/api/joinHouse', {
      method: 'POST',
      body: JSON.stringify({ token, uid: auth.currentUser.uid }),
      headers: { 'Content-Type': 'application/json' },
    });
    const { houseId } = await res.json();
    onReady(houseId);
  };

  // ... render del formulario
}
```

### Paso 7 · Firebase Functions (proxy seguro)

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');

admin.initializeApp();

// Proxy OCR — Claude API nunca expuesta al frontend
exports.ocrReceipt = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated');

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: data.mediaType, data: data.imageBase64 } },
        { type: 'text', text: `Extraé los ítems de esta factura y devolvé SOLO un JSON con este esquema exacto, sin texto adicional:
{
  "storeName": string,
  "date": "DD/MM/YYYY",
  "items": [{ "nombre": string, "qty": number, "unit": string, "unitPrice": number, "totalPrice": number, "hasDiscount": bool, "discountAmount": number }],
  "totalAmount": number
}` }
      ]
    }]
  });

  const text = response.content[0].text;
  return JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
});

// Sync desde Google Sheets → Firestore
exports.syncSheetsStock = functions.https.onRequest(async (req, res) => {
  const { houseId, productName, stock } = req.body;
  if (!houseId || !productName) return res.status(400).send('Bad request');

  const snap = await admin.firestore()
    .collection(`houses/${houseId}/products`)
    .where('name', '==', productName)
    .limit(1)
    .get();

  if (!snap.empty) {
    await snap.docs[0].ref.update({ stockCurrent: Number(stock) });
    res.send({ ok: true });
  } else {
    res.status(404).send('Product not found');
  }
});
```

---

## 📊 Google Sheets — Setup completo

### Plantilla
Copiá esta plantilla a tu Google Drive:
[Abrir y Copiar Plantilla AlacenaApp](https://docs.google.com/spreadsheets/d/1vH_J7k-O-lT9_Nisb-qX9D0q-X6y430t6fG48eXyL0U/copy)

### Estructura de hojas

**Hoja `Compras`**

| Col A | Col B | Col C | Col D | Col E | Col F |
|-------|-------|-------|-------|-------|-------|
| Fecha (DD/MM/YYYY) | Comercio | Comprador | Cant. Ítems | Monto Total | Estado |

**Hoja `Inventario`**

| Col A | Col B | Col C | Col D |
|-------|-------|-------|-------|
| Producto | Categoría | Stock Actual | Stock Mínimo |

### Apps Script (webhook bidireccional)
En la planilla: **Extensiones → Apps Script** → pegá y configurá el script del archivo `google_sheets_setup.md`.

Variables a reemplazar:
- `TU_PROJECT_ID_AQUÍ` → ID de tu proyecto Firebase (ej: `alacena-app-12345`)
- `TU_HOUSE_ID_AQUÍ` → ID del hogar (visible en la URL de la app tras hacer login)

---

## 🚀 Roadmap actualizado

| Sprint | Duración | Módulos | Estado |
|--------|----------|---------|--------|
| **Sprint 1** | 2 sem | Firebase init, Auth Google, Firestore rules, estructura base, OCR proxy | 🟡 **Listo para arrancar** |
| **Sprint 2** | 2 sem | Compras + OCR completo, Stock, División de gastos, Balance | ⬜ Pendiente |
| **Sprint 3** | 2 sem | Dashboard + gráficos, Sync Sheets, FCM notificaciones, i18n ES/EN | ⬜ Pendiente |
| **Sprint 4** | 2 sem | Vertex AI recetas + plan alimentario, PWA instalable, tests de seguridad | ⬜ Pendiente |

---

## ⚠️ Puntos abiertos resueltos

| # | Pregunta | Respuesta |
|---|----------|-----------|
| PA1 | ¿Moneda? | ARS fija |
| PA2 | ¿Sheets nuevo o existente? | Nuevo, con estructura definida en este doc |
| PA3 | ¿Soporte offline? | Sí — IndexedDB persistence |
| PA4 | ¿Categorías fijas o personalizables? | Personalizables por hogar |
| PA5 | ¿Historial de deudas? | Sí, historial completo con breakdown |
| PA6 | ¿Crear casa con código de invitación? | Sí — token de 6 chars, 1 uso, expira 24hs |
| PA7 | ¿IA recetas = Vertex AI? | Sí, Firebase Vertex AI (no Claude API) |
| PA8 | ¿Plan alimentario semanal? | Sí — Lunes a Domingo, Desayuno/Almuerzo/Cena |

---

## 🔑 Comandos de referencia rápida

```bash
# Desarrollo local
npm run dev

# Ver reglas de Firestore antes de subir
firebase firestore:rules:get

# Deploy de reglas
firebase deploy --only firestore:rules

# Deploy de funciones
firebase deploy --only functions

# Deploy completo
firebase deploy

# Build de producción
npm run build

# Preview del build
firebase hosting:channel:deploy preview
```

---

## 📁 Archivos entregados hasta hoy

| Archivo | Descripción |
|---------|-------------|
| `AlacenaApp_Relevamiento_v1.0.docx` | Documento técnico completo de arquitectura |
| `alacena-beta.html` | Demo funcional single-file |
| `google_sheets_setup.md` | Webhook Apps Script + estructura de columnas |
| `AlacenaApp_Estado_Sprint1.md` | **Este archivo** — estado y plan de implementación |

---

*Generado por Claude · AlacenaApp · Junio 2026*
