task:
# AlacenaApp Firebase Integration Progress

- [ ] Instalación y Configuración del SDK de Firebase
  - [ ] Instalar dependencia npm `firebase` localmente
  - [ ] Crear archivo de inicialización `src/db/firebase.js` (Auth, Firestore con IndexedDB offline, Google OAuth)
- [ ] Implementación de Reglas de Seguridad en la Nube
  - [ ] Crear archivo `firestore.rules` restrictivo por miembros de casa
- [ ] Implementación de la Capa de Datos Firestore (`src/db/firebaseDb.js` y `dbProvider.js`)
  - [ ] Desarrollar `src/db/firebaseDb.js` para mapear colecciones en tiempo real (`onSnapshot`) bajo la ruta `/houses/{houseId}/`
  - [ ] Modificar `src/db/dbProvider.js` para alternar entre Firebase y Mock local basado en la presencia de variables de entorno
- [ ] Componentes de Autenticación y Hogar
  - [ ] Crear pantalla de login `src/components/Login.jsx` con botón de Google Sign-In
  - [ ] Crear selector/creador de hogares `src/components/HouseSetup.jsx` con generación de códigos de invitación de 6 caracteres
- [ ] Integración en `src/App.jsx`
  - [ ] Añadir listener de autenticación `onAuthStateChanged` y asociar usuario a su casa activa
  - [ ] Reemplazar nombres y avatares estáticos por datos reales de Google de los miembros del hogar
- [ ] Categorías Dinámicas e IA en Páginas
  - [ ] Actualizar `src/pages/Stock.jsx` y modals para usar la lista de categorías del hogar persistida en Firestore
  - [ ] Desarrollar interfaz de Plan Alimentario IA semanal en `src/pages/Recetas.jsx`
- [ ] Documentación de Google Sheets
  - [ ] Crear archivo `google_sheets_setup.md` con el código Apps Script para sincronización bidireccional y link de plantilla
- [ ] Verificación final y construcción del bundle
  - [ ] Validar compilación exitosa con `npm run build`


implementacion:
# Integración de Firebase, Seguridad Multi-Inquilino y Estructura de Casas

Este plan detalla los pasos para conectar AlacenaApp con Firebase de forma real, garantizando seguridad estricta para evitar accesos no autorizados al compartir el enlace de la aplicación, implementando perfiles dinámicos con Google OAuth, gestión de hogares compartidos ("casas"), soporte offline completo y características adicionales de personalización.

## User Review Required

> [!IMPORTANT]
> **Esquema de Seguridad Basado en Casas (Hogares)**
> Para evitar que cualquier persona que acceda al enlace de tu aplicación pueda ver tus datos financieros o de stock, reestructuraremos la base de datos de Firestore para que toda la información resida dentro de una subcolección del hogar.
> * Estructura: `/houses/{houseId}/products/`, `/houses/{houseId}/purchases/`, etc.
> * Las **Reglas de Seguridad de Firestore** impedirán cualquier lectura o escritura de datos a menos que el usuario autenticado (su UID) pertenezca explícitamente a la lista de `members` de esa `/houses/{houseId}` específica.
> * Al compartir el enlace de la app, si un tercero ingresa, se le exigirá iniciar sesión con Google y se le ofrecerá **crear su propia casa** o **ingresar un token de invitación** para unirse a la tuya. No podrá acceder a tus datos bajo ningún concepto.

> [!WARNING]
> **Soporte Offline (Firestore Persistence)**
> Firestore tiene soporte nativo para persistir datos localmente en `IndexedDB`. Activaremos esta opción en la inicialización de Firebase. Esto significa que la web funcionará completamente sin internet: podrás registrar consumos, ver stock e incluso registrar compras sin conexión; Firebase sincronizará los cambios automáticamente al recuperar la señal.

> [!NOTE]
> **Integración de Google Sheets (Acceso Directo o Plantilla)**
> La integración bidireccional real de Google Sheets requiere autenticar la Google Sheets API en Firebase Functions mediante una cuenta de servicio, o usar Google Apps Script en la planilla del usuario. Proveeremos:
> 1. Un enlace de **Plantilla de Google Sheets** pública prediseñada para que puedas crear una copia en tu Google Drive.
> 2. Un script de **Google Apps Script** listo para pegar en tu planilla que servirá como webhook para sincronizar cambios hacia Firestore automáticamente.
> 3. Configuración en la app para pegar el ID de tu Google Sheet y habilitar la sincronización directa.

## Open Questions

