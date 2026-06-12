const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

export const isAbsoluteUrl = (url) => {
  return typeof url === "string" && /^(https?:)?\/\//i.test(url.trim());
};

export const normalizeImageUrl = (thumb, defaultPrefix = "board/editor") => {
  if (!thumb || typeof thumb !== "string") return null;
  let trimmed = thumb.trim();
  if (!trimmed) return null;
  if (["null", "undefined", "none", "NONE", "NULL"].includes(trimmed))
    return null;

  trimmed = trimmed.replace(/\\\\/g, "/").replace(/\\/g, "/");

  // Firebase URL이면 내부 경로만 추출해서 로컬 URL로 변환
  // 예: ...o/board%2Ffiles%2Fuuid.jpg?alt=media → board/files/uuid.jpg
  if (trimmed.includes("firebasestorage.googleapis.com")) {
    const match = trimmed.match(/\/o\/(.+?)\?/);
    if (match) {
      const decoded = decodeURIComponent(match[1]);
      return `${BACKSERVER}/files/${decoded}`;
    }
  }

  // 이미 완전한 URL이면 그대로
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  // 드라이브명 제거 (C:/ 등)
  const driveMatch = trimmed.match(/^[A-Za-z]:/);
  if (driveMatch) trimmed = trimmed.substring(driveMatch[0].length);
  if (trimmed.startsWith("/")) trimmed = trimmed.substring(1);

  // 알려진 경로 마커 찾기
  const pathMarkers = [
    "board/editor/",
    "board/files/",
    "campaign/memo/",
    "member/thumb/",
    "member/",
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

  // 파일명만 있는 경우 (uuid.jpg) → defaultPrefix 붙여서 반환
  if (!trimmed.includes("/")) {
    return `${BACKSERVER}/files/${defaultPrefix}/${trimmed}`;
  }

  return `${BACKSERVER}/files/${trimmed}`;
};

export const getSafeImageUrl = (thumb, defaultPrefix = "board/editor") => {
  if (!thumb) return null;
  let value = thumb;
  if (typeof thumb === "object") {
    value =
      thumb.url ||
      thumb.path ||
      thumb.reviewThumb ||
      thumb.thumbnail ||
      thumb.downloadUrl ||
      thumb.fileUrl ||
      thumb.filePath ||
      null;
  }
  if (typeof value !== "string") return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.substring(1, trimmed.length - 1).trim();
  }
  if (!trimmed) return null;
  return normalizeImageUrl(trimmed, defaultPrefix) || trimmed;
};
