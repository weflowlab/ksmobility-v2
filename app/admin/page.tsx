"use client";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import {
  LogOut,
  Menu,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowLeft,
  Plus,
  Pencil,
  Pin,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Users,
  Clock,
  Smartphone,
  LogIn,
  TrendingUp,
  ChevronsDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

// 관리자 비밀번호는 서버 환경변수(ADMIN_PASSWORD)에서만 검증 — 클라이언트 노출 없음

type Status = "pending" | "in_progress" | "done";
type Tab = "inquiries" | "notices" | "faqs" | "analytics" | "traffic";
type Filter = "전체" | "대기" | "진행중" | "완료";

const STATUS_KO: Record<Status, string> = {
  pending: "대기",
  in_progress: "진행중",
  done: "완료",
};
const STATUS_STYLE: Record<
  Status,
  { bg: string; color: string; border: string }
> = {
  pending: {
    bg: "rgba(255,255,255,0.05)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-strong)",
  },
  in_progress: {
    bg: "var(--amber-bg)",
    color: "var(--amber)",
    border: "1px solid var(--amber-border)",
  },
  done: {
    bg: "var(--emerald-bg)",
    color: "var(--emerald)",
    border: "1px solid var(--emerald-border)",
  },
};

interface Inquiry {
  id: string;
  status: Status;
  name: string;
  phone: string;
  note: string;
  source: string;
  agree: boolean;
  createdAt: string;
}
interface Notice {
  id: string;
  title: string;
  body: string;
  published: boolean;
  pinned: boolean;
  createdAt: string;
}
interface Faq {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  createdAt: string;
}

interface PageView {
  id: string;
  sessionId: string;
  path: string;
  referrer: string;
  source: string;
  medium: string;
  campaign: string;
  device: string;
  durationMs: number | null;
  maxScroll: number | null;
  createdAt: string;
}

const FILTERS: Filter[] = ["전체", "대기", "진행중", "완료"];
const TABS: { key: Tab; label: string }[] = [
  { key: "inquiries", label: "상담 관리" },
  { key: "notices", label: "공지 관리" },
  { key: "faqs", label: "FAQ 관리" },
  { key: "analytics", label: "통계 관리" },
  { key: "traffic", label: "유입 관리" },
];

// 문의 목록/필터가 없는 탭 (콘텐츠·통계 탭)
const CONTENT_TABS: Tab[] = ["notices", "faqs", "analytics", "traffic"];
// 상단 통계 카드 자체를 숨기는 탭 (자체 지표를 그린다)
const CHART_TABS: Tab[] = ["analytics", "traffic"];

// 접수 목록 기간 선택 (days=null 이면 전체)
const PERIODS: { key: string; label: string; days: number | null }[] = [
  { key: "today", label: "오늘", days: 1 },
  { key: "7d", label: "최근 7일", days: 7 },
  { key: "30d", label: "최근 30일", days: 30 },
  { key: "all", label: "전체", days: null },
];

// 기간 → 집계 시작 시각(ms). '오늘'은 로컬 자정부터(달력상 오늘),
// 그 외 '최근 N일'은 현재 시각 기준 롤링. days=null(전체)이면 0 반환.
function periodCutoff(periodKey: string): number {
  const days = PERIODS.find((p) => p.key === periodKey)?.days;
  if (days == null) return 0;
  if (periodKey === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function withinPeriod<T extends { createdAt: string }>(
  rows: T[],
  periodKey: string,
): T[] {
  const cutoff = periodCutoff(periodKey);
  if (cutoff === 0) return rows;
  return rows.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// 받침 유무에 따른 서술격 조사 — "직접 유입이에요" / "네이버예요"
// 한글 음절(가~힣)에서 (코드 - 0xAC00) % 28 이 0 이 아니면 받침이 있다.
function josaIeyo(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "예요"; // 한글이 아니면(도메인 등) 기본값
  return (code - 0xac00) % 28 !== 0 ? "이에요" : "예요";
}

// 상태 분포 막대의 구간 색 (다크 테마 토큰과 동일 계열)
const STATUS_SEG: { key: Status; label: string; color: string }[] = [
  { key: "pending", label: "대기", color: "#71717a" },
  { key: "in_progress", label: "진행중", color: "#fbbf24" },
  { key: "done", label: "완료", color: "#34d399" },
];

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function PeriodSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "999px",
        padding: "0.45rem 1.1rem",
        fontSize: "0.875rem",
        fontWeight: 700,
        color: "var(--text-secondary)",
        cursor: "pointer",
        fontFamily: "inherit",
        outline: "none",
      }}
    >
      {PERIODS.map((p) => (
        <option key={p.key} value={p.key}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green";
}) {
  // blue = 총계(흰색, 랜딩의 주 색), green = 처리 대기/공개중(에메랄드)
  const accent = color === "blue" ? "var(--accent)" : "var(--emerald)";
  return (
    <div
      className="admin-stat-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "1.25rem 1.4rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.55rem",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: accent,
            flexShrink: 0,
          }}
        />
        <p
          className="emphasized"
          style={{
            color: "var(--text-muted)",
            margin: 0,
            letterSpacing: "0.01em",
            fontSize: "0.75rem",
          }}
        >
          {label}
        </p>
      </div>
      <p
        style={{
          margin: 0,
          lineHeight: 1,
          fontSize: "1.75rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: accent,
        }}
      >
        {value}
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            marginLeft: "0.2rem",
          }}
        >
          건
        </span>
      </p>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  red,
  green,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  red?: boolean;
  green?: boolean;
  active?: boolean;
}) {
  let bg = "transparent",
    border = "var(--border-strong)",
    color = "var(--text-secondary)";
  if (active && green) {
    bg = "var(--emerald-bg)";
    border = "var(--emerald-border)";
    color = "var(--emerald)";
  } else if (active) {
    bg = "var(--amber-bg)";
    border = "var(--amber-border)";
    color = "var(--amber)";
  } else if (red) {
    bg = "transparent";
    border = "var(--danger-border)";
    color = "var(--danger)";
  }
  return (
    <button
      onClick={onClick}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "6px",
        padding: "0.3rem 0.8rem",
        fontSize: "0.75rem",
        fontWeight: active ? 700 : 500,
        color,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// 목록에서 i번째 항목을 위/아래로 한 칸 이동시킨 새 배열
function moved<T>(rows: T[], i: number, dir: -1 | 1): T[] {
  const next = [...rows];
  [next[i], next[i + dir]] = [next[i + dir], next[i]];
  return next;
}

function MoveBtns({
  canUp,
  canDown,
  onUp,
  onDown,
}: {
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const base = (enabled: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    background: "transparent",
    border: "1px solid var(--border-strong)",
    borderRadius: "6px",
    color: enabled ? "var(--text-secondary)" : "var(--text-muted)",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.35,
    padding: 0,
    transition: "all 0.15s",
  });
  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      <button
        onClick={onUp}
        disabled={!canUp}
        style={base(canUp)}
        aria-label="위로 이동"
        title="위로 이동"
      >
        <ArrowUp size={13} />
      </button>
      <button
        onClick={onDown}
        disabled={!canDown}
        style={base(canDown)}
        aria-label="아래로 이동"
        title="아래로 이동"
      >
        <ArrowDown size={13} />
      </button>
    </div>
  );
}

function InquiryTable({
  rows,
  onStatusChange,
  onDelete,
  onExport,
}: {
  rows: Inquiry[];
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const colSpan = 7;

  return (
    <section>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onExport}
            className="semibold"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              padding: "0.45rem 1rem",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
          >
            <Download size={16} /> 엑셀 다운로드
          </button>
        </div>
      </div>
      <div
        style={{
          overflowX: "auto",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "780px",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: "0.875rem",
            textAlign: "left",
          }}
        >
          <thead>
            <tr>
              {[
                "접수일",
                "이름",
                "연락처",
                "문의 내용",
                "상태",
                "관리",
                "",
              ].map((h, i) => (
                <th
                  key={i}
                  className="emphasized"
                  style={{
                    padding: "0.9rem 1rem",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
                  className="subhead"
                  style={{
                    padding: "3rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  표시할 항목이 없습니다.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const expanded = expandedId === row.id;
              const st = row.status;
              const bd = "1px solid var(--border-subtle)";
              return (
                <Fragment key={row.id}>
                  <tr className="admin-row">
                    <td
                      style={{
                        padding: "0.9rem 1rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        borderBottom: bd,
                      }}
                    >
                      {fmt(row.createdAt)}
                    </td>
                    <td
                      style={{
                        padding: "0.9rem 1rem",
                        fontWeight: 600,
                        color: "var(--text)",
                        borderBottom: bd,
                      }}
                    >
                      {row.name}
                    </td>
                    <td
                      style={{
                        padding: "0.9rem 1rem",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        borderBottom: bd,
                      }}
                    >
                      <a
                        href={`tel:${row.phone.replace(/[^0-9]/g, "")}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {row.phone}
                      </a>
                    </td>
                    {/* 한 줄 미리보기 — 전문은 아래 펼침 영역에서 */}
                    <td
                      style={{
                        padding: "0.9rem 1rem",
                        color: "var(--text-secondary)",
                        borderBottom: bd,
                        maxWidth: "320px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.note || undefined}
                    >
                      {row.note || "-"}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", borderBottom: bd }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: STATUS_STYLE[st].bg,
                          color: STATUS_STYLE[st].color,
                          border: STATUS_STYLE[st].border,
                          borderRadius: "7px",
                          padding: "0.3rem 0.8rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {STATUS_KO[st]}
                      </span>
                    </td>
                    <td style={{ padding: "0.9rem 1rem", borderBottom: bd }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                          flexWrap: "nowrap",
                        }}
                      >
                        <ActionBtn
                          active={st === "in_progress"}
                          onClick={() => onStatusChange(row.id, "in_progress")}
                        >
                          진행중
                        </ActionBtn>
                        <ActionBtn
                          active={st === "done"}
                          green
                          onClick={() => onStatusChange(row.id, "done")}
                        >
                          완료
                        </ActionBtn>
                        <ActionBtn red onClick={() => onDelete(row.id)}>
                          삭제
                        </ActionBtn>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "0.9rem 0.75rem",
                        textAlign: "right",
                        borderBottom: bd,
                      }}
                    >
                      <button
                        onClick={() => setExpandedId(expanded ? null : row.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          padding: "0.25rem",
                        }}
                        aria-label={expanded ? "접기" : "펼치기"}
                      >
                        {expanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr style={{ background: "var(--bg-secondary)" }}>
                      <td
                        colSpan={colSpan}
                        style={{ padding: "1.1rem 1.25rem", borderBottom: bd }}
                      >
                        <dl className="detail-dl">
                          <div>
                            <dt
                              className="emphasized"
                              style={{
                                color: "var(--text-muted)",
                                marginBottom: "0.3rem",
                                fontSize: "0.75rem",
                              }}
                            >
                              문의 내용
                            </dt>
                            <dd
                              style={{
                                color: "var(--text-secondary)",
                                margin: 0,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {row.note || "-"}
                            </dd>
                          </div>
                          <div>
                            <dt
                              className="emphasized"
                              style={{
                                color: "var(--text-muted)",
                                marginBottom: "0.3rem",
                                fontSize: "0.75rem",
                              }}
                            >
                              출처
                            </dt>
                            <dd
                              style={{
                                color: "var(--text-secondary)",
                                margin: 0,
                              }}
                            >
                              {row.source || "web"}
                            </dd>
                          </div>
                          <div>
                            <dt
                              className="emphasized"
                              style={{
                                color: "var(--text-muted)",
                                marginBottom: "0.3rem",
                                fontSize: "0.75rem",
                              }}
                            >
                              개인정보 동의
                            </dt>
                            <dd
                              style={{
                                color: "var(--text-secondary)",
                                margin: 0,
                              }}
                            >
                              {row.agree ? "동의" : "-"}
                            </dd>
                          </div>
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── 공지 관리 ──────────────────────────────────────────────
type Draft = {
  id: string | null;
  title: string;
  body: string;
  pinned: boolean;
};
const EMPTY_DRAFT: Draft = { id: null, title: "", body: "", pinned: false };

function NoticeManager({
  rows,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: {
  rows: Notice[];
  onCreate: (d: Omit<Draft, "id">, published: boolean) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Notice>) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const editing = draft.id !== null;

  const startNew = () => {
    setDraft(EMPTY_DRAFT);
    setOpen(true);
  };
  const startEdit = (n: Notice) => {
    setDraft({ id: n.id, title: n.title, body: n.body, pinned: n.pinned });
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setDraft(EMPTY_DRAFT);
  };

  const save = async (published: boolean) => {
    if (!draft.title.trim()) return alert("제목을 입력하세요.");
    setSaving(true);
    if (editing) {
      onUpdate(draft.id!, {
        title: draft.title.trim(),
        body: draft.body,
        pinned: draft.pinned,
        published,
      });
    } else {
      await onCreate(
        { title: draft.title.trim(), body: draft.body, pinned: draft.pinned },
        published,
      );
    }
    setSaving(false);
    close();
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <p
          className="subhead"
          style={{ margin: 0, color: "var(--text-muted)" }}
        >
          사이트 공지사항 섹션에 노출됩니다. 임시저장 상태는 사이트에 보이지
          않습니다.
        </p>
        <button
          onClick={open && !editing ? close : startNew}
          className="btn-primary"
          style={{ padding: "0.6rem 1.2rem", fontSize: "0.875rem" }}
        >
          {open && !editing ? (
            <>
              <X size={16} /> 닫기
            </>
          ) : (
            <>
              <Plus size={16} /> 새 공지
            </>
          )}
        </button>
      </div>

      {/* 작성 / 수정 폼 */}
      {open && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h3
            className="title-3 emphasized"
            style={{ margin: 0, color: "var(--text)" }}
          >
            {editing ? "공지 수정" : "새 공지 작성"}
          </h3>
          <div>
            <label
              className="subhead semibold"
              style={{
                display: "block",
                marginBottom: "0.4rem",
                color: "var(--text-secondary)",
              }}
            >
              제목
            </label>
            <input
              className="form-input"
              placeholder="공지 제목"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label
              className="subhead semibold"
              style={{
                display: "block",
                marginBottom: "0.4rem",
                color: "var(--text-secondary)",
              }}
            >
              내용
            </label>
            <textarea
              className="form-input"
              placeholder="공지 내용"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </div>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
            />
            <Pin size={14} /> 상단 고정
          </label>
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="semibold"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "0.7rem 1.3rem",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              임시저장
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="btn-primary"
              style={{ padding: "0.7rem 1.5rem", fontSize: "0.875rem" }}
            >
              {editing ? "수정 게시" : "게시하기"}
            </button>
          </div>
        </div>
      )}

      {/* 공지 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {rows.length === 0 && (
          <div
            className="subhead"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            등록된 공지가 없습니다.
          </div>
        )}
        {rows.map((n, i) => (
          <article
            key={n.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: n.pinned
                ? "3px solid var(--amber)"
                : "1px solid var(--border)",
              borderRadius: "14px",
              padding: "1.1rem 1.3rem",
              opacity: n.published ? 1 : 0.6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className="caption-1 medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {fmtDate(n.createdAt)}
                  </span>
                  {n.pinned && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        background: "var(--amber-bg)",
                        color: "var(--amber)",
                        border: "1px solid var(--amber-border)",
                        borderRadius: "6px",
                        padding: "0.1rem 0.45rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      <Pin size={11} /> 고정
                    </span>
                  )}
                  {!n.published && (
                    <span
                      style={{
                        background: "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-strong)",
                        borderRadius: "6px",
                        padding: "0.1rem 0.45rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      임시저장
                    </span>
                  )}
                </div>
                <h3
                  className="emphasized"
                  style={{
                    margin: "0 0 0.35rem",
                    color: "var(--text)",
                    fontSize: "0.875rem",
                  }}
                >
                  {n.title}
                </h3>
                <p
                  className="subhead"
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {n.body || "-"}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  flexShrink: 0,
                  alignItems: "center",
                }}
              >
                {/* 고정 공지는 항상 위 그룹에 모이므로 이동은 같은 그룹 안에서만 */}
                <MoveBtns
                  canUp={i > 0 && rows[i - 1].pinned === n.pinned}
                  canDown={
                    i < rows.length - 1 && rows[i + 1].pinned === n.pinned
                  }
                  onUp={() => onReorder(moved(rows, i, -1).map((r) => r.id))}
                  onDown={() => onReorder(moved(rows, i, 1).map((r) => r.id))}
                />
                <ActionBtn onClick={() => startEdit(n)}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <Pencil size={12} /> 수정
                  </span>
                </ActionBtn>
                <ActionBtn
                  active={n.published}
                  green={n.published}
                  onClick={() => onUpdate(n.id, { published: !n.published })}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {n.published ? <Eye size={12} /> : <EyeOff size={12} />}
                    {n.published ? "게시중" : "숨김"}
                  </span>
                </ActionBtn>
                <ActionBtn red onClick={() => onDelete(n.id)}>
                  삭제
                </ActionBtn>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontSize: "0.75rem",
        color: "var(--text-secondary)",
      }}
    >
      <span
        style={{ width: 10, height: 3, borderRadius: 2, background: color }}
      />
      {label}
    </span>
  );
}

const CARD: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1.4rem 1.5rem",
};
const H3: React.CSSProperties = {
  margin: 0,
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--text)",
};

// ── 통계 관리 ──────────────────────────────────────────────
function AnalyticsView({ inquiries: allI }: { inquiries: Inquiry[] }) {
  const [period, setPeriod] = useState("today");
  // 현재 시각 — 자정을 지나면 '오늘' 집계가 다음 날로 넘어가야 하므로
  // 마운트에 고정하지 않고 매 렌더(폴링·포커스 갱신 시) 다시 읽는다
  const now = Date.now();
  const periodDays = PERIODS.find((p) => p.key === period)?.days ?? 14;
  const periodLabel =
    PERIODS.find((p) => p.key === period)?.label ?? "최근 14일";

  const cutoff = periodCutoff(period);
  const inquiries = cutoff
    ? allI.filter((i) => new Date(i.createdAt).getTime() >= cutoff)
    : allI;

  // ── 일별 접수 추이 (차트 일수는 기간에 맞춤) ──
  let DAYS = periodDays ?? 14;
  if (periodDays == null) {
    if (allI.length) {
      const earliest = Math.min(
        ...allI.map((r) => new Date(r.createdAt).getTime()),
      );
      DAYS = Math.min(
        90,
        Math.max(14, Math.ceil((now - earliest) / 86400000) + 1),
      );
    }
  }
  const today = new Date();
  const buckets: { key: string; label: string; i: number }[] = [];
  for (let n = DAYS - 1; n >= 0; n--) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - n,
    );
    buckets.push({
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      i: 0,
    });
  }
  const bidx: Record<string, number> = {};
  buckets.forEach((x, n) => {
    bidx[x.key] = n;
  });
  const dkey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  inquiries.forEach((r) => {
    const k = dkey(r.createdAt);
    if (k in bidx) buckets[bidx[k]].i++;
  });
  // '오늘'처럼 하루만 볼 때: 선이 0에서 올라가도록 맨 앞에 0 기준점 추가
  if (buckets.length === 1)
    buckets.unshift({ key: "__start", label: "", i: 0 });
  const maxDaily = Math.max(1, ...buckets.map((x) => x.i));

  // ── 상태 분포 ──
  const stCount: Record<Status, number> = {
    pending: inquiries.filter((r) => r.status === "pending").length,
    in_progress: inquiries.filter((r) => r.status === "in_progress").length,
    done: inquiries.filter((r) => r.status === "done").length,
  };
  const stTotal = stCount.pending + stCount.in_progress + stCount.done;

  // ── SVG 좌표 ──
  const W = 720,
    H = 250,
    padL = 30,
    padR = 12,
    padT = 12,
    padB = 26;
  const plotW = W - padL - padR,
    plotH = H - padT - padB;
  const baseY = padT + plotH;
  const y = (v: number) => baseY - (v / maxDaily) * plotH;
  // 첫 점은 왼쪽 끝, 마지막 점은 오른쪽 끝까지 펼침
  const cx = (n: number) =>
    buckets.length <= 1
      ? padL + plotW / 2
      : padL + (n / (buckets.length - 1)) * plotW;
  const gridVals = Array.from(new Set([0, Math.round(maxDaily / 2), maxDaily]));
  const C_I = "#38bdf8";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>

      <section style={CARD}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h3 style={H3}>{periodLabel} 문의 접수 추이</h3>
          <Legend color={C_I} label="문의" />
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: "block", marginTop: "0.9rem" }}
          role="img"
          aria-label={`${periodLabel} 문의 접수 추이`}
        >
          {gridVals.map((v) => (
            <g key={v}>
              <line
                x1={padL}
                y1={y(v)}
                x2={W - padR}
                y2={y(v)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={y(v) + 3}
                textAnchor="end"
                fontSize={10}
                fill="var(--text-muted)"
              >
                {v}
              </text>
            </g>
          ))}
          <polyline
            fill="none"
            stroke={C_I}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={buckets.map((d, n) => `${cx(n)},${y(d.i)}`).join(" ")}
          />
          {buckets.map((d, n) => (
            <g key={d.key}>
              <circle
                cx={cx(n)}
                cy={y(d.i)}
                r={4}
                fill="var(--surface)"
                stroke={C_I}
                strokeWidth={2}
              >
                <title>
                  {d.label} · 문의 {d.i}
                </title>
              </circle>
              {n % 2 === 1 && (
                <text
                  x={cx(n)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {d.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </section>

      <section style={CARD}>
        <h3 style={{ ...H3, marginBottom: "1.1rem" }}>상태 분포</h3>
        {stTotal === 0 ? (
          <p
            className="subhead"
            style={{ color: "var(--text-muted)", margin: 0 }}
          >
            {periodLabel} 접수된 문의가 없습니다.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                height: 12,
                borderRadius: 999,
                overflow: "hidden",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {STATUS_SEG.map((s) =>
                stCount[s.key] ? (
                  <div
                    key={s.key}
                    style={{
                      width: `${(stCount[s.key] / stTotal) * 100}%`,
                      background: s.color,
                    }}
                    title={`${s.label} ${stCount[s.key]}건`}
                  />
                ) : null,
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: "1.2rem",
                marginTop: "0.9rem",
                flexWrap: "wrap",
              }}
            >
              {STATUS_SEG.map((s) => (
                <span
                  key={s.key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: s.color,
                    }}
                  />
                  {s.label}
                  <b style={{ color: "var(--text)" }}>{stCount[s.key]}</b>
                </span>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ── FAQ 관리 ───────────────────────────────────────────────
type FaqDraft = { id: string | null; question: string; answer: string };
const EMPTY_FAQ: FaqDraft = { id: null, question: "", answer: "" };

function FaqManager({
  rows,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: {
  rows: Faq[];
  onCreate: (d: Omit<FaqDraft, "id">, published: boolean) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Faq>) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const [draft, setDraft] = useState<FaqDraft>(EMPTY_FAQ);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const editing = draft.id !== null;

  const close = () => {
    setOpen(false);
    setDraft(EMPTY_FAQ);
  };

  const save = async (published: boolean) => {
    if (!draft.question.trim()) return alert("질문을 입력하세요.");
    setSaving(true);
    if (editing) {
      onUpdate(draft.id!, {
        question: draft.question.trim(),
        answer: draft.answer,
        published,
      });
    } else {
      await onCreate(
        { question: draft.question.trim(), answer: draft.answer },
        published,
      );
    }
    setSaving(false);
    close();
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <p
          className="subhead"
          style={{ margin: 0, color: "var(--text-muted)" }}
        >
          사이트 FAQ 섹션에 아래 순서(등록 순)대로 노출됩니다. 비공개 항목은
          사이트에 보이지 않습니다.
        </p>
        <button
          onClick={
            open && !editing
              ? close
              : () => {
                  setDraft(EMPTY_FAQ);
                  setOpen(true);
                }
          }
          className="btn-primary"
          style={{ padding: "0.6rem 1.2rem", fontSize: "0.875rem" }}
        >
          {open && !editing ? (
            <>
              <X size={16} /> 닫기
            </>
          ) : (
            <>
              <Plus size={16} /> 새 질문
            </>
          )}
        </button>
      </div>

      {open && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h3
            className="title-3 emphasized"
            style={{ margin: 0, color: "var(--text)" }}
          >
            {editing ? "질문 수정" : "새 질문 추가"}
          </h3>
          <div>
            <label
              className="subhead semibold"
              style={{
                display: "block",
                marginBottom: "0.4rem",
                color: "var(--text-secondary)",
              }}
            >
              질문
            </label>
            <input
              className="form-input"
              placeholder="예: 상담은 어떻게 진행되나요?"
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label
              className="subhead semibold"
              style={{
                display: "block",
                marginBottom: "0.4rem",
                color: "var(--text-secondary)",
              }}
            >
              답변
            </label>
            <textarea
              className="form-input"
              placeholder="답변 내용"
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="semibold"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "0.7rem 1.3rem",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              비공개로 저장
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="btn-primary"
              style={{ padding: "0.7rem 1.5rem", fontSize: "0.875rem" }}
            >
              {editing ? "수정 저장" : "추가하기"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {rows.length === 0 && (
          <div
            className="subhead"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            등록된 질문이 없습니다.
          </div>
        )}
        {rows.map((f, i) => (
          <article
            key={f.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "1.1rem 1.3rem",
              opacity: f.published ? 1 : 0.6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    className="caption-1 medium"
                    style={{
                      color: "var(--text-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {i + 1}번째
                  </span>
                  {!f.published && (
                    <span
                      style={{
                        background: "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-strong)",
                        borderRadius: "6px",
                        padding: "0.1rem 0.45rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      비공개
                    </span>
                  )}
                </div>
                <h3
                  className="emphasized"
                  style={{
                    margin: "0 0 0.35rem",
                    color: "var(--text)",
                    fontSize: "0.875rem",
                  }}
                >
                  Q. {f.question}
                </h3>
                <p
                  className="subhead"
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  A. {f.answer || "-"}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  flexShrink: 0,
                  alignItems: "center",
                }}
              >
                <MoveBtns
                  canUp={i > 0}
                  canDown={i < rows.length - 1}
                  onUp={() => onReorder(moved(rows, i, -1).map((r) => r.id))}
                  onDown={() => onReorder(moved(rows, i, 1).map((r) => r.id))}
                />
                <ActionBtn
                  onClick={() => {
                    setDraft({
                      id: f.id,
                      question: f.question,
                      answer: f.answer,
                    });
                    setOpen(true);
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <Pencil size={12} /> 수정
                  </span>
                </ActionBtn>
                <ActionBtn
                  active={f.published}
                  green={f.published}
                  onClick={() => onUpdate(f.id, { published: !f.published })}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {f.published ? <Eye size={12} /> : <EyeOff size={12} />}
                    {f.published ? "공개중" : "비공개"}
                  </span>
                </ActionBtn>
                <ActionBtn red onClick={() => onDelete(f.id)}>
                  삭제
                </ActionBtn>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── 유입 관리 ──────────────────────────────────────────────
const SOURCE_KO: Record<string, string> = {
  kakao: "카카오",
  naver: "네이버",
  instagram: "인스타그램",
  facebook: "페이스북",
  google: "구글",
  daum: "다음",
  twitter: "X(트위터)",
  youtube: "유튜브",
  tiktok: "틱톡",
  band: "밴드",
  direct: "직접 유입",
};
// 다크 배경에서 읽히는 값으로 조정 (weflow 의 twitter #111 은 여기선 안 보인다)
const SOURCE_COLOR: Record<string, string> = {
  kakao: "#fae100",
  naver: "#03c75a",
  instagram: "#f06595",
  facebook: "#1877f2",
  google: "#ea4335",
  daum: "#06b6d4",
  twitter: "#e4e4e7",
  youtube: "#ff0000",
  tiktok: "#25f4ee",
  band: "#00c73c",
  direct: "#94a3b8",
};
// utm 약자·별칭 소스 통합 (예: ig → instagram) — 같은 채널을 한 줄로 합침
const SOURCE_ALIAS: Record<string, string> = {
  ig: "instagram",
  insta: "instagram",
  fb: "facebook",
  meta: "facebook",
  yt: "youtube",
  x: "twitter",
  "band.us": "band",
};
function normSource(s: string): string {
  const k = (s || "direct").toLowerCase();
  return SOURCE_ALIAS[k] || k;
}
const DEVICE_KO: Record<string, string> = {
  mobile: "모바일",
  tablet: "태블릿",
  desktop: "데스크탑",
};
const DEVICE_COLOR: Record<string, string> = {
  mobile: "#38bdf8",
  tablet: "#fbbf24",
  desktop: "#34d399",
};

function fmtDur(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}분 ${rem}초` : `${m}분`;
}

function TrafficMetric({
  Icon,
  label,
  value,
  sub,
  tint,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "1.3rem 1.4rem",
        borderTop: `3px solid ${tint}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          marginBottom: "0.7rem",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `${tint}1f`,
            color: tint,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <p
          className="emphasized"
          style={{
            color: "var(--text-secondary)",
            margin: 0,
            fontSize: "0.9rem",
            wordBreak: "keep-all",
          }}
        >
          {label}
        </p>
      </div>
      <p
        style={{
          margin: 0,
          lineHeight: 1.05,
          fontSize: "2.25rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            margin: "0.5rem 0 0",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHead({
  Icon,
  title,
  desc,
  tint,
}: {
  Icon: LucideIcon;
  title: string;
  desc: string;
  tint: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.7rem",
        marginBottom: "1.2rem",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${tint}1f`,
          color: tint,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <h3 style={H3}>{title}</h3>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            wordBreak: "keep-all",
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

function BarRow({
  label,
  color,
  value,
  max,
  right,
}: {
  label: string;
  color: string;
  value: number;
  max: number;
  right: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span
        style={{
          flex: "0 0 100px",
          fontSize: "0.875rem",
          color: "var(--text-secondary)",
          wordBreak: "keep-all",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 20,
          borderRadius: 5,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${max ? (value / max) * 100 : 0}%`,
            height: "100%",
            background: color,
            borderRadius: 5,
          }}
        />
      </div>
      <span
        style={{
          flex: "0 0 92px",
          textAlign: "right",
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "var(--text)",
        }}
      >
        {right}
      </span>
    </div>
  );
}

// 단일 랜딩페이지이므로 '어느 페이지에서 이탈했나'는 의미가 없다.
// 대신 스크롤 도달률로 어디까지 읽고 나갔는지를 본다.
// 지표는 3개다. 페이지뷰는 단일 페이지라 방문자 수와 항상 같아(1세션=1페이지뷰) 뺐고,
// 문의 전환율도 넣지 않는다 — 이 사이트는 카카오톡·전화가 주 문의 경로라
// 폼 기준 전환율은 실제보다 크게 낮게 나와 오히려 판단을 흐린다.
function TrafficView({
  pageViews: allPageViews,
  loading,
  period,
  onPeriodChange,
}: {
  pageViews: PageView[];
  loading: boolean;
  period: string;
  onPeriodChange: (p: string) => void;
}) {
  // 날짜별 방문자 차트 가로 스크롤 — 모바일에서 14칸을 다 그리면 뭉개지므로
  // 최소 폭을 주고 옆으로 밀어서 보게 한다. 열었을 때 최신 날짜가 먼저 보이도록
  // 오른쪽 끝으로 스크롤해 둔다. (훅이라 아래 조기 return 보다 위에 있어야 한다)
  const dailyScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = dailyScrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [allPageViews]);

  const pageViews = withinPeriod(allPageViews, period);

  // 세션 단위로 묶기
  const sessions = new Map<string, PageView[]>();
  pageViews.forEach((v) => {
    const arr = sessions.get(v.sessionId);
    if (arr) arr.push(v);
    else sessions.set(v.sessionId, [v]);
  });
  const sessionList = Array.from(sessions.values());

  // 날짜별 방문자 차트는 기간 선택과 무관하게 최근 14일 전체
  const allSessions = new Map<string, PageView[]>();
  allPageViews.forEach((v) => {
    const arr = allSessions.get(v.sessionId);
    if (arr) arr.push(v);
    else allSessions.set(v.sessionId, [v]);
  });
  const allSessionList = Array.from(allSessions.values());

  const totalSessions = sessionList.length;

  const sourceCount: Record<string, number> = {};
  const deviceCount: Record<string, number> = {};
  let durSum = 0,
    durN = 0;
  sessionList.forEach((views) => {
    const entry = views[0];
    const src = normSource(entry.source);
    sourceCount[src] = (sourceCount[src] || 0) + 1;
    deviceCount[entry.device] = (deviceCount[entry.device] || 0) + 1;
    const sessionDur = views.reduce((a, v) => a + (v.durationMs || 0), 0);
    if (sessionDur > 0) {
      durSum += sessionDur;
      durN++;
    }
  });
  const avgDur = durN ? durSum / durN : 0;

  const sourceRows = Object.entries(sourceCount).sort((a, b) => b[1] - a[1]);
  const maxSource = Math.max(1, ...sourceRows.map((r) => r[1]));
  // 요약 배너용 1위 유입 경로 (정렬돼 있으므로 첫 항목)
  const topSource = sourceRows[0];
  const topSourceName = topSource ? SOURCE_KO[topSource[0]] || topSource[0] : "";
  const topSourcePct = topSource
    ? Math.round((topSource[1] / totalSessions) * 100)
    : 0;
  const deviceRows = Object.entries(deviceCount).sort((a, b) => b[1] - a[1]);

  // 일별 방문(세션 수) — 최근 14일
  const DAYS = 14;
  const today = new Date();
  const days: { key: string; label: string; v: number }[] = [];
  const didx: Record<string, number> = {};
  for (let n = DAYS - 1; n >= 0; n--) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - n,
    );
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    didx[key] = days.length;
    days.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, v: 0 });
  }
  allSessionList.forEach((views) => {
    const d = new Date(views[0].createdAt);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (key in didx) days[didx[key]].v++;
  });
  const maxDay = Math.max(1, ...days.map((d) => d.v));

  // 시간대별 (0~23시, 페이지뷰 기준)
  const hours = Array.from({ length: 24 }, () => 0);
  pageViews.forEach((v) => {
    hours[new Date(v.createdAt).getHours()]++;
  });
  const maxHour = Math.max(1, ...hours);

  // '평균 스크롤 도달' 지표용 — 다른 지표(방문자·유입경로·기기)와 같은
  // '방문자(세션)' 단위로 센다. 한 방문자가 여러 페이지를 봤으면 그중 가장
  // 깊이 내려간 값을 그 사람의 기록으로 쓴다.
  // 스크롤 값은 방문자가 페이지를 떠날 때만 전송되므로(PageTracker.flush),
  // 아직 보고 있는 중이거나 전송이 실패한 방문은 기록이 없어 분모에서 빠진다.
  const sessionScroll = sessionList
    .map((views) => {
      const vals = views
        .map((v) => v.maxScroll)
        .filter((m): m is number => m != null);
      return vals.length ? Math.max(...vals) : null;
    })
    .filter((m): m is number => m != null);
  const scrollTotal = sessionScroll.length;
  const avgScroll = scrollTotal
    ? Math.round(sessionScroll.reduce((a, m) => a + m, 0) / scrollTotal)
    : 0;

  if (loading && allPageViews.length === 0) {
    return (
      <p
        className="subhead"
        style={{ padding: "2rem 0", color: "var(--text-muted)" }}
      >
        불러오는 중…
      </p>
    );
  }
  if (!loading && allPageViews.length === 0) {
    // 기간 선택은 여기서도 반드시 그린다. 선택한 기간에 기록이 없다고 드롭다운까지
    // 숨기면, 더 넓은 기간('전체')으로 되돌릴 방법이 없어 갇힌다.
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <PeriodSelect value={period} onChange={onPeriodChange} />
        </div>
        <div style={CARD}>
          <p
            className="subhead"
            style={{
              color: "var(--text-muted)",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.7,
            }}
          >
            {period === "all" ? (
              <>
                아직 방문 기록이 없습니다.
                <br />
                방문 집계는{" "}
                <b style={{ color: "var(--text-secondary)" }}>커스텀 도메인</b>{" "}
                연결 후부터 쌓입니다.
                <br />
                (로컬 개발과 vercel.app 주소는 테스트 트래픽이라 집계에서
                제외됩니다)
              </>
            ) : (
              <>
                이 기간에는 방문 기록이 없습니다.
                <br />
                위에서 기간을{" "}
                <b style={{ color: "var(--text-secondary)" }}>전체</b> 로 바꿔
                보세요.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <PeriodSelect value={period} onChange={onPeriodChange} />
      </div>

      {/* 핵심 지표 */}
      <div
        style={{ display: "grid", gap: "1rem" }}
        className="traffic-metric-grid"
      >
        <TrafficMetric
          Icon={Users}
          tint="#34d399"
          label="방문자 수"
          value={String(totalSessions)}
          sub="선택 기간 방문 고객"
        />
        <TrafficMetric
          Icon={ChevronsDown}
          tint="#38bdf8"
          label="평균 스크롤 도달"
          value={scrollTotal ? `${avgScroll}%` : "-"}
          sub="고객이 읽은 페이지 분량"
        />
        <TrafficMetric
          Icon={Clock}
          tint="#fbbf24"
          label="평균 머문 시간"
          value={durN ? fmtDur(avgDur) : "-"}
          sub="한 명이 머문 평균 시간"
        />
      </div>

      {/* 요약 한 줄 — 화면을 열자마자 핵심(1위 유입 경로)이 읽히도록 */}
      {topSource && (
        <div
          style={{
            ...CARD,
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.6rem",
              height: "2.6rem",
              flex: "none",
              borderRadius: "0.7rem",
              background: "rgba(52, 211, 153, 0.12)",
              color: "#34d399",
            }}
          >
            <TrendingUp size={22} />
          </span>
          <p
            style={{
              margin: 0,
              fontSize: "1.05rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              wordBreak: "keep-all",
            }}
          >
            고객이 가장 많이 들어온 곳은{" "}
            <b style={{ color: "#34d399" }}>{topSourceName}</b>
            {josaIeyo(topSourceName)} — 전체 방문자의{" "}
            <b style={{ color: "var(--text)" }}>{topSourcePct}%</b>
          </p>
        </div>
      )}

      <div className="analytics-2col">
        {/* 유입 경로 */}
        <section style={CARD}>
          <SectionHead
            Icon={LogIn}
            tint="#38bdf8"
            title="어디서 들어왔나요?"
            desc="고객들이 우리 사이트를 찾은 경로"
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
          >
            {sourceRows.map(([src, n]) => (
              <BarRow
                key={src}
                label={SOURCE_KO[src] || src}
                color={SOURCE_COLOR[src] || "#94a3b8"}
                value={n}
                max={maxSource}
                right={`${n}명 (${Math.round((n / totalSessions) * 100)}%)`}
              />
            ))}
            {sourceRows.length === 0 && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                }}
              >
                데이터가 없습니다.
              </p>
            )}
          </div>
        </section>

        {/* 기기 */}
        <section style={CARD}>
          <SectionHead
            Icon={Smartphone}
            tint="#a78bfa"
            title="무엇으로 봤나요?"
            desc="휴대폰·컴퓨터 등 접속 기기"
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
          >
            {deviceRows.map(([dev, n]) => (
              <BarRow
                key={dev}
                label={DEVICE_KO[dev] || dev}
                color={DEVICE_COLOR[dev] || "#94a3b8"}
                value={n}
                max={Math.max(1, ...deviceRows.map((r) => r[1]))}
                right={`${n}명 (${Math.round((n / totalSessions) * 100)}%)`}
              />
            ))}
            {deviceRows.length === 0 && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                }}
              >
                데이터가 없습니다.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* 일별 방문자 — WEFLOW 관리자와 같은 순서로 유입/기기 2열 아래에 둔다 */}
      <section style={CARD}>
        <SectionHead
          Icon={TrendingUp}
          tint="#34d399"
          title="날짜별 방문자"
          desc="최근 14일 동안 하루에 몇 명이 왔는지"
        />
        <div
          ref={dailyScrollRef}
          className="no-scrollbar"
          style={{ overflowX: "auto", overflowY: "hidden" }}
        >
          {/* minWidth 로 14칸의 최소 폭을 확보한다. 좁은 화면에서는 이 폭을
              넘겨 가로 스크롤이 생기고, 넓은 화면에서는 flex 로 꽉 찬다. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "0.5rem",
              height: 160,
              minWidth: 620,
            }}
          >
            {days.map((d) => (
              <div
                key={d.key}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.4rem",
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                  }}
                >
                  {d.v || ""}
                </span>
                <div
                  title={`${d.label} · ${d.v}명`}
                  style={{
                    width: "100%",
                    maxWidth: 34,
                    height: `${(d.v / maxDay) * 100}%`,
                    minHeight: d.v ? 4 : 0,
                    background: "#34d399",
                    borderRadius: "5px 5px 0 0",
                    transition: "height 0.2s",
                  }}
                />
                <span
                  style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 시간대별 — 24칸 막대라 좁으면 눈금이 뭉개진다. '날짜별 방문자'와 같은 전체 폭. */}
      <section style={CARD}>
        <SectionHead
          Icon={Clock}
          tint="#fbbf24"
          title="언제 많이 오나요?"
          desc="하루 중 방문이 몰리는 시간대 (0~23시)"
        />
          {/* 라벨을 막대와 같은 24칸 안에 넣는다. 바깥에서 space-between 으로
              흩뿌리면 24칸 그리드와 기준이 달라 눈금이 막대와 어긋난다. */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
            {hours.map((n, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
                title={`${i}시 · ${n}회`}
              >
                <div
                  style={{
                    width: "100%",
                    height: 90,
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${(n / maxHour) * 100}%`,
                      minHeight: n ? 3 : 0,
                      // 업무시간(9~18시)을 밝게 — 상담 가능한 시간대의 유입을 구분
                      background:
                        i >= 9 && i <= 18
                          ? "#fbbf24"
                          : "rgba(255,255,255,0.18)",
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                </div>
                {/* 24칸에 다 쓰면 겹치므로 6시간 간격 + 마지막만 (단위는 desc 에 있음).
                    라벨이 없는 칸도 height 를 똑같이 차지해야 한다 — 빈 span 은
                    높이가 0이라, 바닥 정렬 상태에서 그 칸 막대만 아래로 내려간다. */}
                <span
                  style={{
                    height: 12,
                    lineHeight: "12px",
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {i % 6 === 0 || i === 23 ? i : ""}
                </span>
              </div>
            ))}
          </div>
      </section>
    </div>
  );
}

// 컴포넌트 안에서 정의하면 렌더마다 새 타입이 되어 DOM 이 통째로 재생성된다.
function Brand({ size = "1.125rem" }: { size?: string }) {
  return (
    <span
      className="emphasized"
      style={{ color: "var(--text)", fontSize: size, letterSpacing: "-0.01em" }}
    >
      특장맨
    </span>
  );
}

// ── 관리자 페이지 ──────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false); // 인증 확인 완료 여부(로그인창 깜빡임 방지)
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<Tab>("inquiries");
  const [filter, setFilter] = useState<Filter>("전체");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [pvLoading, setPvLoading] = useState(false);
  // 유입 관리 기간: 선택값에 따라 서버에서 다시 불러오므로 부모가 들고 있는다
  const [trafficPeriod, setTrafficPeriod] = useState("today");
  // 기본은 '오늘' — 들어오자마자 오늘 접수분부터 보이도록. 상단 통계 카드는
  // 기간과 무관한 전체 집계라 이 값의 영향을 받지 않는다.
  const [listPeriod, setListPeriod] = useState("today");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // 서버 세션(httpOnly 쿠키)으로 로그인 여부 확인
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d?.authed))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  // 새로고침해도 현재 탭 유지 — 마지막 탭을 저장하고 진입 시 복원
  useEffect(() => {
    const saved = localStorage.getItem("ks_admin_tab") as Tab | null;
    if (saved && TABS.some((t) => t.key === saved)) setTab(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("ks_admin_tab", tab);
  }, [tab]);

  // 진행 중인 변경 요청 수. 0보다 크면 자동 갱신이 끼어들지 않는다.
  // (삭제를 화면에 먼저 반영한 뒤 서버 응답을 기다리는 동안 폴링이 돌면,
  //  서버는 아직 지우기 전이라 지운 항목을 되살려 놓는다 → "삭제가 안 된다")
  const pending = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [iRes, nRes, fRes] = await Promise.all([
        fetch("/api/inquiries"),
        fetch("/api/notices"),
        fetch("/api/faqs"),
      ]);
      const [iData, nData, fData] = await Promise.all([
        iRes.json(),
        nRes.json(),
        fRes.json(),
      ]);
      // 응답을 기다리는 사이 변경 요청이 시작됐다면 이 결과는 이미 낡았다
      if (pending.current > 0) return;
      setInquiries(Array.isArray(iData) ? iData : []);
      setNotices(Array.isArray(nData) ? nData : []);
      setFaqs(Array.isArray(fData) ? fData : []);
    } catch {
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // 변경 요청 공통 처리: 요청이 끝날 때까지 폴링을 막고, 끝나면 서버 상태로 맞춘다.
  // 실패하면 화면에 먼저 반영해 둔 낙관적 변경이 이 갱신으로 자동 롤백된다.
  const mutate = useCallback(
    async (req: () => Promise<Response>) => {
      pending.current++;
      try {
        const res = await req();
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        alert("요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        pending.current--;
        await load(true);
      }
    },
    [load],
  );

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  // 유입 관리 탭 진입 시 + 기간 변경 시 방문 데이터 로드
  // (행이 많아 20초 폴링에서는 제외하고, 이 탭에서만 불러온다)
  useEffect(() => {
    if (!authed || tab !== "traffic") return;
    const days = PERIODS.find((p) => p.key === trafficPeriod)?.days ?? null;
    // '방문자 추이' 차트는 기간과 무관하게 최근 14일을 그리므로 최소 14일은 확보한다.
    // (그러지 않으면 '오늘' 선택 시 하루치만 받아와 차트가 비어 보인다)
    const q = days == null ? "all" : String(Math.max(days, 14));
    setPvLoading(true);
    fetch(`/api/analytics?days=${q}`)
      .then((r) => r.json())
      .then((d) => setPageViews(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setPvLoading(false));
  }, [authed, tab, trafficPeriod]);

  // 자동 갱신: 20초 폴링 + 탭 재포커스 시 (조용히 갱신)
  useEffect(() => {
    if (!authed) return;
    const tick = () => {
      if (pending.current === 0) load(true);
    };
    const id = setInterval(tick, 20000);
    const onFocus = tick;
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [authed, load]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        setAuthed(true);
        setPw("");
        return;
      }
    } catch {}
    setPwError(true);
    setTimeout(() => setPwError(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {}
    setAuthed(false);
  };

  const updateInquiry = (id: string, status: Status) => {
    setInquiries((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    mutate(() =>
      fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  };

  const removeInquiry = (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setInquiries((prev) => prev.filter((r) => r.id !== id));
    mutate(() => fetch(`/api/inquiries/${id}`, { method: "DELETE" }));
  };

  const createNotice = async (
    d: { title: string; body: string; pinned: boolean },
    published: boolean,
  ) => {
    await mutate(() =>
      fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, published }),
      }),
    );
  };

  const updateNotice = (id: string, patch: Partial<Notice>) => {
    setNotices((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    );
    mutate(() =>
      fetch(`/api/notices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
  };

  const removeNotice = (id: string) => {
    if (!confirm("이 공지를 삭제하시겠습니까?")) return;
    setNotices((prev) => prev.filter((n) => n.id !== id));
    mutate(() => fetch(`/api/notices/${id}`, { method: "DELETE" }));
  };

  // 순서 변경: 화면을 먼저 바꾸고(낙관적) 서버에 전체 순서를 보낸다.
  // 실패하면 서버 상태로 되돌린다.
  const reorderNotices = (ids: string[]) => {
    const byId = new Map(notices.map((n) => [n.id, n]));
    setNotices(ids.map((id) => byId.get(id)!).filter(Boolean));
    mutate(() =>
      fetch("/api/notices/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }),
    );
  };

  const reorderFaqs = (ids: string[]) => {
    const byId = new Map(faqs.map((f) => [f.id, f]));
    setFaqs(ids.map((id) => byId.get(id)!).filter(Boolean));
    mutate(() =>
      fetch("/api/faqs/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }),
    );
  };

  const createFaq = async (
    d: { question: string; answer: string },
    published: boolean,
  ) => {
    await mutate(() =>
      fetch("/api/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, published }),
      }),
    );
  };

  const updateFaq = (id: string, patch: Partial<Faq>) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    mutate(() =>
      fetch(`/api/faqs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
  };

  const removeFaq = (id: string) => {
    if (!confirm("이 질문을 삭제하시겠습니까?")) return;
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    mutate(() => fetch(`/api/faqs/${id}`, { method: "DELETE" }));
  };

  // 인증 확인 전에는 로그인창을 렌더하지 않음 (모바일에서 로그인창 깜빡임 방지)
  if (!checked) return null;

  if (!authed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-secondary)",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            padding: "2.5rem 2.75rem 2.75rem",
            width: "100%",
            maxWidth: "440px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
            <h1
              className="title-2 emphasized"
              style={{ margin: "0 0 0.35rem" }}
            >
              관리자 로그인
            </h1>
            <p
              className="subhead"
              style={{
                color: "var(--text-muted)",
                margin: 0,
                fontSize: "0.875rem",
              }}
            >
              특장카니발 특장맨 관리자
            </p>
          </div>
          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}
          >
            <div>
              <label
                className="subhead semibold"
                style={{
                  display: "block",
                  marginBottom: "0.45rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.875rem",
                }}
              >
                비밀번호
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="비밀번호를 입력하세요"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                style={{
                  borderColor: pwError ? "var(--danger)" : undefined,
                  fontSize: "0.875rem",
                  padding: "0.8rem 0.95rem",
                }}
                autoFocus
              />
              {pwError && (
                <p
                  className="footnote"
                  style={{
                    color: "var(--danger)",
                    marginTop: "0.35rem",
                    fontSize: "0.875rem",
                  }}
                >
                  비밀번호가 올바르지 않습니다.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{
                justifyContent: "center",
                padding: "1rem",
                fontSize: "0.875rem",
              }}
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingI = inquiries.filter((i) => i.status === "pending").length;
  const publishedN = notices.filter((n) => n.published).length;
  const publishedF = faqs.filter((f) => f.published).length;
  const filteredI = (() => {
    const byPeriod = withinPeriod(inquiries, listPeriod);
    return filter === "전체"
      ? byPeriod
      : byPeriod.filter((r) => STATUS_KO[r.status] === filter);
  })();

  return (
    <div
      className="admin-wrap"
      style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}
    >
      {/* ── 데스크탑 사이드바 ── */}
      <aside
        className="admin-sidebar"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "1.75rem 1.4rem 0" }}>
          <button
            onClick={() => setTab("inquiries")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "0.35rem",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            title="상담 문의로"
          >
            <Brand />
          </button>
          <p
            style={{
              color: "var(--text-muted)",
              margin: 0,
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            관리자
          </p>
        </div>
        <nav
          style={{
            padding: "1.1rem 0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            flex: 1,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: tab === t.key ? "var(--accent)" : "none",
                color:
                  tab === t.key ? "var(--accent-fg)" : "var(--text-secondary)",
                border: "none",
                borderRadius: "12px",
                padding: "0.85rem 1.1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                transition: "all 0.15s",
                width: "100%",
              }}
            >
              {t.label}
            </button>
          ))}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <Link
              href="/"
              className="semibold"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                color: "var(--text-secondary)",
                textDecoration: "none",
                padding: "0.55rem 0.25rem",
                fontSize: "0.875rem",
              }}
            >
              <ArrowLeft size={18} /> 사이트로 돌아가기
            </Link>
            <button
              onClick={handleLogout}
              className="semibold"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "0.55rem 0.25rem",
                fontSize: "0.875rem",
              }}
            >
              <LogOut size={18} /> 로그아웃
            </button>
          </div>
        </nav>
      </aside>

      {/* ── 모바일 상단 헤더 ── */}
      <header
        className="admin-mobile-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          display: "none",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.25rem",
          height: "64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setTab("inquiries")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Brand size="1rem" />
          </button>
          <span
            className="caption-1 medium"
            style={{ color: "var(--text-muted)" }}
          >
            관리자
          </span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            padding: "0.5rem",
          }}
          aria-label="메뉴 열기"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ── 모바일 오버레이 ── */}
      <div
        onClick={() => setMenuOpen(false)}
        className="admin-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.4)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 0.28s ease",
          display: "none",
        }}
      />

      {/* ── 모바일 왼쪽 드로어 ── */}
      <div
        className="admin-drawer"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 201,
          width: "min(260px, 80vw)",
          background: "var(--surface)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.6)",
          display: "none",
          flexDirection: "column",
          transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.25rem",
            height: "72px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => {
                setTab("inquiries");
                setMenuOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Brand size="1rem" />
            </button>
            <span
              className="caption-1 medium"
              style={{ color: "var(--text-muted)" }}
            >
              관리자
            </span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "0.4rem",
            }}
            aria-label="메뉴 닫기"
          >
            <X size={20} />
          </button>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: tab === t.key ? "var(--accent)" : "transparent",
                color:
                  tab === t.key ? "var(--accent-fg)" : "var(--text-secondary)",
                border: "none",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                marginBottom: "0.15rem",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "0.4rem 0",
            }}
          >
            <ArrowLeft size={16} /> 사이트로 돌아가기
          </Link>
          <button
            onClick={handleLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "none",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "0.4rem 0",
            }}
          >
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </div>

      {/* 메인 */}
      <main
        className="admin-main"
        style={{
          flex: 1,
          padding: "clamp(1.75rem, 3vw, 2.75rem) clamp(1.5rem, 3vw, 2.75rem)",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.75rem, 3vw, 2.5rem)",
          }}
        >
          {/* 헤더 */}
          <div>
            <p
              className="footnote emphasized c-accent"
              style={{ margin: "0 0 0.5rem" }}
            >
              ADMIN
            </p>
            <h1
              className="emphasized"
              style={{
                color: "var(--text)",
                margin: "0 0 1.5rem",
                fontSize: "clamp(1.5rem, 3vw, 1.875rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {TABS.find((t) => t.key === tab)?.label}
            </h1>
            {!CHART_TABS.includes(tab) && (
              <div
                style={{ display: "grid", gap: "1rem" }}
                className="stat-grid-2"
              >
                {tab === "faqs" ? (
                  <>
                    <StatCard
                      label="전체 질문"
                      value={faqs.length}
                      color="blue"
                    />
                    <StatCard
                      label="공개중 질문"
                      value={publishedF}
                      color="green"
                    />
                  </>
                ) : tab === "notices" ? (
                  <>
                    <StatCard
                      label="전체 공지"
                      value={notices.length}
                      color="blue"
                    />
                    <StatCard
                      label="게시중 공지"
                      value={publishedN}
                      color="green"
                    />
                  </>
                ) : (
                  <>
                    <StatCard
                      label="전체 문의"
                      value={inquiries.length}
                      color="blue"
                    />
                    <StatCard
                      label="대기중 문의"
                      value={pendingI}
                      color="green"
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* 필터 + 새로고침 */}
          {!CONTENT_TABS.includes(tab) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  flexWrap: "wrap",
                }}
              >
                <PeriodSelect value={listPeriod} onChange={setListPeriod} />
                <div
                  style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}
                >
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        background:
                          filter === f ? "var(--accent)" : "transparent",
                        color:
                          filter === f
                            ? "var(--accent-fg)"
                            : "var(--text-secondary)",
                        border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: "999px",
                        padding: "0.45rem 1.1rem",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => load()}
                disabled={loading}
                className="admin-refresh-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "999px",
                  padding: "0.45rem 1.1rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <RefreshCw size={14} className={loading ? "spin" : ""} />
                <span className="refresh-label">새로고침</span>
              </button>
            </div>
          )}

          {/* 상담 문의 */}
          {!CONTENT_TABS.includes(tab) && (
            <InquiryTable
              rows={filteredI}
              onStatusChange={updateInquiry}
              onDelete={removeInquiry}
              onExport={() => window.open("/api/export", "_blank")}
            />
          )}

          {/* 공지 관리 */}
          {tab === "notices" && (
            <NoticeManager
              rows={notices}
              onCreate={createNotice}
              onUpdate={updateNotice}
              onDelete={removeNotice}
              onReorder={reorderNotices}
            />
          )}

          {/* 통계 관리 */}
          {tab === "analytics" && <AnalyticsView inquiries={inquiries} />}

          {/* 유입 관리 */}
          {tab === "traffic" && (
            <TrafficView
              pageViews={pageViews}
              loading={pvLoading}
              period={trafficPeriod}
              onPeriodChange={setTrafficPeriod}
            />
          )}

          {/* FAQ 관리 */}
          {tab === "faqs" && (
            <FaqManager
              rows={faqs}
              onCreate={createFaq}
              onUpdate={updateFaq}
              onDelete={removeFaq}
              onReorder={reorderFaqs}
            />
          )}
        </div>
      </main>
    </div>
  );
}
