# AlacenaApp — Technical Reference

Collaborative household inventory, expense tracking, and cost-splitting PWA.

**Stack:** React 19 · Vite 8 · Firebase Firestore + Auth (Spark) · Cloudflare Workers · Workers AI (Llama 3.3 70B) · Web Push API

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (PWA)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ React 19 │  │  Zod     │  │ IndexedDB│  │ Service    │ │
│  │ (Vite)   │  │validation│  │ (cache)  │  │ Worker     │ │
│  └────┬─────┘  └──────────┘  └────┬─────┘  │ (push +    │ │
│       │                            │        │  offline)  │ │
│       └────────────────────────────┘        └────────────┘ │
│                         │                                    │
│                    Firestore SDK ←──── persistentCache ────→│
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴────────────┐
              │                        │
     ┌────────▼────────┐     ┌─────────▼──────────┐
     │  Firebase        │     │  Firebase Auth      │
     │  Firestore       │     │  (Google OAuth)     │
     │  (Spark Plan)    │     └────────────────────┘
     └────────┬────────┘
              │
     ┌────────▼────────┐     ┌───────────────────────┐
     │  Cloudflare      │     │  Workers AI           │
     │  Worker          │◄────│  (Llama 3.3 70B)     │
     │  (gemini-worker) │     │  Fallback: Gemini     │
     │  /push           │     └───────────────────────┘
     │  /               │
     └─────────────────┘
```

**Key constraint:** Zero cloud-function dependencies. Firebase Spark plan prohibits Cloud Functions, so all server-side logic runs on Cloudflare Workers (free tier: 100k req/day).

---

## Architecture Decision Records

### ADR-1: No Firebase Cloud Functions
- **Context:** Firebase Spark plan has no Cloud Functions; Blaze requires a credit card.
- **Decision:** All server-side logic (AI proxy, push encryption) runs on a single Cloudflare Worker.
- **Trade-off:** Worker has 10ms CPU time per request on free tier; push encryption + JWT signing fits within this budget.

### ADR-2: Web Push API over FCM
- **Context:** FCM requires a Firebase Cloud Function or a third-party server to send messages.
- **Decision:** Custom implementation using Web Push API + VAPID + Cloudflare Worker. Payload encryption uses native Web Crypto API (ECDH + HKDF + AES-128-GCM).
- **Trade-off:** More code to maintain vs. FCM's managed service, but zero cost and no vendor lock-in.

### ADR-3: Workers AI over Gemini
- **Context:** Need AI-powered features (recipe suggestions, meal planning) at zero cost.
- **Decision:** Workers AI (Llama 3.3 70B) as primary, Gemini 2.0 Flash as fallback via same proxy endpoint.
- **Trade-off:** Llama 70B has different response characteristics than Gemini; frontend formats prompts for both.

### ADR-4: Multi-member balance without schema migration
- **Context:** Original schema used two hardcoded members (`T`, `S`). Needed to support N members.
- **Decision:** The `consumidores` array always supported N members; only UI and balance calculation logic needed generalization.
- **Trade-off:** Legacy `getBalances()` still hardcodes two users; use `computeFullBalanceFromPurchases()` for N-member support.

### ADR-5: Invite code lookup via dedicated collection
- **Context:** Security rules cannot do collection-group queries efficiently. Scanning all `houses` docs for an `inviteCode` field is expensive and insecure.
- **Decision:** Dedicated `inviteCodes/{code}` collection with public read-for-authenticated-users rule. House document no longer needs to be readable by non-members.
- **Trade-off:** Extra write on house creation (write to both `houses` and `inviteCodes`). At-most-once semantics acceptable for this operation.

---

## Data Model

### Firestore Collections

```
users/{uid}
  ├── uid: string
  ├── displayName: string
  ├── email: string
  ├── photoURL: string
  ├── nickname: string
  ├── emoji: string
  ├── houseIds: string[]          ← houses this user belongs to
  ├── activeHouseId: string
  ├── age: number?
  ├── birthDate: string?
  └── updatedAt: Timestamp

houses/{houseId}
  ├── id: string
  ├── name: string
  ├── inviteCode: string
  ├── owner: string               ← uid
  ├── members: string[]           ← [uid1, uid2, ...]
  ├── membersInfo: { [uid]: { name, photo?, emoji?, nickname?, age? } }
  ├── categories: string[]        ← e.g. ['lácteos', 'carnes', ...]
  ├── monthlyBalances: {
  │     "YYYY-MM": {
  │       totalSpent: number,
  │       byMember: { [uid]: { paid, shouldPay, settlementsOut, settlementsIn } }
  │     }
  │   }
  ├── sheetUrl: string?
  ├── webhookUrl: string?
  ├── mealPlan: object?
  └── createdAt: Timestamp

