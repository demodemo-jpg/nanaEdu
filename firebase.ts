
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ユーザー提供の実際のFirebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCfvR32d-2s6v7-vrdeCRJlScl8ygFlV0s",
  authDomain: "hirukawasaku.firebaseapp.com",
  projectId: "hirukawasaku",
  storageBucket: "hirukawasaku.firebasestorage.app",
  messagingSenderId: "260565277144",
  appId: "1:260565277144:web:f3e12e46ae8bf589717aad"
};

// 初期化
const app = initializeApp(firebaseConfig);
// Firestoreインスタンスをエクスポート
export const db = getFirestore(app);
