// 공유 버튼: SPEC.md 2-8. 원본 링크를 폰 기본 공유창으로 보내고,
// 지원하지 않는 환경(PC 등)이면 링크 복사 시트를 보여준다.
import { escapeHtml } from "./htmlUtil.js";

export async function shareRecipeLink({ title, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // 사용자가 공유를 취소한 것뿐이라 조용히 끝낸다
      // 공유창을 열다가 실패하면 복사 시트로 대신 보여준다
    }
  }
  openCopySheet(url);
}

function openCopySheet(url) {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = `
    <div class="bottom-sheet">
      <div class="sheet-header">
        <h2>링크 공유</h2>
        <button type="button" class="sheet-close" id="share-close-btn">✕</button>
      </div>
      <p class="muted">이 화면은 공유창을 지원하지 않아요. 링크를 복사해서 전달하세요.</p>
      <div class="share-link-row">
        <input type="text" class="text-input" id="share-link-input" value="${escapeHtml(url)}" readonly />
        <button type="button" class="btn-primary" id="share-copy-btn">복사하기</button>
      </div>
      <p id="share-status" class="muted" aria-live="polite"></p>
    </div>
  `;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelector("#share-close-btn").addEventListener("click", close);

  const linkInput = backdrop.querySelector("#share-link-input");
  const status = backdrop.querySelector("#share-status");

  backdrop.querySelector("#share-copy-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "복사했어요.";
    } catch {
      linkInput.select();
      status.textContent = "자동 복사가 안 돼서 링크를 선택해 뒀어요. 길게 눌러 복사하세요.";
    }
  });
}
