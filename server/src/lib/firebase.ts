import admin from 'firebase-admin'

function normalizePrivateKey(raw?: string) {
  if (!raw) return undefined
  return raw.replace(/\\n/g, '\n')
}

export function initFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)

  if (!projectId || !clientEmail || !privateKey) {
    return { enabled: false as const }
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    })
  }

  return { enabled: true as const, admin }
}
