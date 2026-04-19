import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // استخدم './' ليتمكن الأندرويد من العثور على الملفات في أي بيئة
  base: './',
  plugins: [
    react()
  ],
  server: {
    host: true, // يسمح بالوصول من أجهزة الشبكة المحلية
  },
})