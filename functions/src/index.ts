import { initializeApp } from 'firebase-admin/app'
import { onRequest } from 'firebase-functions/v2/https'

// PALLETIQ-014 scaffold. Proves the functions/ package builds, lints,
// typechecks, and has a working Firebase deploy target end-to-end. No
// product logic lives here yet - see PALLETIQ-002 for the first real
// function (Auth custom claims).

initializeApp()

export const ping = onRequest((_req, res) => {
  res.status(200).send('ok')
})
