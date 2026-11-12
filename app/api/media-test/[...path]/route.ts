// 임시 측정용 — Neon Object Storage 의 파일을 사이트 도메인으로 내보내며
// Vercel CDN 에 캐시되게 한다. 속도 측정이 끝나면 이 파일은 삭제한다.
const ORIGIN =
  "https://br-silent-tree-b3otwum4.storage.c-4.ap-southeast-1.aws.neon.tech/testt";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstream = await fetch(
    `${ORIGIN}/${path.map(encodeURIComponent).join("/")}`,
  );
  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      // 브라우저 1일, Vercel CDN 1년 캐시
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
    },
  });
}
