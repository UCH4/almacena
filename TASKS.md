# 🏠 AlacenaApp — Task List

> **Regla:** 1 paso a la vez. No avanzar hasta que el paso actual esté verificado.
> Última actualización: 2026-06-22

---

## 🔴 Paso 1 — Arreglar Gastos.jsx (crashea al sincronizar)

**Problema:** `handleSyncNow()` y `handleExportPurchases()` usan variables `otherName`, `otherUid`, `i.userAmt`, `i.otherAmt` que no existen. Crashea la app.

**Archivos:** `src/pages/Gastos.jsx`

**TODO:**
- [x] Definir `otherUid` y `otherName` en el scope del componente
- [x] Reemplazar `i.userAmt`/`i.otherAmt` por `i.byMember[currentUid]`/`i.byMember[otherUid]`
- [x] Reemplazar monthlySummary `userAmt`/`otherAmt` por `membersPaid[uid]`
- [x] Verificar que no crashea al renderizar

---

## 🔴 Paso 2 — Arreglar Dashboard.jsx ($$ doble + mes hardcodeado)

**Problema:** Doble signo `$$` en balance. `CURRENT_MONTH_INDEX` fijo en 5. Subtítulo dice "Junio 2026" siempre.

**Archivos:** `src/pages/Dashboard.jsx`

**TODO:**
- [x] Sacar `$` extra en línea del balance
- [x] Hacer `CURRENT_MONTH_INDEX = new Date().getMonth()`
- [x] Hacer año dinámico en subtitle
- [x] Hacer `getChartDataMes()` use meses hasta el actual

---

## 🔴 Paso 3 — Push: worker no cifra payloads ni firma JWT

**Problema:** `encryptPayload()` retorna texto plano. `sendWebPush()` no firma VAPID JWT. Chrome/Firefox rechazan el push.

**Archivos:** `functions/gemini-worker.js`

**TODO:**
- [x] Implementar ECDH key agreement con Web Crypto API
- [x] Implementar HKDF key derivation
- [x] Implementar AES-128-GCM encryption
- [x] Implementar firma JWT ES256 VAPID
- [x] Fix: HKDF salt/ikm estaban invertidos
- [x] Fix: record_size tenía +16 extra

---

## 🟠 Paso 4 — Push: guardar subscripción desde Notificaciones.jsx

**Problema:** Al activar push desde la página de Notificaciones, se llama `subscribeUser()` pero nunca `saveSubscriptionToFirestore()`.

**Archivos:** `src/pages/Notificaciones.jsx`

**TODO:**
- [x] Importar `saveSubscriptionToFirestore` y `dbProvider`
- [x] Llamar `saveSubscriptionToFirestore()` después de `subscribeUser()`

---

## 🟠 Paso 5 — firebaseDb.js: products listener sin hasPendingWrites

**Problema:** `subscribeToProducts()` no chequea `hasPendingWrites`, puede causar loops.

**Archivos:** `src/db/firebaseDb.js`

**TODO:**
- [x] Agregar `includeMetadataChanges: true` al query
- [x] Agregar `if (snapshot.metadata.hasPendingWrites) return;`

---

## 🟠 Paso 6 — Stock.jsx: hardcoded consumers

**Problema:** `useState({ T: true, S: true })` no se adapta a miembros dinámicos.

**Archivos:** `src/pages/Stock.jsx`

**TODO:**
- [x] Inicializar `consumers` como objeto vacío `{}`
- [x] Se completa al abrir modal con `house.members`

---

## 🟠 Paso 7 — Dashboard: CURRENT_MONTH_INDEX dinámico

**Problema:** Fijo a Junio. En meses futuros muestra datos incorrectos.

**Archivos:** `src/pages/Dashboard.jsx`

**TODO:**
- [x] `CURRENT_MONTH_INDEX = new Date().getMonth()`
- [x] `getChartDataMes()` slice dinámico
- [x] Año dinámico en subtitle

---

## 🟡 Paso 8 — Push: permission automático en App.jsx

**Problema:** Pide permiso a los 3 segundos de cargar la app sin contexto UX.

**Archivos:** `src/App.jsx`

**TODO:**
- [x] Solo subscribir si `Notification.permission === 'granted'`
- [x] No llamar `requestPermission()` automáticamente

---

## 🟡 Paso 9+ — Mejoras secundarias ✅

- [x] Wire Zod validation en forms
- [x] guessCategory() agregar detección bebidas
- [x] Compras.jsx duplicado Día detection
- [x] Accesibilidad: toasts sin role="alert"
- [x] Inconsistencia mockDb vs Firebase deleteProduct (soft-delete)
- [x] _writeAuditEntry no silencia errores
- [x] AdBanner feedback si share + clipboard fallan
- [x] Más datos de prueba: 7 compras, 18 productos, 5 tickets
- [x] Workers AI reemplaza Gemini (10k req/día gratis, Llama 3.3 70B)

## 🔵 Pendientes

- [ ] Verificar push notifs con browser real
- [ ] Budget por categoría
- [ ] Filtro de búsqueda en Stock (similar a Compras)
- [ ] Exportar/importar datos (JSON)
- [ ] Modo oscuro
- [ ] Tests multi-member edge cases
- [ ] Traducción EN/ES
- [ ] Optimizar índices Firestore

## 🚀 Meta final ✅

- [x] Commit y push a git
- [x] `firebase deploy --only hosting`
- [x] `wrangler deploy` con secrets VAPID + Workers AI
