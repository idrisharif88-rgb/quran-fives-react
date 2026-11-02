/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'node',
  },
  // استخدم './' ليتمكن الأندرويد من العثور على الملفات في أي بيئة
  base: './',
  plugins: [
    react(),
    // للموقع وحده: src/utils/webShell.js يسجّل عامل الخدمة خارج التطبيق فقط
    VitePWA({
      injectRegister: null,
      registerType: 'prompt',
      manifest: {
        name: 'خماسيات',
        short_name: 'خماسيات',
        lang: 'ar',
        dir: 'rtl',
        display: 'standalone',
        start_url: './',
        scope: './',
        background_color: '#f4f6f8',
        theme_color: '#0f5132',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // صفحات المصحف 47 ميغابايت: تُخزَّن كل صفحة عند أول فتح لها، لا كلّها دفعة واحدة
        globPatterns: ['**/*.{js,css,html,woff2,mp3,svg,png}'],
        globIgnores: ['mushaf/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [{
          urlPattern: /\/mushaf\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'mushaf-pages',
            expiration: { maxEntries: 700 },
            cacheableResponse: { statuses: [200] },
          },
        }],
      },
    }),
  ],
  server: {
    host: true, // يسمح بالوصول من أجهزة الشبكة المحلية
  },
})
