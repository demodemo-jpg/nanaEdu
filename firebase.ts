
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCfvR32d-2s6v7-vrdeCRJlScl8ygFlV0s",
  authDomain: "hirukawasaku.firebaseapp.com",
  projectId: "hirukawasaku",
  storageBucket: "hirukawasaku.firebasestorage.app",
  messagingSenderId: "260565277144",
  appId: "1:260565277144:web:f3e12e46ae8bf589717aad"
};

// アプリの初期化
const app: FirebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

// Firestoreインスタンスを生成
// index.htmlのimportmapでdepsを固定しているため、ここでサービスが正しく認識されます
export const db: Firestore = getFirestore(app);
