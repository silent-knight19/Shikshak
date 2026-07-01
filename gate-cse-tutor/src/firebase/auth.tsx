import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithCredential, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './config';

declare global {
  interface Window {
    AndroidAuth?: {
      getUser(): string;
      getIdToken(): string;
      signOut(): void;
    };
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOutUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function tryAndroidAuthBridge() {
  const bridge = window.AndroidAuth;
  if (!bridge) return;

  try {
    const token = bridge.getIdToken();
    if (!token) return;

    const credential = GoogleAuthProvider.credential(token);
    await signInWithCredential(auth, credential);
  } catch (err) {
    console.error('Android auth bridge sign-in failed:', err);
  }
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          lastLoginAt: Timestamp.now(),
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save user document:', err);
      }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Attempt Android bridge auth for WebView
    if (window.AndroidAuth) {
      tryAndroidAuthBridge().finally(() => {
        // onAuthStateChanged will handle setting loading to false
      });
    }

    return unsubscribe;
  }, []);

  const signIn = async () => {
    if (window.AndroidAuth) {
      await tryAndroidAuthBridge();
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  };

  const signOutUser = async () => {
    window.AndroidAuth?.signOut();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
