import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base: './' -- rutas relativas en el build, para que el mismo `dist/`
// funcione dentro de Capacitor (Android), no solo servido desde la raíz
// de un dominio.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    // 5173 SudoCam, 5174 TaskCam, 5175 PokCam: MerCam usa el siguiente.
    port: 5176,
    strictPort: true,
    // En desarrollo, /api va al servidor de búsqueda (npm run servidor).
    proxy: {
      '/api': 'http://localhost:3010',
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
