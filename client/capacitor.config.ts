import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.knowted.app',
  appName: 'Knowted',
  webDir: 'dist',
  server: {
    url: "http://10.57.59.62:8080",
    cleartext: true
  }
};

export default config;
