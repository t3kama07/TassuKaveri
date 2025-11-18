// Email capture -> Firebase Firestore
// Loads Firebase from CDN, initializes with window.FIREBASE_CONFIG,
// and exposes window.submitPromoSignup(email, name)

// Use modular SDK via ESM CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, serverTimestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let db = null;

function ensureInit() {
  if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) {
    console.warn("Firebase config missing. Set window.FIREBASE_CONFIG in firebase-config.js");
    return null;
  }
  if (db) return db;
  const app = initializeApp(window.FIREBASE_CONFIG);
  db = getFirestore(app);
  return db;
}

async function submitPromoSignup(email, name) {
  const _db = ensureInit();
  if (!_db) {
    return { ok: false, error: "Firebase not configured" };
  }
  // Declare docRef so catch block can inspect it for race duplicates.
  let docRef;
  try {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { ok: false, error: 'invalid-email' };
    }
    docRef = doc(_db, 'promoSignups', normalizedEmail);
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      return { ok: false, error: 'duplicate' };
    }
    const payload = {
      email: normalizedEmail,
      name: name || null,
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent,
      language: document.documentElement.lang || "fi",
      path: location.pathname + location.hash
    };
    console.log('[promoSignups] Attempting write payload:', payload);
    await setDoc(docRef, payload);
    return { ok: true };
  } catch (err) {
    console.error("Failed to save signup to Firestore", err);
    // If we hit a permission error it might be a race where another client just created the doc.
    try {
      if ((err.code === 'permission-denied' || /PERMISSION_DENIED/i.test(err.message || '')) && docRef) {
        const after = await getDoc(docRef);
        if (after.exists()) {
          return { ok: false, error: 'duplicate' };
        }
      }
    } catch (_) { /* ignore secondary errors */ }
    return { ok: false, error: err.code === 'permission-denied' ? 'permission-denied' : (err?.message || String(err)) };
  }
}

// Expose globally for the inline script to call
try { window.submitPromoSignup = submitPromoSignup; } catch (_) {}
