import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD38tWWo-suXQ9gr9pn5jPMLuowEetiT3Q",
  authDomain: "streetlink-vendorconnect.firebaseapp.com",
  projectId: "streetlink-vendorconnect",
  storageBucket: "streetlink-vendorconnect.firebasestorage.app",
  messagingSenderId: "616236259541",
  appId: "1:616236259541:web:c855a7b7a837a4938dea5c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export default app;

// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyD38tWWo-suXQ9gr9pn5jPMLuowEetiT3Q",
//   authDomain: "streetlink-vendorconnect.firebaseapp.com",
//   projectId: "streetlink-vendorconnect",
//   storageBucket: "streetlink-vendorconnect.firebasestorage.app",
//   messagingSenderId: "616236259541",
//   appId: "1:616236259541:web:c855a7b7a837a4938dea5c"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);