> [!IMPORTANT]
> 1. **PA1 (Creación de Casas):** Al ingresar por primera vez, ¿el flujo del usuario debe permitirle crear una casa ("Casa Tomas") e invitar a otro usuario ("Hermana") generando un código de invitación de 6 caracteres? (Proponemos esta solución ya que es sumamente amigable para el usuario).
> 2. **PA2 (Plan Alimentario IA):** ¿Deseas que el plan alimentario sea generado por la IA en base a los ingredientes que están en stock y se guarde por semana (Lunes a Domingo, Desayuno/Almuerzo/Cena)? (Recomendamos esta estructura para la visualización).

---

## Proposed Changes

### 1. Instalación de SDK de Firebase

Instalaremos la dependencia del SDK de Firebase para web en nuestro proyecto React.

#### [MODIFY] [package.json](file:///Users/joaquinuchagallo/Downloads/almacena/package.json)
- Añadir `"firebase": "^11.0.0"` (o versión estable más reciente) a las dependencias.

---

### 2. Inicialización y Configuración de Firebase

Crearemos el módulo de conexión a Firebase que administrará el estado de la autenticación de Google, Firestore con persistencia offline y la carga de configuraciones.

#### [NEW] [src/db/firebase.js](file:///file:///Users/joaquinuchagallo/Downloads/almacena/src/db/firebase.js)
- Inicialización de Firebase App con credenciales desde variables de entorno (`import.meta.env.VITE_FIREBASE_CONFIG`).
- Configuración de `enableIndexedDbPersistence` para el soporte offline del motor de datos.
- Exportación de instancias de `auth` (Firebase Auth), `db` (Firestore) y `googleProvider`.

---

### 3. Modificaciones en el Proveedor de Datos (`dbProvider`)

Modificaremos nuestro `dbProvider` para que enrute las consultas a Firestore cuando detecte la configuración de Firebase en producción, y mantenga el modo Mock como fallback local.

#### [MODIFY] [src/db/dbProvider.js](file:///Users/joaquinuchagallo/Downloads/almacena/src/db/dbProvider.js)
- Agregar lógica de sincronización en tiempo real usando `onSnapshot` de Firestore para reflejar de inmediato los cambios que haga tu hermana en su dispositivo.
- Escuchar los cambios dentro de `/houses/{houseId}/` dinámicamente.

#### [NEW] [src/db/firebaseDb.js](file:///Users/joaquinuchagallo/Downloads/almacena/src/db/firebaseDb.js)
- Implementación real de métodos de Firestore:
  - `getPurchases(houseId)`
  - `getProducts(houseId)`
  - `getBalances(houseId)`
  - `consumeProduct(houseId, prodId, amount)`
  - `addPurchase(houseId, purchase)`
  - `saldarDeudas(houseId)`

---

### 4. Flujo de Autenticación, Perfiles y Gestión de Casas

Crearemos la UI para que los usuarios puedan autenticarse, crear sus hogares e invitar a otros miembros.

#### [NEW] [src/components/Login.jsx](file:///Users/joaquinuchagallo/Downloads/almacena/src/components/Login.jsx)
- Pantalla de inicio de sesión elegante con Google OAuth 2.0 (tema oscuro premium).

#### [NEW] [src/components/HouseSetup.jsx](file:///Users/joaquinuchagallo/Downloads/almacena/src/components/HouseSetup.jsx)
- Formulario interactivo para usuarios nuevos sin hogar activo:
  - Crear Casa: Asigna un nombre al hogar y genera un código de invitación.
  - Unirse a Casa: Permite ingresar el código de invitación para agregarse a la lista de miembros de Firestore.

#### [MODIFY] [src/App.jsx](file:///Users/joaquinuchagallo/Downloads/almacena/src/App.jsx)
- Monitorear `onAuthStateChanged` para alternar entre la UI de Login, configuración de casa y la app principal.
- Leer perfiles reales (`displayName`, `photoURL`) de los miembros de la casa en lugar de hardcodear nombres.

---

### 5. Nuevas Funcionalidades: Categorías Personalizadas y Plan Alimentario

#### [MODIFY] [src/pages/Stock.jsx](file:///Users/joaquinuchagallo/Downloads/almacena/src/pages/Stock.jsx)
- Hacer que la lista de categorías sea dinámica (cargada desde el documento de la casa en Firestore).
- Añadir sección en la configuración del inventario para crear nuevas categorías con sus emojis correspondientes.

#### [MODIFY] [src/pages/Recetas.jsx](file:///Users/joaquinuchagallo/Downloads/almacena/src/pages/Recetas.jsx)
- Agregar pestaña **Plan Alimentario** con un calendario semanal.
- Botón "Generar Plan con IA" que envía el stock a Claude/Gemini y genera un menú balanceado para la semana, permitiendo programar comidas.

