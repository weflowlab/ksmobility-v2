import type { MetadataRoute } from "next";

const SITE_URL = "https://teukjangman.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 관리자 화면과 API 는 검색 노출 대상이 아니다.
      // (/admin 은 layout 의 robots 메타로도 noindex 처리되어 있다)
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
