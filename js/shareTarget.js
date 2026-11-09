// 공유받기(Web Share Target)로 들어온 값에서 링크를 뽑아낸다.
// 인스타·유튜브 앱은 링크를 url 대신 text 안에 넣어 보내는 경우가 있다(SPEC.md 2-4).
const URL_PATTERN = /https?:\/\/\S+/;

export function extractSharedUrl({ title, text, url }) {
  if (url && URL_PATTERN.test(url)) {
    return url.match(URL_PATTERN)[0];
  }
  const combined = `${text || ""} ${title || ""}`;
  const match = combined.match(URL_PATTERN);
  return match ? match[0] : "";
}

// 주소의 쿼리스트링(?title=&text=&url=)에서 공유 데이터를 읽는다.
export function readShareParams() {
  const params = new URLSearchParams(location.search);
  if (!params.has("title") && !params.has("text") && !params.has("url")) {
    return null;
  }
  return {
    title: params.get("title") || "",
    text: params.get("text") || "",
    url: params.get("url") || "",
  };
}

// 공유 데이터를 한 번 읽고 나면 주소창에서 쿼리스트링을 지운다(새로고침 시 중복 처리 방지).
export function clearShareParams() {
  history.replaceState(null, "", location.pathname + location.hash);
}
