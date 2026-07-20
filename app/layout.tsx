import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PageTracker from "@/components/PageTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://teukjangman.kr";
const SITE_NAME = "특장카니발 특장맨";
const SITE_TITLE = "특장카니발 특장맨 — 프리미엄 특장 카니발 전문";
const SITE_DESC =
  "특장카니발 특장맨 · 프리미엄 특장 카니발 제작·커스텀 전문. 인천 남동구. 상담 문의 환영.";

export const metadata: Metadata = {
  // OG 이미지 등 상대경로를 절대 URL 로 바꿔주는 기준 주소
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESC,
    // 카카오톡·SNS 미리보기용 (1200x630 규격, /public/og.jpg)
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "특장카니발 특장맨 — 프리미엄 특장 카니발",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/og.jpg"],
  },
  // 검색엔진 소유확인 — 네이버 서치어드바이저(웹마스터 도구)
  verification: {
    other: {
      "naver-site-verification": "c61a7567da559187436e4f6f4dcde3a0a06f4101",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PageTracker />
      </body>
    </html>
  );
}
