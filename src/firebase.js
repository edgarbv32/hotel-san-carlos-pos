import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDUfHRotkOGc6nrPWfXyFWT-T1DZPI8gUE",
  authDomain: "hotelrealsancarlos.firebaseapp.com",
  projectId: "hotelrealsancarlos",
  storageBucket: "hotelrealsancarlos.firebasestorage.app",
  messagingSenderId: "T1008133638912",
  appId: "1:1008133638912:web:3c5b70a7ed9d57c76501e5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);