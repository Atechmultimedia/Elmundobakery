/* ============================================================
   El Mundo Bakery — Firebase configuration
   Project: el-mundo-e976f
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBjawN1MXFyPVTgY90dWNmdKMqvuX5bCvQ",
  authDomain: "el-mundo-e976f.firebaseapp.com",
  databaseURL: "https://el-mundo-e976f-default-rtdb.firebaseio.com",
  projectId: "el-mundo-e976f",
  storageBucket: "el-mundo-e976f.firebasestorage.app",
  messagingSenderId: "335945429486",
  appId: "1:335945429486:web:69a225197451b2fb819eff",
  measurementId: "G-EDBVCTPZHM"
};

// Primary app — used for the signed-in session.
firebase.initializeApp(firebaseConfig);

// Secondary app instance — used only to create new staff logins
// without signing the admin out of the primary session. See
// js/staff.js → createStaffLogin().
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");

const auth = firebase.auth();
const secondaryAuth = secondaryApp.auth();
const db = firebase.firestore();
