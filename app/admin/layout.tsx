import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "관리자 — 특장카니발 특장맨",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-scope">{children}</div>;
}