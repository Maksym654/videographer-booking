const admin = require('firebase-admin');
const serviceAccount = require('./firebaseConfig.json'); // твой ключ от Firebase Admin

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = { db };
