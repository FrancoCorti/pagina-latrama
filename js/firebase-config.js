import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Reemplazar con los valores del proyecto: Firebase Console -> Project settings -> Your apps -> Web.
const firebaseConfig = {
    apiKey: "AIzaSyAg2mcwHpxAWNq6TawyecjaxegwaFF7Jd8",
    authDomain: "la-trama-ed6c6.firebaseapp.com",
    projectId: "la-trama-ed6c6",
    storageBucket: "la-trama-ed6c6.firebasestorage.app",
    messagingSenderId: "445154797970",
    appId: "1:445154797970:web:5b6475ab931a575a26f94b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
