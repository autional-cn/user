import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

function normalizeViteBase(p: string | undefined): string {
  if (!p || p === '/') return '/';
  if (p.includes('Program Files')) {
    throw new Error('MSYS2 path corruption detected on BASE_PATH: ' + p + '. Use PowerShell to build.');
  }
  return p.replace(/\/$/, '') + '/';
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'service-worker',
      filename: 'sw.js',
      manifest: false,
      // U83：全自动即时更新 —— 配合 sw.js 的 self.skipWaiting()/clients.claim()，
      // 客户端脚本在 activated(isUpdate) 时自动 reload（此前缺省 'prompt' 且无 onNeedRefresh
      // 消费方 ⇒ 新 SW 长期停在 waiting，修复对回访者不可见）。
      registerType: 'autoUpdate',
      injectManifest: {
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ].filter(Boolean),
  base: normalizeViteBase(process.env.BASE_PATH),
  resolve: {
    extensions: ['.mjs', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 13104,
    proxy: {
      '/bff': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
      '/oauth/': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 13104,
    proxy: {
      '/bff': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-ui': ['lucide-react'],
          'shared': ['@autional-cn/shared'],
        },
      },
    },
  },
});
