import { defineConfig } from 'vite';
import { resolve } from 'path';
import { terser } from '@rollup/plugin-terser';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'app/index.html'),
        onboarding: resolve(__dirname, 'app/onboarding.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      },
      plugins: [terser({ compress: { drop_console: true, drop_debugger: true } })]
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
