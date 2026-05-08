import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lexa.app',
  appName: 'Lexa',
  webDir: 'www',
  server: {
    url: 'https://4d456e28-9685-4779-b23c-e5cfec1038e3.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  backgroundColor: '#0C0C0C',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0C0C0C',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Default',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  ios: {
    backgroundColor: '#0C0C0C',
  },
  android: {
    backgroundColor: '#0C0C0C',
  },
};

export default config;
