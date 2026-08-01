/**
 * Firebase Auth Middleware
 * Verifies Firebase ID tokens on protected routes
 */

const admin = require('firebase-admin');

/**
 * Parse the Firebase private key from .env
 * Handles all common formatting issues:
 *   1. Quoted string with literal \n  → "-----BEGIN...\n...\n-----END..."
 *   2. Unquoted with literal \n       →  -----BEGIN...\n...\n-----END...
 *   3. Already has real newlines      →  works as-is
 */
function parseFirebasePrivateKey(raw) {
  if (!raw) throw new Error('FIREBASE_PRIVATE_KEY is not set in environment variables');

  // Strip surrounding quotes if present (single or double)
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // Replace all literal \n sequences with real newlines
  key = key.replace(/\\n/g, '\n');

  // Validate it looks like a PEM key
  if (!key.includes('-----BEGIN')) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY does not look like a valid PEM key.\n' +
      'Make sure to copy the full private key from your Firebase service account JSON.\n' +
      'In your .env file, the key should be on ONE line with \\n between sections.'
    );
  }

  return key;
}

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  parseFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  });
}


/**
 * Middleware: require a valid Firebase token
 * Attaches decoded token + MongoDB user to req
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.code);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware: optionally attach user if token present (for public routes)
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.firebaseUser = await admin.auth().verifyIdToken(token);
    } catch (_) {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
};

module.exports = { requireAuth, optionalAuth, admin };
