import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 중 /api 요청은 IntelliJ 로 띄운 Spring Boot(8080) 로 프록시 → CORS 불필요
    // /ai 요청은 파이썬 AI 서비스(ai, FastAPI :8000) 로 프록시.
    proxy: {
      '/api': 'http://localhost:8080',
      '/ai': 'http://localhost:8000',
      // OAuth2 카카오 로그인 — 백엔드(8080)로 프록시, changeOrigin:false 로 Spring이
      // 실제 요청 호스트(localhost:5173)를 redirect_uri 기준으로 사용하게 함
      '/oauth2': { target: 'http://localhost:8080', changeOrigin: false },
      '/login/oauth2': { target: 'http://localhost:8080', changeOrigin: false },
    },
  },
})
