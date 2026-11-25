import type { CapacitorConfig } from '@capacitor/cli';

// The app wraps the built website (dist/). The appId is registered on App Store Connect as com.eldermaps.app and cannot be changed.
const config: CapacitorConfig = {
  appId: 'com.eldermaps.app',
  appName: 'ElderMaps',
  webDir: 'dist',
  backgroundColor: '#0b0d10',
  server: {
    // Android serves the pages from https://localhost; iOS from capacitor://localhost (both are allowed by the server's CORS list and the Maps key)
    androidScheme: 'https',
  },
  ios: { contentInset: 'never', backgroundColor: '#0b0d10' },
  android: { backgroundColor: '#0b0d10', adjustMarginsForEdgeToEdge: 'force' },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#000000', showSpinner: false },
  },
};

export default config;
