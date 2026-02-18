
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCfvR32d-2s6v7-vrdeCRJlScl8ygFlV0s",
  authDomain: "hirukawasaku.firebaseapp.com",
  projectId: "hirukawasaku",
  storageBucket: "hirukawasaku.firebasestorage.app",
  messagingSenderId: "260565277144",
  appId: "1:260565277144:web:f3e12e46ae8bf589717aad"
};

// 既に初期化されている場合はそれを使用し、そうでなければ新規に初期化
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firestoreインスタンスをエクスポート
// この時点で importmap により firebase/firestore が読み込まれているため、サービスが利用可能になります。
export const db = getFirestore(app);
