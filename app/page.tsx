"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const NAV = [
  { label: "브랜드", href: "#brand" },
  { label: "모델", href: "#models" },
  { label: "상담", href: "#consult" },
  { label: "커스텀 빌더", href: "#builder" },
  { label: "갤러리", href: "#gallery" },
  { label: "고객지원", href: "#support" },
];

const HERO_SLIDES = ["EXTERIOR 01", "EXTERIOR 02", "EXTERIOR 03", "EXTERIOR 04", "INTERIOR 01", "INTERIOR 02"];

const PILLARS = [
  { no: "01", title: "독자적 설계", desc: "자체 연구소의 정밀 설계와 구조 해석으로 완성한 커스텀 플랫폼." },
  { no: "02", title: "프리미엄 소재", desc: "엄선한 내장재와 가공 기술로 구현한 최상위 마감 품질." },
  { no: "03", title: "첨단 기술", desc: "디스플레이 · 조명 · 사운드를 통합 제어하는 지능형 시스템." },
  { no: "04", title: "전담 컨시어지", desc: "상담부터 출고까지 전 과정을 책임지는 1:1 전담 서비스." },
];

const COLLECTIONS = [
  { name: "플래그십 하이 리무진", tag: "FLAGSHIP", desc: "최상위 라인업. 하이루프 기반의 프리미엄 리무진." },
  { name: "하이 리무진", tag: "HIGH", desc: "여유로운 실내 공간과 완성도를 갖춘 표준 하이루프." },
  { name: "로우 리무진", tag: "LOW", desc: "도심형 프로파일의 컴팩트 커스텀 리무진." },
];

const FEATURES = [
  { t: "빌트인 PC", d: "차량에 내장된 고성능 컴퓨팅 시스템." },
  { t: "앱 컨트롤", d: "전용 애플리케이션으로 실내 환경을 제어." },
  { t: "통합 컨트롤", d: "조명 · 사운드 · 디스플레이를 하나의 인터페이스로." },
  { t: "몰입형 사운드", d: "공간 전체를 감싸는 프리미엄 오디오 설계." },
];

