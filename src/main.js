import { createApp } from 'vue'
import { initializeApp } from "firebase/app";
import App from './App.vue'

// const firebaseConfig = {
//     apiKey: "AIzaSyAjwvKNXGHc1SnZ6X41yK9xbxFpNTy8ets",
//     authDomain: "coral-gardeners-playground.firebaseapp.com",
//     projectId: "coral-gardeners-playground",
//     storageBucket: "coral-gardeners-playground.firebasestorage.app",
//     messagingSenderId: "642512438673",
//     appId: "1:642512438673:web:cccf26acbdfc3961b8c630"
// };

// const app = initializeApp(firebaseConfig);

createApp(App).mount('#app')
