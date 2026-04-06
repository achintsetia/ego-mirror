import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isFirstLogin: boolean;
  hasConversation: boolean;
  markConversationDone: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isFirstLogin: false,
  hasConversation: false,
  markConversationDone: () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure user_profiles doc exists
        const profileRef = doc(db, "user_profiles", firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
          setIsAdmin(false);
        } else {
          await setDoc(profileRef, { lastLoginAt: serverTimestamp() }, { merge: true });
          setIsAdmin(profileSnap.data()?.is_admin === true);
        }

        // Show the modal if the user has no conversations yet
        if (firebaseUser.email) {
          const sessionsRef = collection(db, "conversations", firebaseUser.email, "sessions");
          const snap = await getDocs(sessionsRef);
          setIsFirstLogin(snap.empty);
        } else {
          setIsFirstLogin(false);
        }
      } else {
        setIsAdmin(false);
        setIsFirstLogin(false);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const markConversationDone = useCallback(() => {
    setIsFirstLogin(false);
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isFirstLogin, hasConversation: !isFirstLogin, markConversationDone, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
