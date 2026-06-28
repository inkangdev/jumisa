# web SPA 캐시 헤더 수정 — 배포 후 대시보드(홈) 미표시 해결

작업자: inkangdev / 2026-06-29

## 증상
로그인 후 홈 탭에 **대시보드가 안 보임**(옛 화면/플레이스홀더가 남음).

## 원인 (배포·빌드·라우팅은 정상)
- 소스/배포 번들 정상: `AppShell` 기본 탭 `home`→`<DashboardScreen/>` 연결, 하단 NAV에 `home(🏠 홈)` 존재, 배포 번들에 `/api/dashboard` 포함, API 인증 호출 200 확인.
- 진짜 원인은 **nginx 캐시 헤더 누락**. 진입점 `index.html` 에 `Cache-Control` 이 없어 브라우저가 옛 `index.html` 을 캐시 → 그게 **옛 번들 해시**를 가리킴 → 배포로 새 화면(대시보드)이 나가도 **재방문 사용자에겐 옛 화면이 잔존**.
- Vite 산출물은 파일명에 콘텐츠 해시가 박히므로(assets/index-XXXX.js) 진입점만 항상 최신으로 받으면 새 번들이 즉시 반영된다.

## 수정 (`deploy/nginx.conf`)
- `location = /index.html` → `Cache-Control: no-cache, no-store, must-revalidate` (항상 최신 진입점).
- `location /assets/` → `Cache-Control: public, max-age=31536000, immutable` (해시 박힌 정적 자산은 영구 캐시 → 성능↑, 안전).
- 기존 `location /`(SPA fallback)·프록시(/api·/ai·/oauth2)·헤더는 그대로.

## 검증
- compose 네트워크(jumisa_default)에서 `nginx -t` → **syntax ok / test successful**.
- 배포 후 기대: 재방문 시 index.html 재검증 → 새 번들 로드 → 로그인 후 대시보드 정상 표시. (기존 사용자 1회 강력 새로고침이면 즉시 해소, 이후로는 재발 없음.)

## 비고
- backend/배치/마이그레이션(V3 market_index)·대시보드 API 자체는 정상이었음(별도 이슈 아님).
- 부수효과: 모든 배포에서 "옛 화면 잔존" 문제 구조적으로 차단.
