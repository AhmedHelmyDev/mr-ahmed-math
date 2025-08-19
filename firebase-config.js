// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAoBg2fgYrEG6WAtXQwa1jhSqd1KKCmKJA",
  authDomain: "mr-ahmed-a0f8c.firebaseapp.com",
  projectId: "mr-ahmed-a0f8c",
  storageBucket: "mr-ahmed-a0f8c.firebasestorage.app",
  messagingSenderId: "963068855040",
  appId: "1:963068855040:web:d2161b53275705584629e5",
  measurementId: "G-C90TWHDZSX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
