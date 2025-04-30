// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "IzaSyCBTtACKSAE5ttB2e6iu800Gv813YK23PE",
  authDomain: "bassa-8e0cb.firebaseapp.com",
  databaseURL: "https://bassa-8e0cb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bassa-8e0cb",
  storageBucket: "bassa-8e0cb.appspot.com",
  messagingSenderId: "466684696497",
  appId: "1:466684696497:web:464c3ba72798eef77e0f90",
  measurementId: "G-PDDEY3425Y"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Вот этого не хватало!
