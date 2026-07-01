/**
 * Cloud Functions actualmente no utilizadas.
 * La app opera con Firebase Spark (plan gratuito).
 * La auditoría se maneja desde el frontend.
 */
const {setGlobalOptions} = require("firebase-functions");

setGlobalOptions({ maxInstances: 10 });
