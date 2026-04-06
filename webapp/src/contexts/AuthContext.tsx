import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirstLogin: boolean;
  markOnboardingDone: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isFirstLogin: false,
  markOnboardingDone: async () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profileRef = doc(db, "user_profiles", firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          // First ever login — create profile
          await setDoc(profileRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            onboardingCompleted: false,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
          setIsFirstLogin(true);
        } else {
          const profile = profileSnap.data();
          setIsFirstLogin(!profile.onboardingCompleted);
          // Update last login time
          await setDoc(profileRef, { lastLoginAt: serverTimestamp() }, { merge: true });
        }
      } else {
        setIsFirstLogin(false);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const markOnboardingDone = useCallback(async () => {
    if (!user) return;
    const profileRef = doc(db, "user_profiles", user.uid);
    await setDoc(profileRef, { onboardingCompleted: true }, { merge: true });
    setIsFirstLogin(false);
  }, [user]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isFirstLogin, markOnboardingDone, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
