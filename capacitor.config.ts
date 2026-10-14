import type { CapacitorConfig } from '@capacitor/cli';

// Lida pelo `cap sync`; o scripts/android.mjs define TRAININGAPP_ANDROID_DEV=1 no build de desenvolvimento.
const dev = process.env['TRAININGAPP_ANDROID_DEV'] === '1';

const config: CapacitorConfig = {
  appId: 'io.github.samuelmsilva2v.trainingapp',
  appName: 'TrainingApp',
  webDir: 'dist/trainingapp-web/browser',
  // Cor do fundo do app (--c-fundo) atrás da página: nada de tela branca enquanto o Angular desenha.
  backgroundColor: '#121416',
  // Só no dev: a página é https://localhost e a API local é http://10.0.2.2, bloqueada por padrão. Nunca no release.
  server: dev ? { cleartext: true } : undefined,
  android: dev ? { allowMixedContent: true } : undefined,
  plugins: {
    // Só o Google: os outros provedores ficariam embutidos no APK (o SDK do Facebook, por exemplo) sem uso.
    // Ícones claros nas barras do sistema (o app é escuro); as áreas seguras vêm nas variáveis --safe-area-inset-*.
    SystemBars: { style: 'DARK', insetsHandling: 'css' },
    SocialLogin: { providers: { google: true, facebook: false, apple: false, twitter: false } },
  },
};

export default config;
