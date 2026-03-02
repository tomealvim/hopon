import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hopon.app',
  appName: 'HopOn',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#F5E6D3',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
