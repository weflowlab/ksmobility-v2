"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { GALLERY } from "./gallery";
import type { FaqView, NoticeView } from "./defaults";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* Brand & contact info */
const BRAND = "특장카니발 특장맨";
const PHONE = "010-8449-4347";
const PHONE_TEL = "01084494347";
const ADDRESS = "인천 남동구 청능대로 405";
const KAKAO = "https://open.kakao.com/o/s0xvjpBh";
const YOUTUBE_CHANNEL = "https://youtube.com/@special_carnival";
const INSTA = "https://www.instagram.com/teukjang_man/"; // TODO: 인스타그램 계정 확정 시 실제 링크로 교체
const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(ADDRESS)}&z=16&output=embed`;

const HERO_SLIDES = [
  "/hero/01.jpg",
  "/hero/02.jpg",
  "/hero/03.jpg",
  "/hero/04.jpg",
  "/hero/05.jpg",
  "/hero/06.jpg",
  "/hero/07.jpg",
  "/hero/08.jpg",
  "/hero/09.jpg",
];

/* 라인업 — 8개 상품 (사진: /public/lineup) */
// dir = /public/products 의 폴더 번호. 진열 순서와 사진 폴더를 분리해 두어야
// 순서를 바꿔도 카드와 갤러리가 어긋나지 않는다. (배열 위치로 갤러리를 찾으면
// 순서 변경 시 다른 상품 사진이 열린다)
// M 패키지(dir 4)는 고객 요청으로 라인업에서 제외 — 사진은 그대로 보관.
const PRODUCTS = [
  { dir: 1, name: "K-2 패키지", tag: "IVORY", img: "/lineup/01.jpg" },
  { dir: 2, name: "K-2 패키지", tag: "SKY BLUE", img: "/lineup/02.jpg" },
  { dir: 5, name: "K-2 패키지", tag: "ORANGE BEIGE", img: "/lineup/05.jpg" },
  { dir: 7, name: "K-2 패키지", tag: "BLACK IVORY", img: "/lineup/07.jpg" },
  { dir: 6, name: "B 패키지 (패밀리 패키지)", tag: "RED", img: "/lineup/06.jpg" },
  { dir: 3, name: "S-2 패키지", tag: "VANILLA", img: "/lineup/03.jpg" },
  { dir: 8, name: "파티션 모델 퍼스트 패키지", tag: "KHAKI", img: "/lineup/08.jpg" },
];

// 상품이 실제로 쓰는 갤러리 사진 목록 (GALLERY 는 폴더 번호 순서로 생성된 배열)
const galleryOf = (i: number): string[] => GALLERY[PRODUCTS[i].dir - 1] ?? [];

/* 인스타그램 핀 스크롤 시퀀스 (첫 슬라이드 = 인스타그램) */
const SEQ: {
  tag: string;
  title: string;
  desc: string;
  href: string | null;
  cta: string | null;
  img: string | null;
  imgMobile: string | null;
}[] = [
  {
    tag: "SOCIAL",
    title: "온라인에서도 투명하게",
    desc: "인스타그램 · 유튜브 · 틱톡 · 블로그에서 실제 시공 과정과 사례를 꾸준히 공개합니다.",
    href: null,
    cta: null,
    img: null,
    imgMobile: null,
  },
  {
    tag: "INSTAGRAM",
    title: "인스타그램",
    desc: "@teukjang_man",
    href: "https://www.instagram.com/teukjang_man/",
    cta: "팔로우하기",
    img: "/sns/instagram.jpg",
    imgMobile: "/sns/instagram-m.jpg",
  },
  {
    tag: "YOUTUBE",
    title: "유튜브",
    desc: "@special_carnival",
    href: "https://youtube.com/@special_carnival?si=qaMjhVckbARXcWQh",
    cta: "구독하기",
    img: "/sns/youtube.jpg",
    imgMobile: "/sns/youtube-m.jpg",
  },
  {
    tag: "TIKTOK",
    title: "틱톡",
    desc: "@special_carnibal",
    href: "https://www.tiktok.com/@special_carnibal",
    cta: "팔로우하기",
    img: "/sns/tiktok.jpg",
    imgMobile: "/sns/tiktok-m.jpg",
  },
  {
    tag: "BLOG",
    title: "블로그",
    desc: "네이버 블로그",
    href: "https://blog.naver.com/juju9214",
    cta: "블로그 보기",
    img: "/sns/blog.jpg",
    imgMobile: "/sns/blog-m.jpg",
  },
];

/* 특장 카니발 숏폼 — 고객 유튜브 쇼츠 (세로 9:16) 임베드.
   ID = 쇼츠 URL의 /shorts/ 뒤 부분.  예) https://youtube.com/shorts/AbC123dEfG → "AbC123dEfG" */
const SHORTS = [
  { id: "CG9h30DvzZo", title: "특장 카니발 쇼츠 01" },
  { id: "J1NWLuvqbvk", title: "특장 카니발 쇼츠 02" },
  { id: "fWh4cC6tlgc", title: "특장 카니발 쇼츠 03" },
  { id: "_uwwNsEuB8U", title: "특장 카니발 쇼츠 04" },
  { id: "Qu-QkdaLna0", title: "특장 카니발 쇼츠 05" },
  { id: "sI0arjurLKE", title: "특장 카니발 쇼츠 06" },
  { id: "0UtW_GblzNs", title: "특장 카니발 쇼츠 07" },
  { id: "Ml6KROTAepQ", title: "특장 카니발 쇼츠 08" },
];

export default function HomeClient({
  notices,
  faqs,
}: {
  notices: NoticeView[];
  faqs: FaqView[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [gallery, setGallery] = useState<number | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const reduce = useReducedMotion();

  // Product gallery keyboard nav: Esc closes, ←/→ navigate.
  useEffect(() => {
    if (gallery === null) return;
    const len = galleryOf(gallery).length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGallery(null);
      else if (e.key === "ArrowLeft")
        setGalleryIdx((n) => (n - 1 + len) % (len || 1));
      else if (e.key === "ArrowRight")
        setGalleryIdx((n) => (n + 1) % (len || 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery]);

  // Keep the active thumbnail centered as photos change.
  useEffect(() => {
    if (gallery === null) return;
    const el = document.querySelector<HTMLElement>(
      `[data-thumb="${galleryIdx}"]`,
    );
    el?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [gallery, galleryIdx]);

  // Smooth (momentum) scrolling for the landing page + smooth anchor nav.
  // Always start at the top on load/refresh; integrates with GSAP ScrollTrigger.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    if (reduce) return; // respect reduced-motion: keep native scrolling

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.scrollTo(0, { immediate: true });

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Smooth-scroll in-page anchor links (offset for the fixed header).
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]');
      const href = a?.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target as HTMLElement, { offset: -80 });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [reduce]);

  useEffect(() => {
    const t = setInterval(
      () => setSlide((s) => (s + 1) % HERO_SLIDES.length),
      4500,
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      if (y < 80) setHeaderHidden(false);
      else if (y > lastY && y > 120) setHeaderHidden(true);
      else if (y < lastY) setHeaderHidden(false);
      lastY = y;
    };
    onScroll();
    const onMove = (e: MouseEvent) => {
      if (e.clientY < 80) setHeaderHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  /* ── GSAP ScrollTrigger interactions ── */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isReduced: "(prefers-reduced-motion: reduce)",
          isOk: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const conditions = ctx.conditions as {
            isReduced: boolean;
            isOk: boolean;
          };

          if (conditions.isReduced) {
            gsap.set("[data-reveal]", { opacity: 1, y: 0 });
            document
              .querySelectorAll<HTMLElement>("[data-counter]")
              .forEach((el) => {
                el.textContent = el.dataset.to ?? "";
              });
            // Show only the first sequence slide, static.
            gsap.set("[data-seq-img]", { autoAlpha: 0 });
            const first = document.querySelector<HTMLElement>("[data-seq-img]");
            if (first) gsap.set(first, { autoAlpha: 1 });
            return;
          }

          /* Staggered reveals */
          gsap.utils
            .toArray<HTMLElement>("[data-reveal-group]")
            .forEach((group) => {
              gsap.from(group.querySelectorAll("[data-reveal]"), {
                y: 44,
                opacity: 0,
                duration: 0.9,
                ease: "power3.out",
                stagger: 0.12,
                // Clear the inline transform after reveal so CSS hover:scale works.
                clearProps: "transform",
                scrollTrigger: { trigger: group, start: "top 82%" },
              });
            });

          /* Solo reveals */
          gsap.utils
            .toArray<HTMLElement>("[data-reveal-solo]")
            .forEach((el) => {
              gsap.from(el, {
                y: 44,
                opacity: 0,
                duration: 0.9,
                ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 85%" },
              });
            });

          /* Scrubbed parallax (taller-than-container media slides within overflow) */
          gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
            gsap.fromTo(
              el,
              { yPercent: -8 },
              {
                yPercent: 8,
                ease: "none",
                scrollTrigger: {
                  trigger: el.parentElement,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          });

          /* Animated counters */
          gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
            const to = Number(el.dataset.to ?? 0);
            const obj = { v: 0 };
            ScrollTrigger.create({
              trigger: el,
              start: "top 88%",
              once: true,
              onEnter: () =>
                gsap.to(obj, {
                  v: to,
                  duration: 1.6,
                  ease: "power2.out",
                  onUpdate: () => (el.textContent = String(Math.round(obj.v))),
                }),
            });
          });

          /* Infinite marquee */
          gsap.utils.toArray<HTMLElement>("[data-marquee]").forEach((track) => {
            gsap.to(track, {
              xPercent: -50,
              repeat: -1,
              duration: 22,
              ease: "none",
            });
          });

          /* About: full-shot headline rises line-by-line (masked reveal) */
          const about = document.querySelector<HTMLElement>("[data-about]");
          if (about) {
            const tl = gsap.timeline({
              scrollTrigger: { trigger: about, start: "top 78%" },
            });
            tl.from(about.querySelectorAll(".about-eyebrow"), {
              opacity: 0,
              y: 20,
              duration: 0.6,
              ease: "power2.out",
            })
              .from(
                about.querySelectorAll<HTMLElement>(".about-line"),
                {
                  yPercent: 120,
                  duration: 1,
                  ease: "power4.out",
                  stagger: 0.15,
                },
                "-=0.2",
              )
              .from(
                about.querySelectorAll(".about-sub"),
                { opacity: 0, y: 20, duration: 0.6, ease: "power2.out" },
                "-=0.35",
              );
          }

          /* ── Pinned sequence: 스크롤로 한 장씩 '하드컷' 전환 (크로스페이드 없음) ── */
          const seq = document.querySelector<HTMLElement>("[data-seq]");
          if (seq) {
            const pinEl = seq.querySelector<HTMLElement>("[data-seq-pin]");
            const imgs = gsap.utils.toArray<HTMLElement>("[data-seq-img]", seq);
            const dots = gsap.utils.toArray<HTMLElement>("[data-seq-dot]", seq);
            if (pinEl && imgs.length > 1) {
              const show = (idx: number) => {
                imgs.forEach((im, i) =>
                  gsap.set(im, { autoAlpha: i === idx ? 1 : 0 }),
                );
                dots.forEach((d, i) => {
                  d.style.height = i === idx ? "28px" : "8px";
                  d.style.backgroundColor =
                    i === idx ? "#ffffff" : "rgba(255,255,255,0.3)";
                });
              };
              show(0);

              ScrollTrigger.create({
                trigger: seq,
                start: "top top",
                // 슬라이드당 스크롤 거리를 짧게(50vh) → 스크롤 한 번에 한 칸씩.
                end: "+=" + imgs.length * 50 + "%",
                pin: pinEl,
                // 스크롤 방향으로 다음 슬라이드에 딱 맞춰 정지(방향성 스냅).
                snap: {
                  snapTo: 1 / (imgs.length - 1),
                  duration: { min: 0.15, max: 0.3 },
                  ease: "power1.inOut",
                  directional: true,
                },
                refreshPriority: 1,
                // 진행도를 반올림해 활성 슬라이드만 즉시 표시(겹침·페이드 없음)
                onUpdate: (self) =>
                  show(Math.round(self.progress * (imgs.length - 1))),
              });
            }
          }
        },
      );
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-screen w-full">
      {/* ── Header ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${headerHidden ? "-translate-y-full" : "translate-y-0"} ${
          scrolled
            ? "border-white/10 bg-[#0a0a0b]/80"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex-1" />

          <a
            href="#top"
            className="whitespace-nowrap text-center text-base font-semibold tracking-[0.15em] sm:text-lg"
          >
            특장카니발 <span className="text-zinc-500">특장맨</span>
          </a>

          <div className="flex flex-1 items-center justify-end">
            <a
              href="#consult"
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              상담 신청
            </a>
          </div>
        </div>
      </header>

      {/* ── 우측 플로팅 액션 (스크롤 따라다님) ── */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        <a
          href="#top"
          aria-label="맨 위로"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-lg text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          ↑
        </a>
        <a
          href={KAKAO}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="카카오톡 상담"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE500] text-black shadow-lg transition-transform hover:scale-105"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 3C6.9 3 3 6.3 3 10.2c0 2.5 1.7 4.7 4.2 6-.2.6-.6 2.3-.7 2.6 0 .1 0 .3.2.3.1 0 .2 0 .3-.1.4-.3 2.4-1.6 3.3-2.2.5.1 1 .1 1.5.1 5.1 0 9-3.3 9-7.2S17.1 3 12 3z" />
          </svg>
        </a>
        <a
          href="#consult"
          className="cta-wiggle rounded-full border border-white/40 bg-white/5 px-6 py-4 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/15"
        >
          상담 신청
        </a>
      </div>

      {/* ── 상품 갤러리 라이트박스 (자세히 보기) ── */}
      <AnimatePresence>
        {gallery !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex flex-col bg-black/95 backdrop-blur-sm"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <div className="text-xs tracking-[0.2em] text-zinc-400">
                  {PRODUCTS[gallery].tag}
                </div>
                <h3 className="mt-0.5 text-lg font-semibold">
                  {PRODUCTS[gallery].name}
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    {galleryIdx + 1} / {galleryOf(gallery).length}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGallery(null)}
                aria-label="닫기"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-xl text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
            {/* 메인 사진 + 좌우 화살표 */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-14 py-4 sm:px-20">
              <button
                type="button"
                onClick={() =>
                  setGalleryIdx(
                    (n) =>
                      (n - 1 + (galleryOf(gallery).length || 1)) %
                      (galleryOf(gallery).length || 1),
                  )
                }
                aria-label="이전"
                className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:left-6"
              >
                ‹
              </button>

              <div className="relative h-full w-full max-w-5xl">
                <Image
                  src={
                    galleryOf(gallery)[galleryIdx] ??
                    PRODUCTS[gallery].img
                  }
                  alt={`${PRODUCTS[gallery].name} ${galleryIdx + 1}`}
                  fill
                  sizes="90vw"
                  className="object-contain"
                  priority
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setGalleryIdx(
                    (n) => (n + 1) % (galleryOf(gallery).length || 1),
                  )
                }
                aria-label="다음"
                className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:right-6"
              >
                ›
              </button>
            </div>

            {/* 썸네일 스트립 */}
            <div
              data-lenis-prevent
              className="no-scrollbar shrink-0 overflow-x-auto border-t border-white/10 px-4 py-3"
            >
              <div className="mx-auto flex w-max gap-2">
                {galleryOf(gallery).map((src, idx) => (
                  <button
                    type="button"
                    key={src}
                    data-thumb={idx}
                    onClick={() => setGalleryIdx(idx)}
                    aria-label={`${idx + 1}번 사진`}
                    className={`relative h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md transition-opacity sm:h-16 sm:w-24 ${
                      idx === galleryIdx
                        ? "ring-2 ring-white"
                        : "opacity-50 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="top">
        {/* ── Hero carousel ── */}
        <section className="relative h-screen w-full overflow-hidden">
          {HERO_SLIDES.map((src, i) => (
            <motion.div
              key={src}
              className="absolute inset-0"
              style={{ opacity: i === 0 ? 1 : 0 }}
              animate={
                i === slide
                  ? { opacity: 1, scale: reduce ? 1 : 1.1 }
                  : { opacity: 0, scale: 1 }
              }
              transition={{
                opacity: { duration: 1.2, ease: "easeInOut" },
                scale: { duration: 6, ease: "linear" },
              }}
            >
              <Image
                src={src}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/90" />

          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.14, delayChildren: 0.2 },
              },
            }}
            className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
          >
            {[
              <p
                key="e"
                className="mb-4 text-xs tracking-[0.4em] text-zinc-400"
              >
                PREMIUM CARNIVAL SPECIAL VEHICLE
              </p>,
              <h1
                key="h"
                className="max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl"
              >
                특장 카니발의 기준,
                <br />
                특장맨이 만듭니다
              </h1>,
              <div key="c" className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#consult"
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  상담 신청하기
                </a>
                <a
                  href="#models"
                  className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
                >
                  라인업 보기
                </a>
              </div>,
            ].map((el, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.7 } },
                }}
              >
                {el}
              </motion.div>
            ))}
          </motion.div>

          <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                aria-label={`슬라이드 ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        </section>

        {/* ── 회사/브랜드 소개 ── */}
        {/* ── 회사/브랜드 소개 (풀샷 배경 + 라인 리빌) ── */}
        {/* ── 상담 폼 (기존 맨 아래였으나 브랜드 무드 섹션과 자리 교체) ── */}
        <section
          id="consult"
          className="relative overflow-hidden border-y border-white/10"
        >
          {/* 배경: 실제 사진 넣기 전 스포트라이트 그라데이션 (사진 준비되면 교체) */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_35%,#2a2a31_0%,#141418_50%,#0a0a0b_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.05),transparent_45%)]" />

          <div
            data-reveal-solo
            className="relative z-10 mx-auto max-w-4xl px-6 py-28"
          >
            <div className="mb-12 text-center">
              <p className="text-xs tracking-[0.35em] text-zinc-400">
                GET IN TOUCH
              </p>
              <h2 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">
                특장 카니발이 <br className="sm:hidden" />
                처음이신가요?
                <br />
                무엇이든 <br className="sm:hidden" />
                편하게 물어보세요!
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-zinc-300">
                카카오톡 · 전화 · 인스타그램, 또는 아래 폼으로 남겨주시면 빠르게
                안내해 드리겠습니다.
              </p>
            </div>

            <div className="mb-10 flex flex-wrap justify-center gap-3 text-sm">
              <a
                href={KAKAO}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#FEE500] px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90"
              >
                카카오톡 오픈채팅
              </a>
              <a
                href={`tel:${PHONE_TEL}`}
                className="rounded-full border border-white/25 px-6 py-3 font-semibold transition-colors hover:bg-white/10"
              >
                전화 상담
              </a>
              <a
                href={INSTA}
                className="rounded-full border border-white/25 px-6 py-3 font-semibold transition-colors hover:bg-white/10"
              >
                인스타그램
              </a>
            </div>

            <ContactForm />
          </div>
        </section>

        {/* ── Lineup — expanding accordion (8 products; hover grows the panel) ── */}
        <section id="models" className="pt-24 pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div data-reveal-group className="mb-12">
              <p data-reveal className="text-xs tracking-[0.3em] text-zinc-500">
                PRODUCT COLLECTIONS
              </p>
              <h2
                data-reveal
                className="mt-3 text-3xl font-semibold sm:text-4xl"
              >
                라인업
              </h2>
            </div>
          </div>

          {/* Desktop: 8 thin panels in a row; hover expands the panel */}
          <div className="hidden h-[70vh] w-full gap-1.5 px-1.5 lg:flex">
            {PRODUCTS.map((p, i) => (
              <button
                type="button"
                // 이름은 패키지명이라 중복된다(K-2 패키지 등). 이미지 경로가 상품별 고유 값.
                key={p.img}
                onClick={() => {
                  setGalleryIdx(0);
                  setGallery(i);
                }}
                className="ph group relative min-w-0 flex-1 overflow-hidden rounded-xl text-left transition-all duration-500 ease-out hover:grow-[5]"
              >
                <Image
                  src={p.img}
                  alt={p.name}
                  fill
                  quality={90}
                  sizes="50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                {/* collapsed: vertical name (color) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs tracking-[0.3em] text-white/70 transition-opacity duration-300 [writing-mode:vertical-rl] group-hover:opacity-0">
                  {p.name}
                </div>
                {/* expanded: full caption */}
                <div className="absolute bottom-0 left-0 w-max p-8 opacity-0 transition-opacity delay-100 duration-500 group-hover:opacity-100">
                  <div className="font-mono text-sm text-zinc-400">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-2 whitespace-nowrap text-2xl font-semibold sm:text-3xl">
                    {p.name}
                  </h3>
                  <div className="mt-1 text-xs tracking-[0.2em] text-zinc-400">
                    {p.tag}
                  </div>
                  <span className="mt-4 inline-block text-sm text-white">
                    자세히 보기 →
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Mobile: 2-column grid */}
          <div className="grid grid-cols-2 gap-3 px-6 lg:hidden">
            {PRODUCTS.map((p, i) => (
              <button
                type="button"
                // 이름은 패키지명이라 중복된다(K-2 패키지 등). 이미지 경로가 상품별 고유 값.
                key={p.img}
                onClick={() => {
                  setGalleryIdx(0);
                  setGallery(i);
                }}
                className="ph group relative aspect-[3/4] overflow-hidden rounded-xl text-left"
              >
                <Image
                  src={p.img}
                  alt={p.name}
                  fill
                  quality={90}
                  sizes="50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <div className="text-[10px] tracking-[0.2em] text-zinc-400">
                    {String(i + 1).padStart(2, "0")} · {p.tag}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold">{p.name}</h3>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── SNS · 소셜 (핀 고정 · 스크롤로 한 장씩 하드컷 전환) ── */}
        <section id="instagram" data-seq className="relative w-full">
          <div
            data-seq-pin
            className="relative flex h-screen w-full items-center justify-center overflow-hidden"
          >
            {SEQ.map((s, i) => (
              <div
                key={s.title}
                data-seq-img
                className={`absolute inset-0 ${i === 0 ? "opacity-100" : "opacity-0"}`}
              >
                {s.img ? (
                  <>
                    {/* 블러 확대본으로 여백 채움 (레터박스 대신) */}
                    <Image
                      src={s.img}
                      alt=""
                      aria-hidden
                      fill
                      sizes="100vw"
                      className="scale-110 object-cover blur-2xl"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    {/* 전체가 다 보이는 메인 스크린샷 (축소해서 전부 노출) */}
                    <Image
                      src={s.imgMobile ?? s.img}
                      alt={s.title}
                      fill
                      sizes="100vw"
                      className="object-contain lg:hidden"
                    />
                    <Image
                      src={s.img}
                      alt={s.title}
                      fill
                      sizes="100vw"
                      className="hidden object-contain lg:block"
                    />
                    {/* 텍스트 가독성용: 스크린샷은 살리고 하단만 어둡게 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/25" />
                    <div className="absolute bottom-24 left-1/2 w-full max-w-2xl -translate-x-1/2 px-6 text-center">
                      <div className="text-xs tracking-[0.35em] text-zinc-300">
                        {s.tag}
                      </div>
                      <h3 className="mt-3 text-3xl font-semibold sm:text-5xl">
                        {s.title}
                      </h3>
                      {s.desc && (
                        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-zinc-300">
                          {s.desc}
                        </p>
                      )}
                      {s.href && (
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-7 inline-block rounded-full border border-white/40 bg-white/10 px-7 py-3 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/20"
                        >
                          {s.cta} →
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  /* 사진 없는 인트로 슬라이드 — 큰 볼드 타이포로 처리 */
                  <>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_40%,#1d1d24_0%,#111116_50%,#0a0a0b_100%)]" />
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                      <div className="max-w-4xl">
                        <div className="text-xs tracking-[0.4em] text-zinc-400 sm:text-sm">
                          {s.tag}
                        </div>
                        <h3 className="mt-6 text-4xl font-bold leading-[1.15] sm:text-6xl lg:text-7xl">
                          온라인에서도
                          <br />
                          <span className="text-orange-500">투명하게</span>
                        </h3>
                        <p className="mx-auto mt-8 max-w-xl leading-relaxed text-zinc-300 sm:text-lg">
                          인스타그램 · 유튜브 · 틱톡 · 블로그에서
                          <br />
                          실제 시공 과정과 사례를 꾸준히 공개합니다.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* progress dots */}
            <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 sm:right-10">
              {SEQ.map((s, i) => (
                <span
                  key={s.title}
                  data-seq-dot
                  className="w-1.5 rounded-full transition-all duration-300"
                  style={{
                    height: i === 0 ? "28px" : "8px",
                    backgroundColor: i === 0 ? "#fff" : "rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </div>

            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 text-[11px] tracking-[0.3em] text-zinc-500">
              SCROLL ↓
            </div>
          </div>
        </section>

        {/* ── Craft / 유튜브 쇼츠 캐러셀 (세로 9:16) ── */}
        <section id="craft" className="overflow-hidden py-24">
          <div className="mx-auto mb-12 max-w-7xl px-6">
            <div data-reveal-group>
              <p
                data-reveal
                className="text-xs tracking-[0.3em] text-zinc-500"
              >
                SHORTS
              </p>
              <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div data-reveal>
                  <h2 className="text-3xl font-semibold sm:text-4xl">
                    왜 특장 카니발일까?
                  </h2>
                  <p className="mt-3 text-sm text-zinc-400">
                    그 이유를 릴스로 만나보세요!
                  </p>
                </div>
                <a
                  href={YOUTUBE_CHANNEL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 self-end rounded-full bg-[#FF0000] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:self-auto"
                >
                  구독하러 가기 <span aria-hidden>→</span>
                </a>
              </div>
            </div>
          </div>
          <CraftShorts />
        </section>

        {/* ── 상담 유도 배너 — 라인업·제작 과정을 다 본 뒤 상담으로 연결 ── */}
        <div className="mx-auto max-w-7xl px-6">
          <div
            data-reveal-solo
            className="flex flex-col items-start gap-6 rounded-2xl bg-white px-8 py-8 text-black sm:flex-row sm:items-center sm:justify-between sm:px-10"
          >
            <p className="text-sm leading-relaxed sm:text-base">
              <span className="font-semibold">
                전문 상담원이 1:1로 안내해 드립니다.
              </span>{" "}
              원하시는 사양과 예산에 맞춰, 특장맨이 꼼꼼하게 안내해
              드리겠습니다.
            </p>
            <a
              href="#consult"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              상담 신청 <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        {/* ── 공지사항 / 블로그 (2열) ── */}
        <Section id="notice" eyebrow="NEWS" title="공지사항 · FAQ">
          <div
            data-reveal-group
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            {/* 공지사항 리스트 (2칸) */}
            <div
              data-reveal
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <h3 className="text-lg font-semibold">공지사항</h3>
              </div>
              <div className="divide-y divide-white/5">
                {notices.length === 0 && (
                  <p className="px-6 py-10 text-center text-sm text-zinc-500">
                    등록된 공지가 없습니다.
                  </p>
                )}
                {notices.map((n) => (
                  <details key={n.id} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-4 px-6 py-4 transition-colors hover:bg-white/5 group-open:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                      <span className="flex-1 truncate text-sm font-medium text-zinc-200 group-open:text-white">
                        {n.title}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {n.date}
                      </span>
                      <span className="shrink-0 text-zinc-500 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="border-t border-white/5 bg-white/[0.02] px-6 py-4">
                      <p className="border-l-2 border-white/15 pl-4 text-sm leading-relaxed text-zinc-400">
                        {n.body}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* FAQ (1칸) */}
            <div
              data-reveal
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <h3 className="text-lg font-semibold">자주 묻는 질문</h3>
              </div>
              <div className="divide-y divide-white/5">
                {faqs.length === 0 && (
                  <p className="px-6 py-10 text-center text-sm text-zinc-500">
                    등록된 질문이 없습니다.
                  </p>
                )}
                {faqs.map((f) => (
                  <details key={f.id} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5 group-open:bg-white/[0.03] group-open:text-white [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2">
                        <span className="text-zinc-500">Q.</span>
                        {f.q}
                      </span>
                      <span className="shrink-0 text-zinc-500 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="border-t border-white/5 bg-white/[0.02] px-6 py-4">
                      <p className="flex gap-2 text-sm leading-relaxed text-zinc-400">
                        <span className="shrink-0 text-zinc-500">A.</span>
                        {f.a}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── 오시는 길 ── */}
        <Section id="location" eyebrow="LOCATION" title="오시는 길">
          <div
            data-reveal-group
            className="grid grid-cols-1 gap-8 lg:grid-cols-3"
          >
            <div
              data-reveal
              className="overflow-hidden rounded-2xl border border-white/10 lg:col-span-2"
            >
              <iframe
                src={MAP_EMBED}
                title="오시는 길 지도"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[360px] w-full lg:h-[420px]"
              />
            </div>
            <div
              data-reveal
              className="flex flex-col justify-center gap-6 rounded-2xl border border-white/10 bg-[#0e0e10] p-8"
            >
              <div>
                <div className="text-xs tracking-[0.2em] text-zinc-500">
                  ADDRESS
                </div>
                <div className="mt-2 font-medium">{ADDRESS}</div>
              </div>
              <div>
                <div className="text-xs tracking-[0.2em] text-zinc-500">
                  TEL
                </div>
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="mt-2 block font-medium transition-colors hover:text-white"
                >
                  {PHONE}
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 문의하기 ── */}
        {/* ── 브랜드 무드 (히어로 다음이었으나 상담 폼과 자리 교체) ── */}
        <section
          id="about"
          className="relative flex min-h-screen w-full items-center justify-center overflow-hidden"
        >
          {/* 배경: 실내 디테일 무드컷 (어둡게 눌러 텍스트 가독성 확보) */}
          <Image
            src="/products/02/016.jpg"
            alt=""
            aria-hidden
            fill
            quality={90}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(0,0,0,0)_0%,rgba(10,10,11,0.75)_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

          <div
            data-about
            className="relative z-10 mx-auto max-w-5xl px-6 text-center"
          >
            <p className="about-eyebrow mb-6 text-xs tracking-[0.35em] text-zinc-300 sm:text-sm">
              CARNIVAL SPECIAL VEHICLE · INCHEON
            </p>
            <h2 className="text-4xl font-bold leading-[1.18] sm:text-6xl">
              {["카니발을 특별하게", "특장맨의 손끝에서", "완성됩니다"].map(
                (line) => (
                  <span key={line} className="block overflow-hidden pb-1">
                    <span className="about-line block">{line}</span>
                  </span>
                ),
              )}
            </h2>
            <p className="about-sub mt-10 leading-relaxed text-zinc-300">
              상담부터 인도, 사후관리까지 전 과정을 함께합니다.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 bg-[#0a0a0b] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            {/* left: brand + business info */}
            <div>
              <div className="text-lg font-semibold tracking-[0.15em]">
                특장카니발 <span className="text-zinc-500">특장맨</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                카니발 기반 특장 · 커스텀 제작 전문.
                <br />
                상담 및 문의는 아래 연락처로 편하게 남겨주세요.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>상호명 : {BRAND}</span>
                <span className="text-white/15">|</span>
                <span>주소 : {ADDRESS}</span>
                {/* TODO: 대표자명 · 사업자등록번호 확정 시 추가 */}
                <span className="text-white/15">|</span>
                <a
                  href="/admin"
                  className="underline-offset-4 transition-colors hover:text-zinc-300 hover:underline"
                >
                  관리자
                </a>
              </div>
            </div>

            {/* right: social icons */}
            <div className="flex items-center gap-3">
              <a
                href={INSTA}
                aria-label="인스타그램"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle
                    cx="17.5"
                    cy="6.5"
                    r="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </a>
              <a
                href="https://youtube.com/@special_carnival?si=qaMjhVckbARXcWQh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="유튜브"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M23 12s0-3.4-.4-5c-.2-.9-.9-1.6-1.8-1.8C19 5 12 5 12 5s-7 0-8.8.2c-.9.2-1.6.9-1.8 1.8C1 8.6 1 12 1 12s0 3.4.4 5c.2.9.9 1.6 1.8 1.8C5 19 12 19 12 19s7 0 8.8-.2c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-5 .4-5zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@special_carnibal"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="틱톡"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9v2.6c-1.3 0-2.5-.4-3.6-1.1v5.6c0 3-2.4 5.4-5.4 5.4S5.6 17 5.6 14s2.4-5.4 5.4-5.4c.3 0 .6 0 .9.1v2.7c-.3-.1-.6-.2-.9-.2-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7 2.7-1.2 2.7-2.7V3h2.8z" />
                </svg>
              </a>
              <a
                href={KAKAO}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="카카오톡"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M12 4C7.3 4 3.5 7 3.5 10.7c0 2.3 1.6 4.4 4 5.6-.2.6-.6 2.1-.7 2.4 0 .2.1.3.3.2.2-.1 2.2-1.5 3-2 .6.1 1.2.1 1.9.1 4.7 0 8.5-3 8.5-6.7S16.7 4 12 4z" />
                </svg>
              </a>
              <a
                href={`tel:${PHONE_TEL}`}
                aria-label="전화"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.3 21 3 13.7 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1L6.6 10.8z" />
                </svg>
              </a>
            </div>
          </div>

          {/* bottom: links + copyright */}
          <div className="mt-12 border-t border-white/10 pt-8 text-center">
            <nav className="flex flex-wrap justify-center gap-6 text-xs">
              <a
                href="#about"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                회사소개
              </a>
              <a
                href="#"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                이용약관
              </a>
              <a
                href="#"
                className="font-semibold text-zinc-200 transition-colors hover:text-white"
              >
                개인정보처리방침
              </a>
            </nav>
            <p className="mt-4 text-xs text-zinc-600">
              Copyright © 2026 {BRAND}. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Craft: 유튜브 쇼츠(세로 9:16) 무한 가로 스크롤 갤러리 ──
   목록을 3벌 복제해 렌더하고, 스크롤이 양끝으로 치우치면 가운데 복제본으로
   '보이지 않게' 재중앙화 → 진짜 끊김 없는 360 순환 (모바일 스와이프 지원).
   가운데 온 카드만 iframe으로 재생, 나머지는 썸네일. 데스크탑만 하단 바 노출. */
function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, note, agree, source: "web" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "");
      }
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "문의 접수에 실패했습니다. 카카오톡 또는 전화로 문의해 주세요.",
      );
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/15 bg-black/30 px-6 py-12 text-center">
        <p className="text-lg font-semibold">문의가 접수되었습니다.</p>
        <p className="mt-3 text-sm text-zinc-400">
          빠르게 확인 후 남겨주신 연락처로 안내드리겠습니다.
        </p>
        <button
          onClick={() => {
            setName("");
            setPhone("");
            setNote("");
            setAgree(false);
            setSending(false);
            setDone(false);
          }}
          className="mt-6 rounded-full border border-white/25 px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10"
        >
          문의 추가로 남기기
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <input
        required
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={sending}
        className="rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-base outline-none placeholder:font-semibold placeholder:text-white focus:border-white/40 disabled:opacity-50"
      />
      <input
        required
        type="tel"
        inputMode="tel"
        placeholder="연락처"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={sending}
        className="rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-base outline-none placeholder:font-semibold placeholder:text-white focus:border-white/40 disabled:opacity-50"
      />
      <textarea
        placeholder="문의 내용"
        rows={5}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={sending}
        className="rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-base outline-none placeholder:font-semibold placeholder:text-white focus:border-white/40 disabled:opacity-50 sm:col-span-2"
      />
      {/* 개인정보 수집·이용 동의 — 이름·연락처를 받으므로 필수 (개인정보보호법 제15조) */}
      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-2.5 text-base font-semibold text-white">
          <input
            type="checkbox"
            required
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            disabled={sending}
            className="mt-1 h-[1.125rem] w-[1.125rem] shrink-0 accent-white"
          />
          <span>
            <span className="font-bold text-white">[필수]</span> 개인정보
            수집·이용에 동의합니다.
          </span>
        </label>
        <p className="mt-2.5 pl-[1.75rem] text-sm font-medium leading-relaxed text-zinc-200">
          · 수집 항목: 이름, 연락처, 문의 내용
          <br />· 이용 목적: 상담 문의 접수 및 안내
          <br />· 보유 기간: 상담 완료 후 1년
          <br />
          동의를 거부하실 수 있으며, 이 경우 폼을 통한 상담 접수가 제한됩니다.
          (카카오톡·전화 문의는 가능합니다.)
        </p>
      </div>
      {error && (
        <p className="text-center text-sm text-red-400 sm:col-span-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={sending || !agree}
        className="mt-6 rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2"
      >
        {sending ? "접수 중…" : "문의 남기기"}
      </button>
    </form>
  );
}

function CraftShorts() {
  const N = SHORTS.length;
  const COPIES = 3;
  const items = Array.from({ length: N * COPIES }, (_, k) => SHORTS[k % N]);

  const [center, setCenter] = useState(N); // 가운데 온 카드의 raw 인덱스 (가운데 복제본 시작)
  const [inView, setInView] = useState(false);
  const [phase, setPhase] = useState(0); // 한 사이클 내 위치 0..1 (데스크탑 바)
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const copyWRef = useRef(0); // 복제본 1벌의 가로 폭(px)

  const centerCard = (i: number, behavior: ScrollBehavior = "smooth") => {
    const sc = scrollRef.current;
    const el = cardRefs.current[i];
    if (!sc || !el) return;
    sc.scrollTo({
      left: el.offsetLeft + el.offsetWidth / 2 - sc.clientWidth / 2,
      behavior,
    });
  };

  // 섹션이 화면에 들어온 뒤에만 플레이어 로드.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setInView(true),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 복제본 폭 측정 + 가운데 복제본으로 초기 정렬.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const init = () => {
      const a = cardRefs.current[0];
      const b = cardRefs.current[N];
      if (a && b) copyWRef.current = b.offsetLeft - a.offsetLeft;
      centerCard(N, "auto");
    };
    const id = requestAnimationFrame(init);
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", init);
    };
  }, [N]);

  // 가운데 복제본(영상1~영상N)을 중앙에 놓는 scrollLeft 구간 [start, end].
  // 데스크탑 바 위치·드래그가 같은 기준을 쓰도록 공용.
  const midSpan = useCallback(() => {
    const sc = scrollRef.current;
    const first = cardRefs.current[N];
    const last = cardRefs.current[2 * N - 1];
    if (!sc || !first || !last) return null;
    return {
      start: first.offsetLeft + first.offsetWidth / 2 - sc.clientWidth / 2,
      end: last.offsetLeft + last.offsetWidth / 2 - sc.clientWidth / 2,
    };
  }, [N]);

  // 스크롤: (1) 가운데 카드 판정 + 바 위치, (2) 멈춘 뒤 가운데 복제본으로 재중앙화.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    let endTimer: ReturnType<typeof setTimeout>;

    const nearestCard = () => {
      const cx = sc.scrollLeft + sc.clientWidth / 2;
      let best = 0;
      let bd = Infinity;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const c = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.abs(c - cx);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    };

    // 스크롤이 멈추면 가운데 카드를 항상 가운데 복제본[N,2N)으로 되돌림.
    // (복제본이 동일 → 눈에 안 띔, 관성도 안 끊김) → 끊김 없는 무한 순환.
    const recenter = () => {
      const cw = copyWRef.current;
      if (!cw) return;
      const best = nearestCard();
      if (best < N) sc.scrollLeft += cw;
      else if (best >= 2 * N) sc.scrollLeft -= cw;
    };

    const update = () => {
      setCenter(nearestCard());
      const span = midSpan();
      if (span && span.end > span.start) {
        const p = (sc.scrollLeft - span.start) / (span.end - span.start);
        setPhase(Math.min(1, Math.max(0, p)));
      }
      clearTimeout(endTimer);
      endTimer = setTimeout(recenter, 120);
    };

    update();
    sc.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(endTimer);
      sc.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [N, midSpan]);

  // 데스크탑 하단 바 드래그 → 바 위치(phase)와 동일 기준(midSpan)으로 스크롤.
  const dragTo = (clientX: number) => {
    const sc = scrollRef.current;
    const bar = barRef.current;
    const span = midSpan();
    if (!sc || !bar || !span) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    sc.scrollLeft = span.start + ratio * (span.end - span.start);
  };
  const onBarDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragTo(e.clientX);
    const move = (ev: PointerEvent) => dragTo(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      {/* 무한 가로 스크롤 트랙 (모바일 스와이프 · 네이티브 스크롤바 숨김) */}
      <div
        ref={scrollRef}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 py-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((s, i) => {
          const isActive = i === center;
          return (
            <button
              type="button"
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              // 클릭 시 가운데 복제본의 같은 영상으로 정렬 → 재중앙화 충돌 방지
              onClick={() => centerCard(N + (i % N))}
              aria-label={s.title}
              className={`relative aspect-[9/16] w-[74vw] max-w-[300px] shrink-0 snap-center cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10] transition-all duration-500 sm:w-[300px] ${
                isActive
                  ? "scale-100 opacity-100 shadow-2xl shadow-black/50"
                  : "scale-90 opacity-40 hover:opacity-70"
              }`}
            >
              {isActive && inView ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${s.id}?autoplay=1&mute=1&loop=1&playlist=${s.id}&controls=1&playsinline=1&rel=0&modestbranding=1`}
                  title={s.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`}
                    alt={s.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 pl-1 text-white backdrop-blur-sm">
                    ▶
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* 하단 가로 바 (데스크탑 전용 · 모바일은 스와이프만) */}
      <div className="mx-auto mt-6 hidden w-[min(300px,74vw)] sm:block">
        <div
          ref={barRef}
          onPointerDown={onBarDown}
          className="h-1.5 w-full cursor-pointer touch-none rounded-full bg-white/10"
        >
          <div
            className="h-full w-1/4 rounded-full bg-white/60"
            style={{ marginLeft: `${phase * 75}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-6 py-24">
      <div data-reveal-group className="mb-12">
        <p data-reveal className="text-xs tracking-[0.3em] text-zinc-500">
          {eyebrow}
        </p>
        <h2 data-reveal className="mt-3 text-3xl font-semibold sm:text-4xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
