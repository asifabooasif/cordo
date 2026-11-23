/* Gem ERP :: core/firebase-config.js
   Your Firebase project. These web-app keys are not secret (they only identify the project); the real protection is
   firestore.rules plus Google sign-in. Set enabled:false to run the app on one device without sign-in. */
window.GEM_FIREBASE={
  enabled:true,
  /* true = a "Work on this device only" button is shown on the sign-in screen. Turn it OFF (false) once your team uses sign-in. */
  allowLocal:true,
  companyId:'main',
  config:{
    apiKey:'AIzaSyCWOxzXh_Q1WW4zLOjAUeL3cOuclbo5E4w',
    authDomain:'cordo-gem.firebaseapp.com',
    projectId:'cordo-gem',
    storageBucket:'cordo-gem.firebasestorage.app',
    messagingSenderId:'1087323433135',
    appId:'1:1087323433135:web:91b6b08c2cd7e5480c0c5a'
  }
};
