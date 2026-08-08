// Backward-compatible entry point.
// Examio now uses Firebase Realtime Database instead of Cloud Firestore.
// Keeping this file means existing components can continue importing from './lib/firebase'.
export * from './realtime';