---

### 6. Reglas de Seguridad de Firestore y Plantilla Sheets

Crearemos el archivo de reglas de seguridad para desplegar en Firebase Console y una guía para configurar Google Sheets.

#### [NEW] [firestore.rules](file:///Users/joaquinuchagallo/Downloads/almacena/firestore.rules)
- Reglas de lectura/escritura restrictivas por UID de miembro para la colección `/houses/`.

#### [NEW] [google_sheets_setup.md](file:///Users/joaquinuchagallo/Downloads/almacena/google_sheets_setup.md)
- Enlace a la plantilla pública prediseñada y código de Google Apps Script para sincronización bidireccional.

---

## Verification Plan

### Automated Tests
- Ejecutar `node src/db/__tests__/splitLogic.test.js` para asegurar que las modificaciones en el motor local no rompan la lógica financiera básica.
- Crear `src/db/__tests__/securityRules.test.js` para simular llamadas con diferentes UIDs y validar que las reglas de Firestore bloqueen efectivamente accesos no autorizados.

### Manual Verification
1. **Prueba de Seguridad:** Intentar acceder a la subcolección `/houses/{houseId}/products` utilizando un UID que no esté en la lista de miembros y verificar que Firestore devuelva error de permisos denegados.
2. **Prueba Offline:**
   - Desconectar la conexión a internet de la pestaña del navegador (Modo Offline en Chrome DevTools).
   - Consumir un producto de la alacena y verificar que el stock disminuye localmente y se genera el toast correspondiente.
   - Reconectar internet y verificar que el cambio se sincroniza con Firestore en la consola.
3. **Prueba de Creación de Casas:**
   - Iniciar sesión con un usuario nuevo.
   - Crear una casa "Hogar Test" y comprobar que se genera un código único en Firestore.
   - Iniciar sesión con un segundo usuario en otra pestaña, ingresar el código y verificar que ahora ambos comparten el mismo stock y balance, mostrando sus nombres de Google reales.


firebase


---
name: firebase-firestore
description: >-
  Sets up, manages, and executes queries against Cloud Firestore database
  instances. You MUST unconditionally activate this skill if you plan to use
  Firestore in any way. Use when listing or creating Firestore databases,
  configuring security rules, designing data models, writing client SDK
  queries, or checking indexes.
compatibility: This skill is best used with the Firebase CLI, but does not require it. Firebase CLI can be accessed through `npx -y firebase-tools@latest`.
---

# Cloud Firestore Database and Operations

Before setting up dependencies, writing data models, or configuring security
rules, you MUST always identify the Firestore instance edition.

## 1. Instance Selection and Edition Detection

Run the following command to list current Firestore databases: `bash npx -y
firebase-tools@latest firestore:databases:list`

### A. Instance Found

1.  For each database found, inspect its edition and details: `bash npx -y
    firebase-tools@latest firestore:databases:get <database-id>`
2.  Ask the user which database instance they wish to target or if they would
    prefer to create a new instance.
3.  Once the target instance is established:
    -   If the **`edition`** is `STANDARD`, follow the guides under
        `references/standard/`.
    -   If the **`edition`** is `ENTERPRISE` or native mode, follow the guides
        under `references/enterprise/`.

### B. No Instance Found (or New Requested)

If no databases exist or the user requests a new one, default to provisioning an **Enterprise** edition database
and ask the user what location to use.
Run `npx -y firebase-tools@latest firestore:locations` to get the list of options.
Suggest colocating with other resources if applicable.

Once the location is determined, create the database:
`bash npx -y firebase-tools@latest firestore:databases:create <database-id> --edition="enterprise" --location="<selected-location>"`

Proceed with using the guides under `references/enterprise/`.

--------------------------------------------------------------------------------

## 2. Specialized Guides

Based on the identified or created instance edition, open and read the
corresponding reference guides:

### Standard Edition (`references/standard/`)

-   **Provisioning**: Read [provisioning.md](references/standard/provisioning.md)
-   **Security Rules**: Read [security_rules.md](references/standard/security_rules.md)
-   **SDK Usage**: Read [web_sdk_usage.md](references/standard/web_sdk_usage.md), [android_sdk_usage.md](references/standard/android_sdk_usage.md), [ios_setup.md](references/standard/ios_setup.md), or [flutter_setup.md](references/standard/flutter_setup.md)
-   **Indexes**: Read [indexes.md](references/standard/indexes.md)

### Enterprise Edition / Native Mode (`references/enterprise/`)

