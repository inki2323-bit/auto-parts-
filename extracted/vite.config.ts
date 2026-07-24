import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const getCleanEnvValue = (key: string, defaultValue: string = ""): string => {
  const allEnv = process.env;
  
  // 1. Direct match if it doesn't contain concatenated patterns of key-value pairs
  if (allEnv[key] && !allEnv[key].includes("VITE_FIREBASE_") && !allEnv[key].includes("GOOGLE_MAPS_")) {
    return allEnv[key];
  }

  // 2. Scan all env values to find if there's a concatenated pattern like: "SOME_KEY some_value"
  for (const envKey of Object.keys(allEnv)) {
    const val = String(allEnv[envKey]);
    if (val.includes(key)) {
      const index = val.indexOf(key);
      const sub = val.substring(index + key.length).trim();
      const parts = sub.split(/\s+/);
      if (parts[0]) {
        return parts[0];
      }
    }
  }

  // 3. Fallback to direct env value if we split it
  if (allEnv[key]) {
    const parts = allEnv[key].split(/\s+/);
    if (parts.length > 1) {
      return parts.slice(1).join(" ");
    }
    return allEnv[key];
  }

  return defaultValue;
};

const cleanApiKey = getCleanEnvValue("VITE_FIREBASE_API_KEY");
const cleanAuthDomain = getCleanEnvValue("VITE_FIREBASE_AUTH_DOMAIN");
const cleanProjectId = getCleanEnvValue("VITE_FIREBASE_PROJECT_ID");
const cleanStorageBucket = getCleanEnvValue("VITE_FIREBASE_STORAGE_BUCKET");
const cleanMessagingSenderId = getCleanEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID");
const cleanAppId = getCleanEnvValue("VITE_FIREBASE_APP_ID");
const cleanGoogleMapsKey = getCleanEnvValue("GOOGLE_MAPS_PLATFORM_KEY") || getCleanEnvValue("VITE_GOOGLE_MAPS_PLATFORM_KEY") || cleanApiKey;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(cleanGoogleMapsKey),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(cleanApiKey),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(cleanAuthDomain),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(cleanProjectId),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(cleanStorageBucket),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(cleanMessagingSenderId),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(cleanAppId),
      'import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(cleanGoogleMapsKey),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(cleanApiKey),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(cleanAuthDomain),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(cleanProjectId),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(cleanStorageBucket),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(cleanMessagingSenderId),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(cleanAppId)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
