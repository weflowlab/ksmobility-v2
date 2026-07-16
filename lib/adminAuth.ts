import crypto from "crypto";
import { cookies } from "next/headers";

// 서명 비밀키: 세션 서명용. 없으면 비밀번호로 대체(그래도 서명은 됨).
const SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.ADMIN_PASSWORD ||
  "ksmobility-dev-secret";

export const ADMIN_COOKIE = "ks_admin";
export const ADMIN_MAX_AGE = 60 * 60 * 24 * 7; // 7일(초)

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

// 만료시각 + 서명으로 구성된 세션 토큰 (서버 저장 없이 검증 가능)
export function createSession(): string {
  const exp = String(Date.now() + ADMIN_MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(exp);
  // 타이밍 공격 방지 비교
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    return false;
  return Number(exp) > Date.now();
}

// 서버 라우트에서 현재 요청이 관리자 인증된 상태인지 (httpOnly 쿠키 기반)
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(ADMIN_COOKIE)?.value);
}