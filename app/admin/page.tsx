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
} from "lucide-react";
import Link from "next/link";

// 관리자 비밀번호는 서버 환경변수(ADMIN_PASSWORD)에서만 검증 — 클라이언트 노출 없음

type Status = "pending" | "in_progress" | "done";
type Tab = "overview" | "inquiries" | "notices" | "faqs";
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

const FILTERS: Filter[] = ["전체", "대기", "진행중", "완료"];
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "전체 현황" },
  { key: "inquiries", label: "상담 문의" },
  { key: "notices", label: "공지 관리" },
  { key: "faqs", label: "FAQ 관리" },
];

// 문의 목록/필터가 없는 탭 (콘텐츠 관리 탭)
const CONTENT_TABS: Tab[] = ["notices", "faqs"];

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
  title,
  rows,
  onStatusChange,
  onDelete,
  onExport,
  onSeeAll,
}: {
  title?: string;
  rows: Inquiry[];
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onSeeAll?: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const colSpan = 7;

  return (
    <section>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {title && (
            <h2
              className="title-3 emphasized"
              style={{ color: "var(--text)", margin: 0 }}
            >
              {title}
            </h2>
          )}
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="semibold"
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
                whiteSpace: "nowrap",
                marginLeft: "auto",
                fontSize: "0.875rem",
              }}
            >
              전체 보기 →
            </button>
          )}
        </div>
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
              {["접수일", "이름", "연락처", "문의 내용", "상태", "관리", ""].map(
                (h, i) => (
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
                ),
              )}
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
type Draft = { id: string | null; title: string; body: string; pinned: boolean };
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
        <p className="subhead" style={{ margin: 0, color: "var(--text-muted)" }}>
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
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
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
                  canDown={i < rows.length - 1 && rows[i + 1].pinned === n.pinned}
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
        <p className="subhead" style={{ margin: 0, color: "var(--text-muted)" }}>
          사이트 FAQ 섹션에 아래 순서(등록 순)대로 노출됩니다. 비공개 항목은
          사이트에 보이지 않습니다.
        </p>
        <button
          onClick={open && !editing ? close : () => { setDraft(EMPTY_FAQ); setOpen(true); }}
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

// ── 관리자 페이지 ──────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false); // 인증 확인 완료 여부(로그인창 깜빡임 방지)
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [filter, setFilter] = useState<Filter>("전체");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
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

  const Brand = ({ size = "1.125rem" }: { size?: string }) => (
    <span
      className="emphasized"
      style={{ color: "var(--text)", fontSize: size, letterSpacing: "-0.01em" }}
    >
      특장맨
    </span>
  );

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
            onClick={() => setTab("overview")}
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
            title="전체 현황으로"
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
                color: tab === t.key ? "var(--accent-fg)" : "var(--text-secondary)",
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
            onClick={() => setTab("overview")}
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
                setTab("overview");
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
                color: tab === t.key ? "var(--accent-fg)" : "var(--text-secondary)",
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
            <div style={{ display: "grid", gap: "1rem" }} className="stat-grid-2">
              {tab === "faqs" ? (
                <>
                  <StatCard label="전체 질문" value={faqs.length} color="blue" />
                  <StatCard label="공개중 질문" value={publishedF} color="green" />
                </>
              ) : tab === "notices" ? (
                <>
                  <StatCard label="전체 공지" value={notices.length} color="blue" />
                  <StatCard label="게시중 공지" value={publishedN} color="green" />
                </>
              ) : tab === "inquiries" ? (
                <>
                  <StatCard
                    label="전체 문의"
                    value={inquiries.length}
                    color="blue"
                  />
                  <StatCard label="대기중 문의" value={pendingI} color="green" />
                </>
              ) : (
                /* 전체 현황: 문의 + 실제 사이트에 나가 있는 콘텐츠 수 */
                <>
                  <StatCard
                    label="전체 문의"
                    value={inquiries.length}
                    color="blue"
                  />
                  <StatCard label="대기중 문의" value={pendingI} color="green" />
                  <StatCard label="게시중 공지" value={publishedN} color="blue" />
                  <StatCard label="공개중 질문" value={publishedF} color="green" />
                </>
              )}
            </div>
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
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        background: filter === f ? "var(--accent)" : "transparent",
                        color: filter === f ? "var(--accent-fg)" : "var(--text-secondary)",
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
              title={tab === "overview" ? "상담 문의" : undefined}
              rows={filteredI}
              onStatusChange={updateInquiry}
              onDelete={removeInquiry}
              onExport={() => window.open("/api/export", "_blank")}
              onSeeAll={tab === "overview" ? () => setTab("inquiries") : undefined}
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