# 🛒 AlacenaApp

  <p align="left">
    <img src="https://shields.io" alt="React" />
    <img src="https://shields.io" alt="Vite" />
    <img src="https://shields.io" alt="Firebase" />
    <img src="https://shields.io" alt="PWA" />
    <img src="https://shields.io" alt="Claude API" />
  </p>

> Sistema inteligente y Progresivo (PWA) diseñado para la gestión integral de stock doméstico, división automática de gastos compartidos y planificación alimentaria mediante Inteligencia Artificial.

---

## 📌 Estado del Proyecto & Plan de Implementación
* **Última actualización:** Junio 2026
* **Fase Actual:** Sprint 1 en proceso de inicialización.

## ✅ Hitos Alcanzados

### 📋 Relevamiento y Diseño Arquitectónico
- [x] **Entrevista Estructurada:** Relevamiento técnico completo consolidado (v1.0).
- [x] **Definición de Stack:** Arquitectura basada en React (Vite) + Firebase Suite + Google Sheets Sync.
- [x] **Esquema de Datos:** Diseño definitivo de la base de datos Firestore (7 colecciones core).
- [x] **Seguridad:** Documentación de reglas de acceso granular y perímetros por `houseId`.
- [x] **Roadmap:** Planificación estratégica cerrada en 4 Sprints correlativos.

### 🔒 Decisiones Técnicas Confirmadas
- **Modelo de Usuarios:** Acceso cerrado y exclusivo para 2 usuarios vinculados (Tomas + Hermana).
- **Autenticación:** Google OAuth securizado mediante Firebase Auth de manera exclusiva.
- **Persistencia de Datos:** Firestore con soporte offline total mediante IndexedDB.
- **Motor de Recetas (IA):** Implementación nativa de Firebase Vertex AI.
- **Procesamiento de Comprobantes (OCR):** Extracción automatizada de facturas consumiendo Claude API mediante un proxy serverless seguro.
- **Internacionalización & Localización:** Soporte bilingüe integrado (ES / EN) con transacciones fijadas en Pesos Argentinos (ARS).

### 🧪 Validación de Prototipo (Beta)
- [x] Dashboard dinámico single-file con métricas de stock, gastos y balance de deudas cruzadas.
- [x] Flujo interactivo de simulación OCR validado con una factura real de Carrefour.
- [x] Módulo experimental de recomendación de recetas optimizado según el stock remanente.

---

## 🏗️ Estructura del Proyecto

```text
alacena-app/
├── public/
│   ├── manifest.json          # Configuración de Progressive Web App (PWA)
│   └── icons/                 # Recursos visuales adaptativos (192px / 512px)
├── src/
│   ├── db/
│   │   ├── firebase.js        # Inicialización de servicios y persistencia IndexedDB
│   │   ├── firebaseDb.js      # Controladores CRUD (getPurchases, addPurchase, etc.)
│   │   ├── dbProvider.js      # Enrutador estratégico (Producción vs Mocks locales)
│   │   └── __tests__/         # Suite de pruebas unitarias (Reglas de seguridad y Split)
│   ├── components/            # Componentes atómicos e interfaces globales
│   ├── pages/                 # Vistas funcionales encapsuladas (Dashboard, Stock, Recetas, etc.)
│   ├── App.jsx                # Orquestador de rutas y observador onAuthStateChanged
│   └── main.jsx
├── functions/                 # Firebase Cloud Functions (Middlewares / Backend)
│   ├── index.js               # Proxy de Claude API y sincronización webhook con Google Sheets
│   └── package.json
├── firestore.rules            # Reglas de seguridad declarativas por identificador de hogar
├── firebase.json              # Manifiesto de despliegue de Firebase Suite
├── .env.example               # Plantilla pública de variables de entorno requeridas
└── package.json
```

---

## 🗄️ Arquitectura del Modelo de Datos (Firestore)

El acceso a la información se encuentra estructurado en la raíz bajo la clave compuesta `/houses/{houseId}/`. Esto garantiza el aislamiento lógico de los datos de cada hogar de manera estricta.

<details>
<summary>📂 Ver Estructura del Árbol de Colecciones</summary>

```text
/houses/{houseId}/
  ├── members: [uid1, uid2]
  ├── name: "Casa Tomas"
  ├── inviteToken: "ABC123"  (Uso único, expiración en 24hs)
  ├── categories: [{id, name, emoji}]  (Taxonomía personalizable por hogar)
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
  │   └── breakdown[]         (Historial de movimientos y compensaciones)
  │
  └── notifications/{notifId}
      ├── type: "purchase" | "stock" | "debt"
      ├── targetUser, message
      ├── read: bool
      └── createdAt
```
</details>

---

## 🔐 Reglas de Seguridad (`firestore.rules`)

A continuación se detallan las directrices de seguridad implementadas a nivel de base de datos para restringir accesos no autorizados:

<details>
<summary>🔑 Ver Reglas de Firebase de AlacenaApp</summary>

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Bloqueo global por defecto
    match /{document=**} {
      allow read, write: if false;
    }

    match /houses/{houseId} {
      // Control de lectura y actualización restringido a miembros activos del nodo
      allow read, update: if request.auth != null
        && request.auth.uid in resource.data.members;

      // Permisión de creación de nuevos hogares a usuarios autenticados
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.members;

      // Aplicación de herencia de seguridad para subcolecciones jerárquicas y anidadas
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/\((database)/documents/houses/\)(houseId)).data.members;
      }

      match /{subcollection}/{docId}/{nested=**} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/\((database)/documents/houses/\)(houseId)).data.members;
      }
    }
  }
}
```
</details>

---

## 📦 Guía de Instalación y Despliegue (Sprint 1)

### 1. Inicialización de dependencias locales
```bash
# Clonar repositorio e ingresar al directorio raíz
git clone https://github.com
cd almacena

# Instalar el árbol de dependencias
npm install

# Instalar herramientas CLI globales de Firebase si no se poseen
npm install -g firebase-tools
```

### 2. Configuración de Entorno
Cree un archivo local de variables de entorno `.env.local` en la raíz siguiendo el esquema provisto en `.env.example`:

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 3. Ejecución en entorno de desarrollo
```bash
npm run dev
```

---

## 🛠️ Stack Tecnológico Utilizado
* **Frontend:** React 18, Vite, React Router DOM, Recharts (Módulo analítico).
* **Mobile / PWA:** `vite-plugin-pwa` para el soporte Offline First e instalación nativa.
* **Backend as a Service (BaaS):** Firebase Auth, Cloud Firestore, Cloud Storage, Firebase Hosting.
* **Serverless Computación:** Firebase Cloud Functions (Node.js).
* **Integraciones Core:** Anthropic Claude API (OCR parse) & Google Vertex AI (Recomendación semántica).
