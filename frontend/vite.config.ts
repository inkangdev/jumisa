import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 중 /api 요청은 IntelliJ 로 띄운 Spring Boot(8080) 로 프록시 → CORS 불필요
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
