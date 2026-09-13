import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAPH5IX8PVMaKF6S7Elwni0RQPDxAmsDhw",
  authDomain: "mira-f1122.firebaseapp.com",
  projectId: "mira-f1122",
  storageBucket: "mira-f1122.firebasestorage.app",
  messagingSenderId: "1066334284879",
  appId: "1:1066334284879:web:ab3acefe8c49dbeb0ace3a",
  measurementId: "G-9GGS3WBV2L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signOut };