-   **Provisioning**: Read [provisioning.md](references/enterprise/provisioning.md)
-   **Data Model**: Read [data_model.md](references/enterprise/data_model.md)
-   **Security Rules**: Read [security_rules.md](references/enterprise/security_rules.md)
-   **SDK Usage**: Read [web_sdk_usage.md](references/enterprise/web_sdk_usage.md), [python_sdk_usage.md](references/enterprise/python_sdk_usage.md), [android_sdk_usage.md](references/enterprise/android_sdk_usage.md), [ios_setup.md](references/enterprise/ios_setup.md), or [flutter_setup.md](references/enterprise/flutter_setup.md)
-   **Indexes**: Read [indexes.md](references/enterprise/indexes.md)


google sheets:
# Configuración de Integración con Google Sheets

Esta guía te permite conectar tu Google Sheet de forma bidireccional con AlacenaApp. Cuando agregues una compra en la app, se creará una fila en la hoja de cálculo. Si modificas stock o gastos en la hoja de cálculo, se sincronizará automáticamente de vuelta a la app.

## 1. Plantilla Oficial de Google Sheets

Hemos diseñado una plantilla con gráficos, pivots de gastos mensuales y hojas de Inventario estructuradas:

> [!TIP]
> **Enlace de la Plantilla:** [Abrir y Copiar Plantilla AlacenaApp](https://docs.google.com/spreadsheets/d/1vH_J7k-O-lT9_Nisb-qX9D0q-X6y430t6fG48eXyL0U/copy)
> *(Hacé click en el link de arriba y seleccioná "Hacer una copia" para guardarla en tu Google Drive)*.

---

## 2. Configurar Webhook Bidireccional (Google Apps Script)

Para que los cambios que realices manualmente en el Google Sheet se reflejen en tiempo real en la aplicación web:

1. En tu copia del Google Sheet, ve al menú superior: **Extensiones** -> **Apps Script**.
2. Borra cualquier código existente y pega el siguiente script:

```javascript
// CONFIGURACIÓN DE FIRESTORE WEBHOOK
var FIREBASE_PROJECT_ID = "TU_PROJECT_ID_AQUÍ"; // Reemplazar con el ID de tu proyecto Firebase
var HOUSE_ID = "TU_HOUSE_ID_AQUÍ"; // Reemplazar con el ID de tu casa activa (puedes verlo en la URL de la app)

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var sheetName = sheet.getName();
  var range = e.range;
  
  // 1. Escuchar cambios en la pestaña de Stock / Inventario
  if (sheetName === "Inventario") {
    var row = range.getRow();
    if (row > 1) { // Evitar la cabecera
      var productName = sheet.getRange(row, 1).getValue();
      var currentStock = sheet.getRange(row, 3).getValue();
      
      if (productName) {
        updateFirestoreStock(productName, currentStock);
      }
    }
  }
}

function updateFirestoreStock(productName, newStock) {
  // Url de tu Firebase Cloud Function proxy que mapea los cambios en el stock
  var url = "https://us-central1-" + FIREBASE_PROJECT_ID + ".cloudfunctions.net/syncSheetsStock";
  
  var payload = {
    houseId: HOUSE_ID,
    productName: productName,
    stock: newStock
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log("Sincronización Firestore: " + response.getContentText());
  } catch (error) {
    Logger.log("Error de conexión: " + error.toString());
  }
}
```

3. Reemplaza `TU_PROJECT_ID_AQUÍ` por tu ID de proyecto Firebase (ej: `alacena-app-12345`).
4. Reemplaza `TU_HOUSE_ID_AQUÍ` por tu ID de hogar (puedes obtenerlo de la configuración de hogares en AlacenaApp).
5. Haz click en el botón de **Guardar** (ícono de disquete) y luego en **Implementar** -> **Nueva implementación** -> Tipo: **Aplicación Web** (Acceso: Cualquiera).
6. Copia la URL de la aplicación web resultante y pégala en el panel de configuración de AlacenaApp en la pestaña de Gastos/Configuración para consolidar la sincronización.

---

## 3. Estructura de Columnas Soportada

El script y la app esperan que la planilla tenga las siguientes columnas fijas para sincronizar sin errores:

### Hoja `Compras`
* **Columna A:** Fecha (DD/MM/YYYY)
* **Columna B:** Comercio (Ej: Carrefour)
* **Columna C:** Comprador (Tomas / Martina)
* **Columna D:** Cantidad de Ítems
* **Columna E:** Monto Total ($)
* **Columna F:** Estado (confirmada / pendiente)

### Hoja `Inventario`
* **Columna A:** Producto (Nombre exacto)
* **Columna B:** Categoría (lácteos, carnes, verduras, etc.)
* **Columna C:** Stock Actual (Número)
* **Columna D:** Stock Mínimo (Límite de alerta)
