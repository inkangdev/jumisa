// 세션 만료(401) 전역 신호.
// 로그인 후 인증이 필요한 API 가 401 을 받으면 notifyUnauthorized() 를 호출하고,
// App 이 등록한 핸들러가 사용자 상태를 비우고 로그인 화면으로 보낸다.
// (로그인/세션확인(me) 의 401 은 만료가 아니라 정상 흐름이라 여기서 다루지 않는다.)

type Handler = () => void;

let handler: Handler | null = null;

export function onUnauthorized(cb: Handler): void {
  handler = cb;
}

export function notifyUnauthorized(): void {
  handler?.();
}
