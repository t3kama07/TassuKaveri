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
  try {
    // Normalize email for uniqueness (lowercase + trim)
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { ok: false, error: 'invalid-email' };
    }
    const docRef = doc(_db, 'promoSignups', normalizedEmail);
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
    // setDoc creates since rules forbid updates; if simultaneous duplicate occurs, second attempt becomes update and will be denied.
    await setDoc(docRef, payload);
    return { ok: true };
  } catch (err) {
    console.error("Failed to save signup to Firestore", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

// Expose globally for the inline script to call
try { window.submitPromoSignup = submitPromoSignup; } catch (_) {}
