// 사용자가 입력했거나 AI가 만든 문자열을 안전하게 HTML에 넣기 위해 이스케이프한다.
export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