houses/{houseId}/purchases/{purchaseId}
  ├── fecha: string               ← DD/MM/YYYY
  ├── comercio: string
  ├── quien: string               ← uid (who paid)
  ├── total: number
  ├── estado: 'pendiente' | 'confirmada' | 'anulada'
  ├── isSettlement: boolean?
  ├── items: Array<{
  │     nombre: string,
  │     qty: number,
  │     unit: string,
  │     precio: number,           ← unit price
  │     consumidores: string[],   ← [uid, ...]
  │     shared: boolean
  │   }>
  ├── _editedBy: { uid, displayName }?
  └── createdAt: Timestamp

houses/{houseId}/products/{productId}
  ├── nombre: string
  ├── cat: string                 ← category name
  ├── unit: string
  ├── stock: number
  ├── minStock: number
  ├── consumidores: string[]
  ├── _deleted: boolean?
  ├── _editedBy: { uid, displayName }?
  └── createdAt: Timestamp

houses/{houseId}/products/{productId}/stockMovements/{movementId}
  ├── type: 'add' | 'consume'
  ├── amount: number
  ├── unit: string
  ├── previousStock: number
  ├── newStock: number
  ├── userId: string
  ├── userName: string
  ├── source: { type: 'purchase'|'recipe'|'manual', id: string? }
  └── timestamp: Timestamp

houses/{houseId}/notifications/{notificationId}
  ├── tipo: 'stock' | 'deuda' | 'push'
  ├── icon: string
  ├── titulo: string
  ├── msg: string
  ├── leida: boolean
  ├── time: string
  └── createdAt: Timestamp

houses/{houseId}/pushSubscriptions/{userId}
  ├── subscription: PushSubscriptionJSON
  ├── userId: string
  └── updatedAt: Timestamp

houses/{houseId}/auditLog/{logId}
  ├── action: 'create' | 'update' | 'delete' | 'leave'
  ├── entityType: 'house' | 'purchases' | 'products' | 'notifications' | 'settlement'
  ├── entityId: string
  ├── userId: string
  ├── userName: string
  ├── summary: string
  └── timestamp: Timestamp

inviteCodes/{code}
  ├── houseId: string
  ├── houseName: string?
  └── createdAt: Timestamp
```

### Indexes

| Collection | Fields | Purpose |
|---|---|---|
| `houses/{hid}/purchases` | `createdAt DESC` | Purchase history (default) |
| `houses/{hid}/notifications` | `tipo ASC, leida ASC` | Unread stock alerts |

---

## Component Architecture

### Layered Dependency Graph

```
App.jsx
  ├── hooks/                          ← State management & side effects
  │   ├── useAuth.js                  ← Firebase auth state listener
  │   ├── useHouse.js                 ← House CRUD, house switching
  │   ├── useDataSync.js              ← Firestore subscriptions lifecycle
  │   ├── useBalances.js              ← Balance computation (memoized)
  │   ├── useToast.js                 ← Toast notification queue
  │   └── usePushInit.js             ← Push subscription init
  ├── pages/                          ← Route-level components
  │   ├── Dashboard.jsx               ← KPIs, chart, low-stock alerts
  │   ├── Compras.jsx                 ← Purchase CRUD + OCR + search/filter
  │   ├── Stock.jsx                   ← Product CRUD + categories
  │   ├── Gastos.jsx                  ← Multi-member balance table + CSV
  │   ├── Recetas.jsx                 ← AI recipe generation + meal plan
  │   ├── Notificaciones.jsx          ← Notification list + push config
  │   └── Actividad.jsx               ← Real-time audit log
  └── components/                     ← Reusable UI
      ├── Sidebar.jsx
      ├── MobileTabs.jsx
      ├── Login.jsx / ProfileSetup.jsx / HouseSetup.jsx
      ├── AdBanner.jsx
      ├── ConnectivityIndicator.jsx
      ├── ErrorBoundary.jsx
      ├── LoadingSkeleton.jsx
      └── UpdateBanner.jsx

services/                            ← Pure business logic
  ├── balance.js                     ← Financial engine: computePurchaseDelta, applyDelta, computeNetBalance
  ├── categories.js                  ← guessCategory() — heuristic classifier
  ├── gemini.js                      ← AI client (Workers AI proxy or direct Gemini)
  ├── pushNotifications.js           ← Push subscription & trigger API
  └── validation.js                  ← Zod schemas for purchases, products, houses, profiles

