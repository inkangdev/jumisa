# 2026-06-14 · 부팅 로딩 화면 (까만 화면 수정)

브랜치: `feature/front-boot-loading` (main 기준)

Render 배포 후 https://jumisa.onrender.com 접속 시 **까만 화면만** 보이던 문제를 잡는다.

## 증상

폰/웹에서 사이트를 열면 한동안 까만 화면만 보임.

## 원인 (배포는 정상)

진단 결과 배포 자체는 정상이었다.

- 백엔드 health: `HTTP 200` 이지만 **첫 응답 ~39초** ← Render **무료플랜 콜드스타트**(미사용 시 spin-down, 첫 요청에서 깨어남)
- `/api/auth/me`(프론트 rewrite 경유): 백엔드 깬 뒤엔 `403 / 0.4초` (미로그인이라 403, 정상)
- 프론트 HTML/JS/CSS: 정상 로드

`App.tsx` 부팅 로직이 세션 확인(`/api/auth/me`)이 **끝나야** 화면을 그리는데:

```js
const [booting, setBooting] = useState(true);
useEffect(() => { auth.me().then(() => { ...; setBooting(false); }); }, []);
{booting ? null : <화면/>}   // booting 동안 null → 배경(#080C18)만 = 까만 화면
```

→ 콜드스타트로 `/me`가 ~40초 매달리는 동안 `booting=true` 유지 → 빈 화면(다크 배경)만 보임. 고장이 아니라 **로딩 표시 부재**.

## 한 일 (3파일)

- `frontend/src/App.tsx` — `booting` 중 `null` 대신 **`BootingView`**(🐂 로고 + 스피너 + "불러오는 중…") 렌더.
- `frontend/src/api/auth.ts` — `me()`에 **12초 타임아웃**(`AbortController`). 콜드스타트로 무한정 매달리면 null 반환 → 로그인 화면으로 진행(세션이 있었다면 재로그인).
- `frontend/src/index.css` — 스피너용 `@keyframes spin` 추가.

## 효과

콜드스타트(~40초) 동안 까만 화면 대신 로딩 표시가 뜨고, 12초 내 응답 없으면 로그인 화면으로 넘어간다.

## 검증

- 로컬에 node/npm·node_modules 없음 → `npm run build` 미실행(빌드는 Render에서 수행). 변경은 표준 DOM/React API라 타입상 안전, 코드 재검토로 확인.

## 남은 것 (후속)

- 근본 원인인 무료플랜 **spin-down**은 미해결. keep-alive 핑(health 주기 호출)으로 깨워두거나 유료($7) 상시 가동 시 콜드스타트 자체가 사라짐.
