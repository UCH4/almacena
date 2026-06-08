import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Se considera configurado si al menos la API Key de Firebase está definida en .env
const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

let app;
let auth;
let db;
const googleProvider = new GoogleAuthProvider();

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    
    // Inicializar Firestore con persistencia offline robusta (soporta múltiples pestañas del navegador)
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
    console.log("AlacenaApp Firebase: Conectado con éxito y persistencia offline activada.");
  } catch (error) {
    console.error("Error al inicializar Firebase SDK:", error);
  }
} else {
  console.warn("AlacenaApp Firebase: Variables de entorno de Firebase no detectadas. Utilizando base de datos local (localStorage).");
}

export { app, auth, db, googleProvider, isConfigured };