db/                                  ← Data access layer
  ├── firebase.js                    ← Firebase SDK init + offline persistence
  ├── firebaseDb.js                  ← Facade (150 lines) — delegates to repos
  ├── repos/                         ← Domain repositories
  │   ├── purchase.js                ← Purchase + settlement + balance mutations
  │   ├── product.js                 ← Product CRUD + stock movements + consumption
  │   ├── house.js                   ← House CRUD + invite + webhook
  │   ├── notification.js            ← Notifications + push subscriptions + stock alerts
  │   ├── audit.js                   ← Audit log writer
  │   └── profile.js                 ← User profile CRUD
  ├── mockDb.js                      ← In-memory mock with localStorage persistence
  ├── dbProvider.js                  ← Router: Firebase ↔ mock based on config
  └── localCache.js                  ← IndexedDB cache layer

public/
  └── sw.js                          ← Service worker (push + precache + offline fetch handler)
```

### Data Flow Patterns

**Read path (real-time subscription):**
```
Firestore onSnapshot → repo function → localCache.setAll() → React setState → re-render
```
Subscriptions use `includeMetadataChanges: true` and filter `hasPendingWrites` to avoid showing optimistic state before server confirmation.

**Write path (purchase creation):**
```
Compras.jsx → handleConfirmPurchase() → dbProvider.addPurchase()
  → FirebaseDb.addPurchase() → purchaseRepo.addPurchase()
    → writeBatch: purchase doc + product stock updates + stock movements
    → writeAuditEntry()
    → updateMonthlyBalance()
  → showToast()
```

**Balance computation:**
```
useBalances(house, purchases, currentUid):
  if house.monthlyBalances exists (pre-computed by server):
    → reduceMonthlyBalance(mb) → computeNetBalance(totals)
  else (fallback for legacy data or local mock):
    → computeFullBalanceFromPurchases(purchases, members)
    → computeNetBalance(totals)
```

---

## Offline Strategy

| Layer | Mechanism |
|---|---|
| **Firestore** | `persistentLocalCache` + `persistentMultipleTabManager` — automatic offline read/write queue |
| **IndexedDB** | `localCache.js` explicit cache for purchases, products, house data (populated by snapshot callbacks) |
| **Service Worker** | `injectManifest` precaches 11 assets. Fetch handler: cache-first for static assets, network-first with offline fallback for navigation |
| **UI** | `ConnectivityIndicator` sticky banner. All write operations show error toasts if offline |
| **Mock** | Full localStorage fallback when Firebase is unavailable or misconfigured |

**Limitation:** No explicit write queue when offline with mock mode. Firestore's offline SDK handles queueing in Firebase mode but degrades to read-only if the write queue backpressure threshold is exceeded.

---

## Security Model

### Firestore Rules Architecture

```
rules_version = '2';

// inviteCodes/{code}: public read for authenticated users
//   Allows join-by-code without exposing houses collection

// houses/{houseId}: only members can read
//   isHouseMember() checks request.auth.uid in resource.data.members
//   Create: only via invite code (isAddingSelf rule)
//   Update: must include inviteCode field (for isAddingSelf validation)

