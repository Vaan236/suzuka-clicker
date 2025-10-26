import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKUXTUulyfcAv1bnwrQtOA7j1B46y_1HI", // Replace with your API key
  authDomain: "suzuka-comments.firebaseapp.com", // Replace with your auth domain
  projectId: "suzuka-comments", // Replace with your project ID
  storageBucket: "suzuka-comments.firebasestorage.app", // Replace with your storage bucket
  messagingSenderId: "630107364713", // Replace with your messaging sender ID
  appId: "1:630107364713:web:ce097916b11da6f519b1f8", // Replace with your app ID
  measurementId: "G-B4EKCT55PS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default db;