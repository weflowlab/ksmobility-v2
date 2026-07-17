"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// 방문자 ID — 기기당 하루 1회만 카운트 (영구 기기ID[localStorage] + 한국시간 날짜)
// 같은 기기·같은 날의 여러 방문/탭은 하나로 묶여 방문자 1명으로 집계된다.
function getSessionId(): string {
  const KEY = "ks_did";
  let did = localStorage.getItem(KEY);
  if (!did) {
    did = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, did);
  }
  // 한국시간(KST, UTC+9) 기준 날짜(YYYY-MM-DD)
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return `${did}-${day}`;
}

// 추적 제외 — 로컬 개발 + vercel 기본/미리보기 도메인 + 본인 브라우저 opt-out.
// 실제 방문 집계는 커스텀 도메인 연결 후부터 잡힌다(테스트 트래픽 오염 방지).
function trackingDisabled(): boolean {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local"))
    return true;
  if (host.endsWith(".vercel.app")) return true;
  return localStorage.getItem("ks_notrack") === "1";
}

export default function PageTracker() {
  const pathname = usePathname();
  const current = useRef<{ id: string; entry: number; flushed: boolean } | null>(
    null,
  );
  const maxScroll = useRef(0);

  // 관리자 페이지는 추적 제외
  const isAdmin = pathname?.startsWith("/admin");

  // 현재 스크롤 최대 도달률(%) 갱신
  // Lenis 는 기본 설정에서 실제 window 를 스크롤하므로 scrollY 로 측정된다.
  const measureScroll = () => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const pct =
      scrollable <= 0
        ? 100
        : Math.round(((window.scrollY || doc.scrollTop) / scrollable) * 100);
    const clamped = Math.max(0, Math.min(pct, 100));
    if (clamped > maxScroll.current) maxScroll.current = clamped;
  };

  // 체류시간 + 스크롤 도달률 전송 (fire-and-forget)
  const flush = () => {
    const c = current.current;
    if (!c || c.flushed) return;
    c.flushed = true;
    measureScroll();
    const durationMs = Math.round(performance.now() - c.entry);
    const payload = JSON.stringify({
      type: "duration",
      id: c.id,
      durationMs,
      maxScroll: maxScroll.current,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([payload], { type: "application/json" }),
      );
    } else {
      fetch("/api/track", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    }
  };

  useEffect(() => {
    if (isAdmin) return;

    // 개발/본인 방문 제외: URL 플래그(?notrack=1 / ?track=1)로 opt-out 토글
    const params = new URLSearchParams(window.location.search);
    if (params.get("notrack") === "1") localStorage.setItem("ks_notrack", "1");
    if (params.get("track") === "1") localStorage.removeItem("ks_notrack");
    if (trackingDisabled()) return;

    // 이전 페이지 체류시간 마감 후 새 페이지용으로 스크롤 초기화
    flush();
    maxScroll.current = 0;

    const body = {
      sessionId: getSessionId(),
      path: pathname,
      referrer: document.referrer,
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
    };

    let active = true;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.id)
          current.current = { id: d.id, entry: performance.now(), flushed: false };
      })
      .catch(() => {});

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAdmin]);

  // 스크롤 최대 도달률 추적 (rAF 스로틀)
  useEffect(() => {
    if (isAdmin) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        measureScroll();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // 탭 닫기 / 백그라운드 전환 시 체류시간 마감, 복귀 시 재측정
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onShow = () => {
      const c = current.current;
      if (c && document.visibilityState === "visible") {
        c.entry = performance.now();
        c.flushed = false;
      }
    };
    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pagehide", flush);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}