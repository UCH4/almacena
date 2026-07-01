import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../db/firebase';
import { dbProvider, isFirebaseActive } from '../db/dbProvider';

export function useAuth(showToast) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(isFirebaseActive);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!isFirebaseActive) {
      const localUser = {
        uid: 'T',
        displayName: 'Tomas',
        email: 'tomas@example.com',
        photoURL: '',
        nickname: '',
        emoji: '',
        age: null,
        birthDate: ''
      };
      setUser(localUser);
      dbProvider.setCurrentUser(localUser);
      setLoadingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        await dbProvider.saveUserProfile(firebaseUser.uid, {
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL
        });
        const profile = await dbProvider.getUserProfile(firebaseUser.uid);
        const fbUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          ...profile
        };
        setUser(fbUser);
        dbProvider.setCurrentUser(fbUser);
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('🔑 Sesión iniciada con Google', 'success');
    } catch (err) {
      console.error(err);
      setLoginError('No se pudo iniciar sesión. Verificá tu conexión.');
    }
  };

  const handleLogout = async () => {
    if (isFirebaseActive) {
      await signOut(auth);
    }
    setUser(null);
    showToast('🔑 Sesión cerrada', 'info');
  };

  return { user, setUser, loadingAuth, loginError, handleLogin, handleLogout };
}
