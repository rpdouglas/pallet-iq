import { initializeApp } from 'firebase-admin/app'

// PALLETIQ-051/ADR-0017. `firebase emulators:exec --project demo-palletiq`
// sets FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST for this
// process, which the Admin SDK auto-detects - explicit projectId here just
// makes the "always demo-palletiq, never real mrt-pallet-iq" guarantee
// self-contained rather than relying on env propagation alone. The Admin
// SDK bypasses firestore.rules entirely, same as it does in production.
export const adminApp = initializeApp({ projectId: 'demo-palletiq' })
