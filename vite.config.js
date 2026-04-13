import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // استخدم './' ليتمكن الأندرويد من العثور على الملفات في أي بيئة
  base: './', 
  plugins: [
    react(),
    basicSsl()
  ],
})