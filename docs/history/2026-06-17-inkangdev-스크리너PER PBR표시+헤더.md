# 스크리너 PER/PBR 표시 수정 + 헤더 설명 — 2026-06-17 (inkangdev)

브랜치: `feat/screener-per-pbr` → PR

저평가 스크리너에 점수·순위는 나오는데 **PER/PBR 값이 비어 있던 문제** 수정 + 헤더 설명 추가.

## 원인

백엔드 `ScreenerRepository` 가 PER/PBR 을 `stock_daily`(일봉) 에서 조인했는데, **stock_daily 적재 잡이 미구현**이라 0건 → PER/PBR 전부 NULL.

## 해결 (undervalue_score 로 일원화)

stock_daily 적재 잡을 새로 만드는 대신, **undervalue 잡이 이미 계산하는 PER/PBR 원값을 undervalue_score 에 함께 저장**하고 백엔드가 거기서 읽도록 변경(점수와 같은 시점·소스 → 일관).

```
backend/db/schema.sql                  undervalue_score 에 per/pbr 원값 컬럼 추가
batch/.../UndervalueRepository.kt       산출 SQL 이 PER/PBR 원값도 함께 적재(round 2자리)
backend/.../ScreenerRepository.kt       PER/PBR 소스 stock_daily → undervalue_score(u.per/u.pbr).
                                        정렬(PER순/PBR순)·필터(perMax/pbrMax)도 u.per/u.pbr 기준. stock_daily LEFT JOIN 제거.
frontend/.../UndervalueScreen.tsx       헤더에 설명 추가(원형=저평가 점수 0~100, 오른쪽=현재가·등락률)
```

## 검증

- undervalue_score 에 per/pbr 채워짐: pbr 2,312/2,314, per 1,439/2,314 (PER 은 순이익 ≤0 적자기업 제외 → NULL, 설계대로).
- 백엔드 스크리너 쿼리(db 직접 실행): rank·total_score·per·pbr·현재가·등락률 정상 반환. 상위 종목 PBR 0.15~0.22(저PBR=저평가).
- 등락률 0.00 은 장외 시각이라 정상(장중 채워짐).

## 메모

- PER 빈 종목(적자) 처리: 화면은 "-" 로 표기됨. 적자기업이 PBR+성장률만으로 상위에 오르는 점수 왜곡은 별도 보정 후보(4지표 필수 or 결측 페널티).
- stock_daily 는 여전히 비어 있음(일봉 적재 잡 미구현). 현재 스크리너는 stock_daily 의존하지 않음.
