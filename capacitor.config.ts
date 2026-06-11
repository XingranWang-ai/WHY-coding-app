import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.why.learn',
  appName: 'Why',
  webDir: 'dist',
  backgroundColor: '#f4efe5',
  android: {
    backgroundColor: '#f4efe5',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
