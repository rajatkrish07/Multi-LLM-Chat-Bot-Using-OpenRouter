import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA31A_jBgpHWgX9_1d6rIO5JtD_BbyiWOo",
  authDomain: "chat-buddy-90ecb.firebaseapp.com",
  projectId: "chat-buddy-90ecb",
  storageBucket: "chat-buddy-90ecb.firebasestorage.app",
  messagingSenderId: "61203474928",
  appId: "1:61203474928:web:279db7cf1f2086d86b7603",
  measurementId: "G-8E30N6GSFV"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard provider settings
googleProvider.setCustomParameters({
  prompt: "select_account"
});