// Subcollections (purchases, products, notifications, etc.):
//   Read: isHouseMember()
//   Create: isHouseMember()
//   Update: isHouseMember()
//   Delete: denied (soft-delete only — set estado: 'anulada' or _deleted: true)
```

### Authentication

- Google OAuth via Firebase Auth SDK (`signInWithPopup`)
- Local development mode: hardcoded user `T` (Tomas) when Firebase config absent
- No role-based access control — all members are equal within a house

### API Key Security

- `GEMINI_API_KEY` never reaches the browser. All AI requests go through Cloudflare Worker proxy.
- `VAPID_PRIVATE_KEY` stored as Cloudflare Worker secret, never exposed to client.

---

## Performance Characteristics

| Metric | Value |
|---|---|
| **Firestore reads per page load** | 1 (house doc) + 5-10 (profile + subscribe) |
| **Firestore writes per purchase** | 2-10 (batch: purchase + products + movements + audit) |
| **Bundle size (gzip)** | ~260 KB (React + Firebase SDK dominate at ~136 KB) |
| **Service worker precache** | 11 entries, ~863 KB |
| **Balance calculation complexity** | O(P × M) where P = purchases, M = members |
| **Balance with monthlyBalances pre-compute** | O(M) per load |
| **Time to interactive** | ~1.5s on 4G (Firebase SDK initialization is the bottleneck) |

### Balance Computation: Why Two Paths

The `monthlyBalances` field on the house document is an incremental aggregation updated atomically on each purchase mutation. This allows O(1) balance reads after the initial load:

- **Write path:** `computePurchaseDelta()` + `applyDelta()` → single `updateDoc()` on house
- **Read path:** `reduceMonthlyBalance(house.monthlyBalances)` → O(M) reduction

Fallback `computeFullBalanceFromPurchases()` iterates all purchases and items, used when monthlyBalances is absent (legacy data, mock mode). Both paths converge into `computeNetBalance()` which produces the final view model.

---

## Concurrency Model

| Operation | Strategy |
|---|---|
| **Stock consume** | `runTransaction` (optimistic concurrency) |
| **Purchase creation** | `writeBatch` (atomic multi-doc write) |
| **Balance update** | Non-transactional `updateDoc` on house; last-write-wins. Acceptable because monthlyBalances is additive and idempotent per purchase |
| **Notifications** | Independent writes, no ordering guarantees |

---

## Deployment Topology

```
firebase hosting (almacena-38e31.web.app)
  └── Static assets (index.html, JS bundles, SW, manifest)
      └── Firestore + Auth (direct from browser)

cloudflare workers (littlecheft.almacena-gemini.workers.dev)
  ├── POST /      → AI proxy (Workers AI primary, Gemini fallback)
  └── POST /push  → Web Push encryption + delivery
```

### Deploy Commands

```bash
# Frontend
npm run build && firebase deploy --only hosting

# Worker
cd functions && npx wrangler deploy
```

### Required Secrets (Cloudflare Worker)

| Secret | Source |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio |
| `VAPID_PUBLIC_KEY` | Generated via `web-push` CLI |
| `VAPID_PRIVATE_KEY` | Generated via `web-push` CLI |
| `PUSH_SUBJECT` | `mailto:your@email.com` |

### Required Environment Variables (Frontend)

| Variable | Example |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `almacena.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `almacena` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `almacena.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456...` |
| `VITE_FIREBASE_APP_ID` | `1:123:web:abc` |
| `VITE_GEMINI_PROXY_URL` | `https://littlecheft.almacena-gemini.workers.dev` |
| `VITE_PUSH_WORKER_URL` | `https://littlecheft.almacena-gemini.workers.dev/push` |
| `VITE_AI_MODEL` | `llama` (default) |

---

## Testing

```
src/services/__tests__/balance.test.js
  └── 12 tests covering:
      ├── Single purchase, equal split (2 members)
      ├── Single purchase, exclusive item (2 members)
      ├── Multiple purchases, mixed splits (2 members)
      ├── Settlement (isSettlement) entry (2 members)
      ├── Empty purchases array
      ├── Settlement with different direction
      ├── Three members, equal split
      ├── Three members, one exclusive
      ├── Three members, mixed
      ├── Three members, settlement between two
      ├── Four members, equal split
      └── Four members, mixed exclusive + shared
```

Run: `npm test`

---

## Known Technical Debt

| Issue | Impact | Priority |
|---|---|---|
| `getBalances()` in purchaseRepo hardcodes two-member logic (`T`, `S`). Use `computeFullBalanceFromPurchases()` instead. | Balance display on legacy views may be incorrect for 3+ members. | Medium |
| `mockDb.js` `getBalances()` also hardcodes two members. | Same as above, but only affects dev/local mode. | Low |
| No `ORDER BY` on `products` query — order is undefined. | Product list order may vary between renders. | Low |
| `_writeAuditEntry` imported but audit log has no TTL/cleanup. | Collections grow unbounded. | Low |
| `useDataSync` subscribes to house doc but ignores its callback — no reactive balance updates on house change. | Balance may be stale until purchase changes trigger recalculation. | Low |
| No offline write queue in mock mode. | Data loss if user writes while offline in dev mode. | Low |

---

## Version History

| Commit | Description |
|---|---|
| `ab71929` | Main feature: multi-member, CRUD, validation, SW, AdBanner, tests |
| `d6f34db` | Workers AI migration, Paso 9 (Zod, duplicate detection, toast a11y) |
| *(pending)* | Security rules + indexes + API key fix + offline SW + refactors |

---

## Repository

```
git remote: origin https://github.com/joaquinales/almacena.git
Production: https://almacena-38e31.web.app
Worker:     https://littlecheft.almacena-gemini.workers.dev
```
