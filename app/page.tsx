"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useReducedMotion,
  animate,
  type Variants,
} from "motion/react";

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

const GALLERY = Array.from({ length: 8 }, (_, i) => `VIDEO ${String(i + 1).padStart(2, "0")}`);
const PRESS = ["PRESS A", "PRESS B", "PRESS C", "PRESS D", "PRESS E", "PRESS F"];
const STATS = [
  { n: 18, l: "인증 보유" },
  { n: 3, l: "ISO 표준" },
  { n: 1, l: "OEM 파트너십" },
];

/* ── Shared reveal variants ── */
const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduce = useReducedMotion();

  const { scrollY } = useScroll();
  const headerBg = useTransform(scrollY, [0, 120], ["rgba(10,10,11,0)", "rgba(10,10,11,0.72)"]);
  const headerBorder = useTransform(scrollY, [0, 120], ["rgba(255,255,255,0)", "rgba(255,255,255,0.1)"]);
  const heroY = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 140]);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen w-full">
      {/* ── Header ── */}
      <motion.header
        style={{ backgroundColor: headerBg, borderColor: headerBorder }}
        className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md"
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <nav className="hidden flex-1 items-center gap-7 text-sm text-zinc-300 lg:flex">
            {NAV.slice(0, 3).map((n) => (
              <a key={n.href} href={n.href} className="relative transition-colors hover:text-white">
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
                <a key={n.href} href={n.href} className="transition-colors hover:text-white">
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
            {/* Mobile hamburger */}
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
      </motion.header>

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
          <motion.div style={{ y: heroY }} className="absolute inset-0">
            {HERO_SLIDES.map((label, i) => (
              <motion.div
                key={label}
                data-label={label}
                className="ph absolute inset-0"
                animate={
                  i === slide
                    ? { opacity: 1, scale: reduce ? 1 : 1.08 }
                    : { opacity: 0, scale: 1 }
                }
                transition={{
                  opacity: { duration: 1.2, ease: "easeInOut" },
                  scale: { duration: 6, ease: "linear" },
                }}
              />
            ))}
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />

          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
          >
            <motion.p variants={reveal} className="mb-4 text-xs tracking-[0.4em] text-zinc-400">
              LUXURY CUSTOM MOBILITY
            </motion.p>
            <motion.h1 variants={reveal} className="max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
              당신을 위한
              <br />
              단 하나의 모빌리티
            </motion.h1>
            <motion.div variants={reveal} className="mt-10 flex flex-col gap-4 sm:flex-row">
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
            </motion.div>
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
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4"
          >
            {PILLARS.map((p) => (
              <motion.div variants={reveal} key={p.no} className="bg-[#0e0e10] p-8">
                <div className="font-mono text-sm text-zinc-500">{p.no}</div>
                <h3 className="mt-6 text-lg font-semibold">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ── Collections ── */}
        <Section id="models" eyebrow="PRODUCT COLLECTIONS" title="라인업">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          >
            {COLLECTIONS.map((c) => (
              <motion.a
                variants={reveal}
                whileHover={{ y: -6 }}
                key={c.name}
                href="#consult"
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10] transition-colors hover:border-white/25"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <div data-label={c.tag} className="ph h-full w-full transition-transform duration-700 group-hover:scale-110" />
                </div>
                <div className="p-6">
                  <div className="text-xs tracking-[0.2em] text-zinc-500">{c.tag}</div>
                  <h3 className="mt-2 text-xl font-semibold">{c.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{c.desc}</p>
                  <span className="mt-5 inline-block text-sm text-zinc-300 transition-transform group-hover:translate-x-1">
                    자세히 보기 →
                  </span>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </Section>

        {/* ── Feature showcase ── */}
        <Section id="builder" eyebrow='55" DIGITAL SKY VIEW' title="공간을 완성하는 기술">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <motion.div
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              data-label="FEATURE SHOWCASE"
              className="ph aspect-video w-full rounded-2xl"
            />
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="space-y-6"
            >
              {[
                { t: "빌트인 PC", d: "차량에 내장된 고성능 컴퓨팅 시스템." },
                { t: "앱 컨트롤", d: "전용 애플리케이션으로 실내 환경을 제어." },
                { t: "통합 컨트롤", d: "조명 · 사운드 · 디스플레이를 하나의 인터페이스로." },
              ].map((f) => (
                <motion.div variants={reveal} key={f.t} className="border-l-2 border-white/20 pl-5">
                  <h3 className="text-lg font-semibold">{f.t}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{f.d}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Section>

        {/* ── Craft / video ── */}
        <Section id="craft" eyebrow="THE CRAFT" title="제작 과정">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="relative overflow-hidden rounded-2xl border border-white/10"
          >
            <div data-label="CRAFT VIDEO" className="ph aspect-[21/9] w-full" />
            <motion.button
              aria-label="영상 재생"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black"
            >
              <span className="ml-1 text-xl">▶</span>
            </motion.button>
          </motion.div>
        </Section>

        {/* ── Media gallery ── */}
        <Section id="gallery" eyebrow="MEDIA GALLERY" title="갤러리">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {GALLERY.map((g) => (
              <motion.div
                variants={reveal}
                whileHover={{ scale: 1.03 }}
                key={g}
                data-label={g}
                className="ph aspect-video w-full rounded-xl"
              />
            ))}
          </motion.div>
        </Section>

        {/* ── Press ── */}
        <Section id="press" eyebrow="PRESS COVERAGE" title="언론 보도">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-6"
          >
            {PRESS.map((p) => (
              <motion.div
                variants={reveal}
                key={p}
                className="flex h-24 items-center justify-center bg-[#0e0e10] text-xs tracking-widest text-zinc-500"
              >
                {p}
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ── Certifications ── */}
        <Section id="support" eyebrow="CERTIFICATIONS" title="인증 및 파트너십">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-3"
          >
            {STATS.map((s) => (
              <motion.div
                variants={reveal}
                key={s.l}
                className="rounded-2xl border border-white/10 bg-[#0e0e10] p-10 text-center"
              >
                <Counter to={s.n} reduce={!!reduce} />
                <div className="mt-3 text-sm tracking-wider text-zinc-400">{s.l}</div>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ── Final CTA ── */}
        <section id="consult" className="border-y border-white/10 bg-[#0e0e10]">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mx-auto max-w-4xl px-6 py-24 text-center"
          >
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
          </motion.div>
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

/* ── Count-up number ── */
function Counter({ to, reduce }: { to: number; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(to);
      return;
    }
    const controls = animate(count, to, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, reduce, count]);

  return (
    <div ref={ref} className="text-5xl font-semibold tabular-nums">
      {display}
    </div>
  );
}

/* ── Section wrapper with heading reveal ── */
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
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mb-12"
      >
        <motion.p variants={reveal} className="text-xs tracking-[0.3em] text-zinc-500">
          {eyebrow}
        </motion.p>
        <motion.h2 variants={reveal} className="mt-3 text-3xl font-semibold sm:text-4xl">
          {title}
        </motion.h2>
      </motion.div>
      {children}
    </section>
  );
}
