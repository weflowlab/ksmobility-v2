import { NextResponse } from "next/server";
import { pageViewStore } from "@/lib/store";

// user-agent → mobile | tablet | desktop
function detectDevice(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android/.test(s)) return "mobile";
  return "desktop";
}

// referrer 도메인 → 유입 소스 정규화
function normalizeSource(referrer: string, host: string): string {
  if (!referrer) return "direct";
  let h = "";
  try {
    h = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  const ownHost = host.split(":")[0].toLowerCase(); // Host 헤더의 포트 제거
  if (ownHost && (h === ownHost || h.endsWith("." + ownHost))) return "direct"; // 내부 이동
  if (h.includes("kakao")) return "kakao";
  if (h.includes("naver")) return "naver";
  if (h.includes("instagram")) return "instagram";
  if (h.includes("facebook")) return "facebook";
  if (h.includes("google")) return "google";
  if (h.includes("daum")) return "daum";
  if (h === "t.co" || h.includes("twitter") || h.includes("x.com"))
    return "twitter";
  if (h.includes("youtube")) return "youtube";
  if (h.includes("tiktok")) return "tiktok";
  return h.replace(/^www\./, "");
}

// 인앱 브라우저는 referrer를 숨기므로 User-Agent로 유입 소스를 판별
// (인스타/카톡/밴드/페북 등 앱 안에서 링크를 열면 UA에 앱 이름이 남는다)
function detectAppSource(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes("instagram")) return "instagram";
  if (/fban|fbav|fb_iab|fbios/.test(s)) return "facebook";
  if (s.includes("kakaotalk")) return "kakao";
  if (/\bband\//.test(s)) return "band"; // 네이버 밴드 인앱
  if (s.includes("naver")) return "naver"; // 네이버 앱 인앱
  if (/line\//.test(s)) return "line";
  if (s.includes("daumapps")) return "daum";
  if (/musical_ly|tiktok/.test(s)) return "tiktok";
  return "";
}

// 봇 간단 필터
function isBot(ua: string): boolean {
  return /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|headless/i.test(
    ua,
  );
}

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (isBot(ua)) return NextResponse.json({ ok: true, skipped: "bot" });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  // 1) 체류시간 + 스크롤 도달률 갱신 (페이지 이탈 시 sendBeacon 으로 도착)
  if (body.type === "duration" && typeof body.id === "string") {
    // 0~1시간 클램프 — 탭을 열어둔 채 방치한 경우가 평균을 망가뜨리지 않도록
    const ms = Math.max(0, Math.min(Number(body.durationMs) || 0, 1000 * 60 * 60));
    const scroll =
      body.maxScroll != null
        ? Math.max(0, Math.min(Math.round(Number(body.maxScroll)) || 0, 100))
        : undefined;
    await pageViewStore.setDuration(body.id, ms, scroll);
    return NextResponse.json({ ok: true });
  }

  // 2) 새 방문 기록
  const sessionId = String(body.sessionId || "");
  const path = String(body.path || "");
  if (!sessionId || !path)
    return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const referrer = String(body.referrer || "");
  const host = req.headers.get("host") || "";
  const utmSource = body.utmSource ? String(body.utmSource).toLowerCase() : "";
  // 우선순위: UTM 태그 > 인앱 브라우저(UA) 판별 > referrer 도메인
  const source = utmSource || detectAppSource(ua) || normalizeSource(referrer, host);

  const { id } = await pageViewStore.create({
    sessionId,
    path,
    referrer,
    source,
    medium: body.utmMedium ? String(body.utmMedium) : "",
    campaign: body.utmCampaign ? String(body.utmCampaign) : "",
    device: detectDevice(ua),
  });
  return NextResponse.json({ id });
}