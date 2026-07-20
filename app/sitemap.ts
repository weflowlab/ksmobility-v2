import type { MetadataRoute } from "next";

const SITE_URL = "https://teukjangman.kr";

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
