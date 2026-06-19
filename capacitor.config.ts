import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nus.ping',
  appName: 'PING',
  webDir: 'www',
  // The world is black. Match it everywhere the web view isn't yet painted.
  backgroundColor: '#0A0A0C',
  ios: {
    backgroundColor: '#0A0A0C',
    contentInset: 'never',   // we own the safe areas in CSS (env(safe-area-inset-*))
    scrollEnabled: false,    // no rubber-band bounce; the playfield never scrolls
  },
};

export default config;
