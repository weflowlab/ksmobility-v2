import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel 이미지 변환 무료 한도(월 5천 회)를 아끼려고 최적화를 끈다.
    // 대신 public 의 원본을 1600px·q60 으로 미리 압축해 두었다 — 원본을 다시 넣을 땐 압축부터.
    unoptimized: true,
  },
};

export default nextConfig;
