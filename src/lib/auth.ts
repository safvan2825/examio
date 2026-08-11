import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, User } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const subscribeAuth = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);

export const registerUser = async (name: string, email: string, password: string) => {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
  return credential.user;
};

export const loginUser = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
};

export const logoutUser = () => signOut(auth);
