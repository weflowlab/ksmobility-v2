import type { MetadataRoute } from "next";

// 끝의 슬래시를 붙인다 — 도메인만 있는 형태(https://example.com)는
// 네이버 서치어드바이저 등에서 유효하지 않은 URL 로 반려된다.
const SITE_URL = "https://teukjangman.kr/";

// 단일 페이지(원페이지) 사이트라 홈만 등록한다.
// 섹션 앵커(#lineup 등)는 별도 URL 이 아니므로 사이트맵 대상이 아니다.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
