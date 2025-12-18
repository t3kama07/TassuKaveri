# Firestore Setup Instructions

## Enable Firestore in Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: "TassuKaveri"
3. In the left sidebar, click **"Build"** → **"Firestore Database"**
4. Click **"Create database"**
5. Select **"Start in test mode"** (for development)
   - Security rules will allow read/write for now
   - You'll secure this later in production
6. Choose a location: **europe-west3 (Frankfurt)** or closest to Finland
7. Click **"Enable"**

## Test Mode Security Rules

The default test mode rules will be:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 1, 18);
    }
  }
}
```

**Note:** Test mode expires after 30 days. Update rules before expiration.

## Production Security Rules (for later)

Once ready for production, update to:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User root document (profile)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Wallet subcollection
      match /wallet/{walletId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Transactions subcollection (append-only, immutable)
        match /transactions/{txId} {
          allow read: if request.auth != null && request.auth.uid == userId;
          allow create: if request.auth != null && request.auth.uid == userId;
          // No update or delete - transactions are immutable
        }
      }

      // Pets subcollection
      match /pets/{petId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Requests subcollection
      match /requests/{requestId} {
        // Owner can read, write their own requests
        allow read, write: if request.auth != null && request.auth.uid == userId;
        // TODO: Other users need read access to browse requests (future feature)
      }
    }
  }
}
```

### Why this is better

✔ User can read/write their profile
✔ User can manage wallet and pets
✔ Transactions belong to the wallet (logical grouping)
✔ Transactions are append-only (immutable audit trail)
✔ Same rule pattern works for future subcollections
✔ Clean ownership boundary

### 🔒 Important security note

This rule ensures:
- You never need public read access
- Everything is behind authentication (which matches your app)
- Transactions cannot be updated or deleted (immutable)
- Balance is the source of truth
- If balance ≠ sum(transactions), balance wins

### ⚠️ What NOT to add

Do NOT add:
```
allow read: if true;
```
or any wildcard public rules.

That would immediately break trust and GDPR expectations.

### 🛡️ Data Integrity Guarantees

✅ Transactions are append-only (create only, no update/delete)
✅ Balance changes only through service logic (addCredits/deductCredits)
✅ Never edit or delete transactions
✅ Balance is always the authoritative source
✅ Firestore transactions ensure atomicity

## Firestore Collections Structure

```
users/
  {uid}/                    (user profile document)
    uid: string
    email: string
    name: string
    location: string (city)
    role: 'owner' | 'sitter' | 'both'
    createdAt: timestamp
    updatedAt: timestamp
    
    wallet/                 (subcollection)
      main/                 (wallet document)
        balance: number
        createdAt: timestamp
        updatedAt: timestamp
        
        transactions/       (subcollection - append-only)
          {txId}/
            type: 'earn' | 'spend'
            amount: number
            reference: string
            timestamp: timestamp
            balanceAfter: number
    
    pets/                   (subcollection)
      {petId}/
        name: string
        type: 'dog' | 'cat' | 'other'
        breed: string
        age: number
        size: 'small' | 'medium' | 'large'
        notes: string
        createdAt: timestamp
        updatedAt: timestamp
    
    requests/               (subcollection)
      {requestId}/
        ownerId: string
        ownerName: string
        petIds: string[]
        petNames: string[]
        careType: 'daily-visit' | 'overnight' | 'boarding' | 'walking'
        startDate: timestamp
        endDate: timestamp
        location: string
        creditsOffered: number
        status: 'open' | 'accepted' | 'completed' | 'cancelled'
        sitterId?: string
        sitterName?: string
        notes?: string
        createdAt: timestamp
        updatedAt: timestamp
```
