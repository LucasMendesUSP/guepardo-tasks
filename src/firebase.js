// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBFpDVmf08ZbUsDe9viEjDFyzvX7C29fpE",
  authDomain: "guepardo-task.firebaseapp.com",
  projectId: "guepardo-task",
  storageBucket: "guepardo-task.firebasestorage.app",
  messagingSenderId: "185024789510",
  appId: "1:185024789510:web:63d918de4177f8b70b9787"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
