import { Platform } from 'react-native';

export interface FirebaseBackendConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface CloudinaryBackendConfig {
  cloudName: string;
  uploadPreset: string;
}

const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>;

export function getApiBaseUrl(): string {
  return (
    env.API_BASE_URL ||
    env.REACT_NATIVE_API_BASE_URL ||
    (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
  ).replace(/\/$/, '');
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function getFirebaseConfig(): FirebaseBackendConfig {
  return {
    apiKey: env.REACT_NATIVE_FIREBASE_API_KEY || 'AIzaSyBTfivYbxE7PDB7FxyAlJjFDid6LKPplx8',
    authDomain: env.REACT_NATIVE_FIREBASE_AUTH_DOMAIN || 'auto-parts-market-place-20312.firebaseapp.com',
    projectId: env.REACT_NATIVE_FIREBASE_PROJECT_ID || 'auto-parts-market-place-20312',
    storageBucket: env.REACT_NATIVE_FIREBASE_STORAGE_BUCKET || 'auto-parts-market-place-20312.firebasestorage.app',
    messagingSenderId: env.REACT_NATIVE_FIREBASE_MESSAGING_SENDER_ID || '751764116522',
    appId: env.REACT_NATIVE_FIREBASE_APP_ID || '1:751764116522:android:f4705ee3aed7aa197adf53',
  };
}

export function getCloudinaryConfig(): CloudinaryBackendConfig {
  return {
    cloudName: env.REACT_NATIVE_CLOUDINARY_CLOUD_NAME || 'rqf1hlrx',
    uploadPreset: env.REACT_NATIVE_CLOUDINARY_UPLOAD_PRESET || 'autoparts_upload',
  };
}
