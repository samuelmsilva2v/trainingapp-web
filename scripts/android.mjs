// Gera o front para o app e roda no Android: `npm run android` (API de produção) ou `npm run android:dev`
// (emulador contra a API local). Um script em vez de variáveis no package.json porque o npm no Windows usa o cmd.
import { execSync } from 'node:child_process';

const dev = process.argv[2] === 'dev';
const env = { ...process.env, TRAININGAPP_ANDROID_DEV: dev ? '1' : '0' };
const rodar = cmd => execSync(cmd, { stdio: 'inherit', env });

rodar(`npx ng build --configuration ${dev ? 'development,android-dev' : 'production,android'}`);
rodar('npx cap sync android');
rodar('npx cap run android');