const GALLERY = Array.from({ length: 8 }, (_, i) => `VIDEO ${String(i + 1).padStart(2, "0")}`);
const PRESS = ["PRESS A", "PRESS B", "PRESS C", "PRESS D", "PRESS E", "PRESS F", "PRESS G", "PRESS H"];
const STATS = [
  { n: 18, l: "인증 보유" },
  { n: 3, l: "ISO 표준" },
  { n: 1, l: "OEM 파트너십" },
];

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  /* Hero auto-rotate */
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  /* Header state on scroll */
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
          const conditions = ctx.conditions as { isReduced: boolean; isOk: boolean };

          // Reduced motion: reveal everything, snap counters to final.
          if (conditions.isReduced) {
            gsap.set("[data-reveal]", { opacity: 1, y: 0 });
            gsap.set("[data-clip]", { clipPath: "inset(0 0% 0 0)" });
            document.querySelectorAll<HTMLElement>("[data-counter]").forEach((el) => {
              el.textContent = el.dataset.to ?? "";
            });
            return;
          }

          // Staggered scroll reveals (grouped)
          gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
            const items = group.querySelectorAll("[data-reveal]");
            gsap.from(items, {
              y: 44,
              opacity: 0,
              duration: 0.9,
              ease: "power3.out",
              stagger: 0.12,
              scrollTrigger: { trigger: group, start: "top 82%" },
            });
          });

          // Solo reveals
          gsap.utils.toArray<HTMLElement>("[data-reveal-solo]").forEach((el) => {
            gsap.from(el, {
              y: 44,
              opacity: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 85%" },
            });
          });

          // Scrubbed parallax on media blocks
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
              }
            );
          });

          // clip-path wipe reveal
          gsap.utils.toArray<HTMLElement>("[data-clip]").forEach((el) => {
            gsap.from(el, {
              clipPath: "inset(0 100% 0 0)",
              duration: 1.2,
              ease: "power3.inOut",
              scrollTrigger: { trigger: el, start: "top 80%" },
            });
          });

          // Animated counters
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

          // Infinite marquee
          gsap.utils.toArray<HTMLElement>("[data-marquee]").forEach((track) => {
            gsap.to(track, { xPercent: -50, repeat: -1, duration: 22, ease: "none" });
          });
        }
      );
    },
    { scope: root }
  );

  return (
    <div ref={root} className="min-h-screen w-full">
      {/* ── Header ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors duration-500 ${
          scrolled ? "border-white/10 bg-[#0a0a0b]/80" : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <nav className="hidden flex-1 items-center gap-7 text-sm text-zinc-300 lg:flex">
            {NAV.slice(0, 3).map((n) => (
              <a key={n.href} href={n.href} className="nav-link">
                {n.label}
              </a>
            ))}
          </nav>

          <a href="#top" className="text-center text-xl font-semibold tracking-[0.35em] lg:flex-1">
            KS<span className="text-zinc-500">MOBILITY</span>
          </a>

          <div className="flex flex-1 items-center justify-end gap-7 text-sm text-zinc-300">
            <div className="hidden items-center gap-7 lg:flex">
              {NAV.slice(3).map((n) => (
                <a key={n.href} href={n.href} className="nav-link">
                  {n.label}
                </a>
              ))}
            </div>
            <a
              href="#consult"
              className="hidden rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 sm:inline-block"
            >
              상담 신청
            </a>
            <button
              aria-label="메뉴 열기"
              onClick={() => setMenuOpen(true)}
              className="flex flex-col gap-1.5 lg:hidden"
            >
              <span className="h-0.5 w-6 bg-white" />
              <span className="h-0.5 w-6 bg-white" />
              <span className="h-0.5 w-6 bg-white" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[70] flex w-72 flex-col bg-[#0e0e10] p-8 lg:hidden"
            >
              <button
                aria-label="메뉴 닫기"
                onClick={() => setMenuOpen(false)}
                className="mb-10 self-end text-2xl text-zinc-400"
              >
                ✕
              </button>
              <nav className="flex flex-col gap-6 text-lg">
                {NAV.map((n) => (
                  <a
                    key={n.href}
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-zinc-200 transition-colors hover:text-white"
                  >
                    {n.label}
                  </a>
                ))}
              </nav>
              <a
                href="#consult"
                onClick={() => setMenuOpen(false)}
                className="mt-auto rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-black"
              >
                상담 신청
              </a>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main id="top">
        {/* ── Hero carousel ── */}
        <section className="relative h-screen w-full overflow-hidden">
          {HERO_SLIDES.map((label, i) => (
            <motion.div
              key={label}
              data-label={label}
              className="ph absolute inset-0"
              animate={i === slide ? { opacity: 1, scale: reduce ? 1 : 1.1 } : { opacity: 0, scale: 1 }}
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
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14, delayChildren: 0.2 } } }}
            className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
          >
            {[
              <p key="e" className="mb-4 text-xs tracking-[0.4em] text-zinc-400">
                LUXURY CUSTOM MOBILITY
              </p>,
              <h1 key="h" className="max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
                당신을 위한
                <br />
                단 하나의 모빌리티
              </h1>,
              <div key="c" className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#builder"
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  커스텀 시작하기
                </a>
                <a
                  href="#models"
                  className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
                >
                  모델 살펴보기
                </a>
              </div>,
            ].map((el, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
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

        {/* ── Why KS ── */}
        <Section id="brand" eyebrow="WHY KS MOBILITY" title="선택받는 이유">
          <div
            data-reveal-group
            className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4"
          >
            {PILLARS.map((p) => (
              <div data-reveal key={p.no} className="bg-[#0e0e10] p-8">
                <div className="font-mono text-sm text-zinc-500">{p.no}</div>
                <h3 className="mt-6 text-lg font-semibold">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Collections ── */}
        <Section id="models" eyebrow="PRODUCT COLLECTIONS" title="라인업">
          <div data-reveal-group className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {COLLECTIONS.map((c) => (
              <a
                data-reveal
                key={c.name}
                href="#consult"
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10] transition-colors hover:border-white/25"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <div
                    data-label={c.tag}
                    className="ph h-full w-full transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="p-6">
                  <div className="text-xs tracking-[0.2em] text-zinc-500">{c.tag}</div>
                  <h3 className="mt-2 text-xl font-semibold">{c.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{c.desc}</p>
                  <span className="mt-5 inline-block text-sm text-zinc-300 transition-transform group-hover:translate-x-1">
                    자세히 보기 →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </Section>

        {/* ── Feature showcase (sticky pin + clip reveal) ── */}
        <Section id="builder" eyebrow='55" DIGITAL SKY VIEW' title="공간을 완성하는 기술">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="lg:sticky lg:top-28 lg:h-fit">
              <div data-clip className="ph aspect-[4/5] w-full overflow-hidden rounded-2xl">
                <div data-parallax data-label="FEATURE SHOWCASE" className="ph absolute inset-0 scale-110" />
              </div>
            </div>
            <div data-reveal-group className="flex flex-col gap-10 py-4">
              {FEATURES.map((f, i) => (
                <div data-reveal key={f.t} className="border-l-2 border-white/20 pl-6">
                  <div className="font-mono text-sm text-zinc-500">{String(i + 1).padStart(2, "0")}</div>
                  <h3 className="mt-3 text-2xl font-semibold">{f.t}</h3>
                  <p className="mt-2 text-zinc-400">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Craft / video ── */}
        <Section id="craft" eyebrow="THE CRAFT" title="제작 과정">
          <div data-reveal-solo className="relative overflow-hidden rounded-2xl border border-white/10">
            <div className="aspect-[21/9] w-full overflow-hidden">
              <div data-parallax data-label="CRAFT VIDEO" className="ph absolute inset-0 scale-110" />
            </div>
            <motion.button
              aria-label="영상 재생"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black"
            >
              <span className="ml-1 text-xl">▶</span>
            </motion.button>
          </div>
        </Section>

        {/* ── Media gallery ── */}
        <Section id="gallery" eyebrow="MEDIA GALLERY" title="갤러리">
          <div data-reveal-group className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {GALLERY.map((g) => (
              <div data-reveal key={g} className="aspect-video w-full overflow-hidden rounded-xl">
                <div data-label={g} className="ph h-full w-full transition-transform duration-700 hover:scale-110" />
              </div>
            ))}
          </div>
        </Section>

        {/* ── Press (marquee) ── */}
        <Section id="press" eyebrow="PRESS COVERAGE" title="언론 보도">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10] py-10">
            <div data-marquee className="flex w-max gap-16 px-8">
              {[...PRESS, ...PRESS].map((p, i) => (
                <span key={i} className="whitespace-nowrap text-lg tracking-widest text-zinc-500">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Certifications (counters) ── */}
        <Section id="support" eyebrow="CERTIFICATIONS" title="인증 및 파트너십">
          <div data-reveal-group className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STATS.map((s) => (
              <div data-reveal key={s.l} className="rounded-2xl border border-white/10 bg-[#0e0e10] p-10 text-center">
                <div data-counter data-to={s.n} className="text-5xl font-semibold tabular-nums">
                  0
                </div>
                <div className="mt-3 text-sm tracking-wider text-zinc-400">{s.l}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Final CTA ── */}
        <section id="consult" className="border-y border-white/10 bg-[#0e0e10]">
          <div data-reveal-solo className="mx-auto max-w-4xl px-6 py-24 text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">지금, 당신의 모빌리티를 시작하세요</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">전담 컨시어지가 상담부터 출고까지 함께합니다.</p>
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              href="#top"
              className="mt-10 inline-block rounded-full bg-white px-10 py-3.5 text-sm font-semibold text-black"
            >
              상담 신청하기
            </motion.a>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#0a0a0b] px-6 py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-lg font-semibold tracking-[0.3em]">
              KS<span className="text-zinc-500">MOBILITY</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              프리미엄 커스텀 모빌리티 브랜드.
              <br />
              상담 및 문의는 아래 연락처로.
            </p>
          </div>
          {[
            { h: "회사", items: ["브랜드", "모델", "갤러리", "고객지원"] },
            { h: "고객지원", items: ["상담 신청", "커스텀 빌더", "자주 묻는 질문", "오시는 길"] },
            { h: "연락처", items: ["TEL. 000-0000-0000", "MAIL. info@ksmobility.example", "인천광역시 ○○구 ○○로", "평일 09:00 – 18:00"] },
          ].map((col) => (
            <div key={col.h}>
              <div className="text-sm font-semibold text-zinc-300">{col.h}</div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-500">
                {col.items.map((it) => (
                  <li key={it}>
                    <span className="transition-colors hover:text-zinc-300">{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-8 text-xs text-zinc-600">
          © 2026 KS MOBILITY. 본 페이지는 레이아웃 구조 예시(skeleton)입니다.
        </div>
      </footer>
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
