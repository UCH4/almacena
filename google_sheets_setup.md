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
