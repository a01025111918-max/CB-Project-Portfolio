// 이미지 경로를 통일해서 처리하는 공용 유틸 파일임.
// 로컬 정적 경로는 더 이상 백엔드로 직접 요청하지 않고,
// 가능하면 Firebase URL로 변환해서 쓰도록 설계함.
const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";
const FIREBASE_BUCKET =
  import.meta.env.VITE_FIREBASE_BUCKET ||
  "semiproject-carbon.firebasestorage.app";

export const isAbsoluteUrl = (url) => {
  return typeof url === "string" && /^(https?:)?\/\//i.test(url.trim());
};

const getFirebaseUrl = (objectPath) => {
  // Firebase Storage에서 직접 접근 가능한 URL을 생성함.
  const encodedObjectName = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodedObjectName}?alt=media`;
};

const getDefaultUrl = (trimmed, defaultPrefix) => {
  // 정규화된 경로에서 앞 슬래시를 제거하고, 가능한 경우 Firebase URL로 바꿔줌.
  // 로컬 legacy 경로들과 Firebase 내부 경로를 모두 수용함.
  const normalized = trimmed.replace(/^\//, "");

  if (normalized.startsWith("upload/semiproject/")) {
    // 이전에 /upload/semiproject/로 저장된 경로는 Firebase 내부 경로로 변환함.
    return getFirebaseUrl(normalized.substring("upload/".length));
  }

  if (normalized.startsWith("upload/")) {
    // /upload/로 시작하는 경로도 Firebase Storage 객체 경로로 변환함.
    return getFirebaseUrl(normalized.substring("upload/".length));
  }

  if (normalized.startsWith("board/editor/")) {
    // /board/editor/ 경로는 Firebase에 저장된 객체 경로로 사용함.
    return getFirebaseUrl(normalized);
  }

  if (normalized.startsWith("campaign/memo/")) {
    // 캠페인 메모 이미지도 Firebase에 저장된 URL을 사용함.
    return getFirebaseUrl(normalized);
  }

  if (normalized.startsWith("member/thumb/")) {
    // 멤버 썸네일도 Firebase 경로로 변환함.
    return getFirebaseUrl(normalized);
  }

  if (normalized.startsWith("notice/")) {
    // 공지사항 이미지 경로는 Firebase로 처리함.
    return getFirebaseUrl(normalized);
  }

  if (normalized.startsWith("qna/")) {
    // QnA 이미지 경로도 Firebase URL로 변환함.
    return getFirebaseUrl(normalized);
  }

  if (trimmed.startsWith("/")) {
    // 앞에 /가 붙은 경로는 백엔드로 프록시 요청함.
    return `${BACKSERVER}${trimmed}`;
  }

  if (normalized.match(/^.+\.(jpg|jpeg|png|gif|bmp)$/i)) {
    // 확장자를 가진 파일명만 들어오면 기본 prefix를 붙여 Firebase URL로 변환함.
    return getFirebaseUrl(`${defaultPrefix}/${normalized}`);
  }

  // 위 조건에 모두 걸리지 않으면 백엔드 경로로 요청함.
  return `${BACKSERVER}/${defaultPrefix}/${normalized}`;
};

export const normalizeImageUrl = (thumb, defaultPrefix = "board/editor") => {
  // thumb 값이 없거나 잘못된 문자열이면 null 반환.
  if (!thumb || typeof thumb !== "string") return null;
  let trimmed = thumb.trim();
  if (!trimmed) return null;
  if (["null", "undefined", "none", "NONE", "NULL"].includes(trimmed))
    return null;

  // Windows 경로 구분자도 모두 슬래시(/)로 통일함.
  trimmed = trimmed.replace(/\\\\/g, "/").replace(/\\/g, "/");

  // 이미 전체 URL이면 그대로 반환.
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  // 윈도 경로 드라이브명이 있으면 제거함.
  const driveMatch = trimmed.match(/^[A-Za-z]:/);
  if (driveMatch) {
    trimmed = trimmed.substring(driveMatch[0].length);
  }
  if (trimmed.startsWith("/")) {
    trimmed = trimmed.substring(1);
  }

  // 가능한 path marker를 찾아서 그 위치부터 경로를 재구성함.
  // 로컬 경로가 남아 있어도 Firebase 내부 경로로 바꿀 수 있도록 함.
  const pathMarkers = [
    "upload/semiproject/",
    "upload/",
    "board/editor/",
    "campaign/memo/",
    "member/thumb/",
    "notice/",
    "qna/",
  ];

  for (const marker of pathMarkers) {
    const idx = trimmed.indexOf(marker);
    if (idx !== -1) {
      trimmed = trimmed.substring(idx);
      break;
    }
  }

  return getDefaultUrl(trimmed, defaultPrefix);
};
