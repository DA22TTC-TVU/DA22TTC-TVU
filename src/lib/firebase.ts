// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage, ref, listAll, getMetadata, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBUHtPxf9bP9XCVkBYdmpDx55KxWK7BHTI",
    authDomain: "da22ttc-tvu.firebaseapp.com",
    projectId: "da22ttc-tvu",
    storageBucket: "da22ttc-tvu.appspot.com",
    messagingSenderId: "892715463071",
    appId: "1:892715463071:web:6aea1a450bf3e372938daa",
    measurementId: "G-KGS41DYF5X"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage, ref, listAll, getMetadata, getDownloadURL };
