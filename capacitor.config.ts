import type { CapacitorConfig } from '@capacitor/cli';

// Lida pelo `cap sync`; o scripts/android.mjs define TRAININGAPP_ANDROID_DEV=1 no build de desenvolvimento.
const dev = process.env['TRAININGAPP_ANDROID_DEV'] === '1';

const config: CapacitorConfig = {
  appId: 'io.github.samuelmsilva2v.trainingapp',
  appName: 'TrainingApp',
  webDir: 'dist/trainingapp-web/browser',
  // Só no dev: a página é https://localhost e a API local é http://10.0.2.2, bloqueada por padrão. Nunca no release.
  server: dev ? { cleartext: true } : undefined,
  android: dev ? { allowMixedContent: true } : undefined,
};

export default config;
