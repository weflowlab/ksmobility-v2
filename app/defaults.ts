/* 사이트에 노출되는 공지·FAQ의 표시용 형태와, DB 조회 실패 시의 대체 데이터.
   정상 조회 결과가 빈 배열이면 그대로 빈 상태로 둔다(관리자가 다 지운 경우).
   아래 값은 Supabase 미설정·장애로 조회가 '실패'했을 때만 쓰인다. */

export type NoticeView = {
  id: string;
  date: string;
  title: string;
  body: string;
};

export type FaqView = {
  id: string;
  q: string;
  a: string;
};

export const DEFAULT_NOTICES: NoticeView[] = [
  {
    id: "d1",
    date: "2026.07.10",
    title: "특장 카니발 신규 라인업 상담 예약 안내",
    body: "신규 라인업 상담 예약을 받고 있습니다. 원하시는 사양은 카카오톡 또는 전화로 편하게 문의 주세요.",
  },
  {
    id: "d2",
    date: "2026.06.15",
    title: "여름 시즌 상담 운영 안내",
    body: "여름 시즌 상담 운영 일정 관련 안내입니다. 자세한 내용은 문의 바랍니다.",
  },
  {
    id: "d3",
    date: "2026.05.20",
    title: "5월 상담 예약 관련 공지",
    body: "5월 상담 예약 관련 공지사항입니다. 예약 문의는 연락처로 부탁드립니다.",
  },
];

export const DEFAULT_FAQ: FaqView[] = [
  {
    id: "f1",
    q: "상담은 어떻게 진행되나요?",
    a: "카카오톡 오픈채팅 또는 전화로 편하게 문의 주시면 안내해 드립니다.",
  },
  {
    id: "f2",
    q: "원하는 사양으로 커스텀 되나요?",
    a: "네, 원하시는 사양·예산에 맞춰 상담 후 진행합니다.",
  },
  {
    id: "f3",
    q: "실물은 어디서 볼 수 있나요?",
    a: "인천 남동구 매장 방문, 또는 인스타·유튜브에서 확인하실 수 있습니다.",
  },
];