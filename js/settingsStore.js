// 설정 값을 폰 브라우저 localStorage에만 저장/불러온다.
// CLAUDE.md 규칙: API 키는 여기 외에 코드·커밋·로그 어디에도 들어가면 안 된다.
const STORAGE_KEYS = {
  geminiKey: "myrecipe:geminiKey",
};

export function getGeminiKey() {
  return localStorage.getItem(STORAGE_KEYS.geminiKey) || "";
}

export function setGeminiKey(value) {
  const trimmed = (value || "").trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEYS.geminiKey, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEYS.geminiKey);
  }
}
