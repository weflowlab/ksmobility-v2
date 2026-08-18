import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

// 서버 전용 Neon(Postgres) 연결.
//
// DATABASE_URL 은 DB 전체 권한을 가진 연결 문자열이다. 절대 NEXT_PUBLIC_ 접두사를
// 붙이지 말 것 — 붙이는 순간 브라우저 번들에 박혀 DB 전체가 공개된다.
// 이 모듈은 API 라우트와 서버 컴포넌트에서만 import 되어야 한다.
//
// 지연 초기화: 모듈 로드 시점이 아니라 실제 요청 시점에 연결을 만든다.
// (next build 단계에서 env 없이 모듈을 평가해도 throw 하지 않도록)
//
// 권한 통제는 DB가 아니라 이 앱의 서버 라우트가 한다:
//   - 공개: 문의 접수(POST), 게시된 공지·FAQ 조회
//   - 관리자 전용: 그 외 전부 (lib/adminAuth.ts 의 httpOnly 쿠키로 검증)
export function getSql(): NeonQueryFunction<false, false> {
  if (client) return client;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Neon 환경변수(DATABASE_URL)가 설정되지 않았습니다.");
  }

  client = neon(url);
  return client;
}
