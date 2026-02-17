
import firebase from "firebase/app";
import "firebase/firestore";

// Firebaseの設定（Vercel等の環境変数から取得することを想定）
// 開発時はFirebaseコンソールから取得した値をここに貼り付けます
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 初期化 - 互換性を考慮した記述
const app = firebase.initializeApp(firebaseConfig);
export const db = app.firestore();
