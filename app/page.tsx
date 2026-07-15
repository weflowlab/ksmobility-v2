"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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
const INSTA = "#"; // TODO: 인스타그램 계정 확정 시 실제 링크로 교체
const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(ADDRESS)}&z=16&output=embed`;

/* 공지사항/블로그 (임시 placeholder — 콘텐츠 확정 시 교체) */
const NOTICES = [
  {
    tag: "공지",
    date: "2026.07.10",
    title: "특장 카니발 신규 라인업 상담 예약 안내",
  },
  {
    tag: "블로그",
    date: "2026.06.28",
    title: "특장 카니발 제작 과정, 이렇게 진행됩니다",
  },
  { tag: "공지", date: "2026.06.15", title: "여름 시즌 상담 운영 시간 안내" },
];

const HERO_SLIDES = [
  "EXTERIOR 01",
  "EXTERIOR 02",
  "EXTERIOR 03",
  "EXTERIOR 04",
  "INTERIOR 01",
  "INTERIOR 02",
];

/* Auto-marquee lineup — 8 products (hover pauses + card enlarges) */
const PRODUCTS = [
  { name: "플래그십 하이 리무진", tag: "FLAGSHIP" },
  { name: "하이 리무진", tag: "HIGH LIMOUSINE" },
  { name: "로우 리무진", tag: "LOW LIMOUSINE" },
  { name: "프리미엄 라운지", tag: "LOUNGE" },
  { name: "비즈니스 에디션", tag: "BUSINESS" },
  { name: "패밀리 에디션", tag: "FAMILY" },
  { name: "캠퍼 컨버전", tag: "CAMPER" },
  { name: "스페셜 오더", tag: "BESPOKE" },
];

/* Pinned scroll-sequence slides */
const SEQ = [
  { tag: '55" DIGITAL SKY VIEW', title: "디지털 스카이뷰" },
  { tag: "BUILT-IN PC", title: "빌트인 PC" },
  { tag: "APP CONTROL", title: "앱 컨트롤" },
  { tag: "INTEGRATED CONTROL", title: "통합 컨트롤" },
  { tag: "IMMERSIVE SOUND", title: "몰입형 사운드" },
];

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

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
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
            gsap.set("[data-seq-img]", { opacity: 0 });
            const first = document.querySelector<HTMLElement>("[data-seq-img]");
            if (first) gsap.set(first, { opacity: 1 });
            // Craft video: keep it full, no scroll expand.
            gsap.set("[data-craft-wrap]", { scale: 1, borderRadius: 0 });
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

          /* ── Pinned scroll sequence (image 5장 crossfade) ── */
          const seq = document.querySelector<HTMLElement>("[data-seq]");
          if (seq) {
            const pinEl = seq.querySelector<HTMLElement>("[data-seq-pin]");
            const imgs = gsap.utils.toArray<HTMLElement>("[data-seq-img]", seq);
            const dots = gsap.utils.toArray<HTMLElement>("[data-seq-dot]", seq);
            if (pinEl && imgs.length > 1) {
              gsap.set(imgs, { opacity: 0 });
              gsap.set(imgs[0], { opacity: 1 });
              const setDot = (idx: number) =>
                dots.forEach((d, i) => {
                  d.style.height = i === idx ? "28px" : "8px";
                  d.style.backgroundColor =
                    i === idx ? "#ffffff" : "rgba(255,255,255,0.3)";
                });
              setDot(0);

              const tl = gsap.timeline({
                scrollTrigger: {
                  trigger: seq,
                  start: "top top",
                  end: "+=" + imgs.length * 100 + "%",
                  pin: pinEl,
                  scrub: 0.6,
                  // Pinned + above the craft trigger → refresh first so the
                  // craft trigger's positions account for this pin's spacing.
                  refreshPriority: 1,
                  onUpdate: (self) =>
                    setDot(Math.round(self.progress * (imgs.length - 1))),
                },
              });
              for (let i = 1; i < imgs.length; i++) {
                tl.to(imgs[i - 1], { opacity: 0, ease: "none" }).to(
                  imgs[i],
                  { opacity: 1, ease: "none" },
                  "<",
                );
              }
            }
          }

          /* Craft video: expand from a small centered box to full-bleed on scroll.
             Created AFTER the pinned sequence above (and lower refreshPriority) so its
             scroll positions include the pin's spacing. Uses transform scale (no reflow). */
          const craftWrap =
            document.querySelector<HTMLElement>("[data-craft-wrap]");
          if (craftWrap) {
            gsap.fromTo(
              craftWrap,
              { scale: 0.8, borderRadius: 32 },
              {
                scale: 1,
                borderRadius: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: craftWrap,
                  start: "top 80%",
                  end: "top 25%",
                  scrub: true,
                  invalidateOnRefresh: true,
                },
              },
            );
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
        className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors duration-500 ${
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

      <main id="top">
        {/* ── Hero carousel ── */}
        <section className="relative h-screen w-full overflow-hidden">
          {HERO_SLIDES.map((label, i) => (
            <motion.div
              key={label}
              className="ph absolute inset-0"
              animate={
                i === slide
                  ? { opacity: 1, scale: reduce ? 1 : 1.1 }
                  : { opacity: 0, scale: 1 }
              }
              transition={{
                opacity: { duration: 1.2, ease: "easeInOut" },
                scale: { duration: 6, ease: "linear" },
              }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />

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
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        </section>

        {/* ── 회사/브랜드 소개 ── */}
        <Section id="about" eyebrow="ABOUT" title="브랜드 소개">
          <div
            data-reveal-group
            className="mb-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-2"
          >
            <div
              data-reveal
              className="group aspect-[4/3] w-full overflow-hidden rounded-2xl"
            >
              <div
                data-parallax
                className="ph h-[122%] w-full transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div>
              <h3
                data-reveal
                className="text-2xl font-semibold leading-snug sm:text-3xl"
              >
                특장 카니발 전문, 특장맨
              </h3>
              <p data-reveal className="mt-5 leading-relaxed text-zinc-400">
                {BRAND}은 카니발 기반의 특장·커스텀 제작을 전문으로 합니다.
                <br />
                꼼꼼한 설계와 시공, 그리고 출고 후까지 이어지는 관리로
                <br />
                고객 한 분 한 분께 신뢰를 드립니다.
              </p>
              <p data-reveal className="mt-4 leading-relaxed text-zinc-400">
                상담부터 제작, 인도까지 전 과정을 직접 챙깁니다.
                <br />
                원하시는 사양을 편하게 문의해 주세요.
              </p>
              <div data-reveal className="mt-8 flex flex-wrap gap-3 text-sm">
                <a
                  href="#consult"
                  className="rounded-full bg-white px-6 py-2.5 font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  상담 문의
                </a>
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="rounded-full border border-white/25 px-6 py-2.5 transition-colors hover:bg-white/10"
                >
                  전화 문의
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Lineup — expanding accordion (8 products; hover grows the panel) ── */}
        <section id="models" className="py-24">
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
              <a
                key={p.name}
                href="#consult"
                className="ph group relative min-w-0 flex-1 overflow-hidden rounded-xl transition-all duration-500 ease-out hover:grow-[5]"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                {/* collapsed: vertical tag */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs tracking-[0.3em] text-white/70 transition-opacity duration-300 [writing-mode:vertical-rl] group-hover:opacity-0">
                  {p.tag}
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
              </a>
            ))}
          </div>

          {/* Mobile: 2-column grid */}
          <div className="grid grid-cols-2 gap-3 px-6 lg:hidden">
            {PRODUCTS.map((p, i) => (
              <a
                key={p.name}
                href="#consult"
                className="ph group relative aspect-[3/4] overflow-hidden rounded-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <div className="text-[10px] tracking-[0.2em] text-zinc-400">
                    {String(i + 1).padStart(2, "0")} · {p.tag}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold">{p.name}</h3>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Feature — pinned scroll sequence (5 slides crossfade) ── */}
        <section id="builder" data-seq className="relative w-full">
          <div
            data-seq-pin
            className="relative flex h-screen w-full items-center justify-center overflow-hidden"
          >
            {SEQ.map((s, i) => (
              <div
                key={s.tag}
                data-seq-img
                className={`ph absolute inset-0 ${i === 0 ? "opacity-100" : "opacity-0"}`}
              >
                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center">
                  <div className="text-xs tracking-[0.35em] text-zinc-300">
                    {s.tag}
                  </div>
                  <h3 className="mt-3 text-3xl font-semibold sm:text-5xl">
                    {s.title}
                  </h3>
                </div>
              </div>
            ))}

            {/* progress dots */}
            <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 sm:right-10">
              {SEQ.map((s, i) => (
                <span
                  key={s.tag}
                  data-seq-dot
                  className="w-1.5 rounded-full transition-all duration-300"
                  style={{
                    height: i === 0 ? "28px" : "8px",
                    backgroundColor: i === 0 ? "#fff" : "rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.3em] text-zinc-500">
              SCROLL ↓
            </div>
          </div>
        </section>

        {/* ── Craft / video (auto-play + scroll-driven expand to full-bleed) ── */}
        <section id="craft" className="overflow-hidden py-24">
          <div className="mx-auto mb-12 max-w-7xl px-6">
            <div data-reveal-group>
              <p data-reveal className="text-xs tracking-[0.3em] text-zinc-500">
                THE CRAFT
              </p>
              <h2
                data-reveal
                className="mt-3 text-3xl font-semibold sm:text-4xl"
              >
                제작 과정
              </h2>
            </div>
          </div>
          <div
            data-craft-wrap
            className="mx-auto w-full origin-center overflow-hidden will-change-transform"
          >
            <CraftVideo />
          </div>
        </section>

        {/* ── 인스타그램 (신뢰) ── */}
        <Section id="instagram" eyebrow="INSTAGRAM" title="인스타그램">
          <div>
            <p data-reveal-solo className="mb-8 max-w-xl text-zinc-400">
              작업 과정과 실제 시공 사례를 인스타그램에서 확인하실 수 있습니다.
            </p>
            <div data-reveal-group className="grid grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <a
                  data-reveal
                  key={i}
                  href={INSTA}
                  className="aspect-square overflow-hidden rounded-xl"
                >
                  <div className="ph h-full w-full transition-transform duration-500 hover:scale-110" />
                </a>
              ))}
            </div>
            <div data-reveal-solo className="mt-8">
              <a
                href={INSTA}
                className="inline-block rounded-full border border-white/25 px-6 py-2.5 text-sm transition-colors hover:bg-white/10"
              >
                인스타그램 팔로우 →
              </a>
            </div>
          </div>
        </Section>

        {/* ── 공지사항 / 블로그 ── */}
        <Section id="notice" eyebrow="NEWS & BLOG" title="공지사항 · 블로그">
          <div
            data-reveal-group
            className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10]"
          >
            {NOTICES.map((n) => (
              <a
                data-reveal
                key={n.title}
                href="#"
                className="flex items-center gap-4 p-6 transition-colors hover:bg-white/5"
              >
                <span className="w-14 shrink-0 rounded-full border border-white/20 py-1 text-center text-xs text-zinc-400">
                  {n.tag}
                </span>
                <span className="flex-1 truncate font-medium">{n.title}</span>
                <span className="hidden shrink-0 text-sm text-zinc-500 sm:block">
                  {n.date}
                </span>
              </a>
            ))}
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
        <section id="consult" className="border-y border-white/10 bg-[#0e0e10]">
          <div data-reveal-solo className="mx-auto max-w-4xl px-6 py-24">
            <div className="mb-10 text-center">
              <p className="text-xs tracking-[0.3em] text-zinc-500">CONTACT</p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                상담 · 문의하기
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-zinc-400">
                아래 폼을 남겨주시거나, 카카오톡 · 전화로 편하게 문의해 주세요.
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

            {/* 폼 UI만 제공 — 전송 연동은 관리자 페이지 구축 후 */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <input
                required
                placeholder="이름"
                className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/40"
              />
              <input
                required
                placeholder="연락처"
                className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/40"
              />
              <textarea
                placeholder="문의 내용"
                rows={5}
                className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/40 sm:col-span-2"
              />
              <button
                type="submit"
                className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 sm:col-span-2"
              >
                문의 남기기
              </button>
              <p className="text-center text-xs text-zinc-600 sm:col-span-2">
                * 현재는 폼 UI만 제공됩니다. 전송 기능은 관리자 페이지 구축 후
                연동됩니다. 급하시면 카카오톡 · 전화로 문의해 주세요.
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#0a0a0b] px-6 py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="text-lg font-semibold tracking-[0.15em]">
              특장카니발 <span className="text-zinc-500">특장맨</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              카니발 기반 특장 · 커스텀 제작 전문.
              <br />
              상담 및 문의는 아래 연락처로 편하게 남겨주세요.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <a
                href={KAKAO}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 px-4 py-2 text-zinc-300 transition-colors hover:bg-white/10"
              >
                카카오톡
              </a>
              <a
                href={INSTA}
                className="rounded-full border border-white/20 px-4 py-2 text-zinc-300 transition-colors hover:bg-white/10"
              >
                인스타그램
              </a>
              <a
                href={`tel:${PHONE_TEL}`}
                className="rounded-full border border-white/20 px-4 py-2 text-zinc-300 transition-colors hover:bg-white/10"
              >
                전화
              </a>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-zinc-300">바로가기</div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              {[
                { l: "브랜드 소개", href: "#about" },
                { l: "라인업", href: "#models" },
                { l: "공지 · 블로그", href: "#notice" },
                { l: "오시는 길", href: "#location" },
                { l: "문의하기", href: "#consult" },
              ].map((it) => (
                <li key={it.l}>
                  <a
                    href={it.href}
                    className="transition-colors hover:text-zinc-300"
                  >
                    {it.l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-zinc-300">연락처</div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li>
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="transition-colors hover:text-zinc-300"
                >
                  전화 문의
                </a>
              </li>
              <li>{ADDRESS}</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-8 text-xs text-zinc-600">
          © 2026 {BRAND}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

/* ── Craft video: auto-plays when scrolled into view, pauses when out ── */
function CraftVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reduce) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div className="relative w-full">
      {/* placeholder shown behind until a real video file is added to /public */}
      <div className="ph absolute inset-0" />
      <video
        ref={ref}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="relative z-10 aspect-[21/9] w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
      >
        {/* TEMP: 오픈 라이선스 샘플 영상. 실제 영상은 /public/craft.mp4 넣고 아래 두 source를 이걸로 교체: <source src="/craft.mp4" type="video/mp4" /> */}
        <source
          src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
          type="video/mp4"
        />
        <source
          src="https://mdn.github.io/shared-assets/videos/flower.mp4"
          type="video/mp4"
        />
      </video>

      {/* left-bottom: play / pause */}
      <button
        onClick={togglePlay}
        aria-label={playing ? "일시정지" : "재생"}
        className="absolute bottom-5 left-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 sm:bottom-8 sm:left-8"
      >
        <span className={playing ? "text-sm" : "ml-0.5 text-sm"}>
          {playing ? "❚❚" : "▶"}
        </span>
      </button>

      {/* right-bottom: sound / mute (default muted) */}
      <button
        onClick={toggleMute}
        aria-label={muted ? "소리 켜기" : "소리 끄기"}
        className="absolute bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 sm:bottom-8 sm:right-8"
      >
        {muted ? "🔇" : "🔊"}
      </button>
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
