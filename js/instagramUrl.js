// 인스타그램 게시물 링크를, 인스타그램이 공식 제공하는 끼워넣기(embed) 주소로 바꾼다.
// 크롤링이 아니라 인스타그램 자체 embed 엔드포인트를 쓰는 것이라 공개 게시물에서만 동작한다.
export function extractInstagramEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("instagram.com")) return null;

    const match = u.pathname.match(/^\/(p|reel|reels|tv)\/([^/]+)/);
    if (!match) return null;

    const [, type, shortcode] = match;
    const normalizedType = type === "reels" ? "reel" : type;
    return `https://www.instagram.com/${normalizedType}/${shortcode}/embed/captioned/`;
  } catch {
    return null;
  }
}
