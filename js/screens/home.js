// 홈 화면. 입력 카드(링크/텍스트/이미지) + "보내기" → 변환 흐름.
import { sendToConvert } from "../recipeConvert.js";

const INSTAGRAM_TIKTOK_PATTERN = /instagram\.com|tiktok\.com/i;

export function renderHome(container) {
  container.innerHTML = `
    <section class="card">
      <h1>오늘 본 요리 영상, 레시피로 남겨 두세요</h1>

      <div class="platform-row">
        <span class="platform-badge">▶️ 유튜브</span>
        <span class="platform-badge">📸 인스타</span>
        <span class="platform-badge">🎵 틱톡</span>
        <span class="platform-badge">🔗 웹</span>
      </div>

      <div class="input-mode-tabs">
        <button type="button" class="mode-tab active" data-mode="link">링크</button>
        <button type="button" class="mode-tab" data-mode="text">텍스트</button>
        <button type="button" class="mode-tab" data-mode="image">이미지</button>
      </div>

      <div id="mode-panel-link" class="input-mode-panel">
        <input id="link-input" class="text-input" type="url" placeholder="유튜브·인스타 링크를 붙여넣으세요" />
        <div id="instagram-hint" hidden>
          <p class="muted">인스타는 자동 분석이 어려울 수 있어요. 캡션을 함께 붙여넣으면 더 정확해요.</p>
          <textarea id="caption-input" class="text-input" rows="4" placeholder="캡션(설명글)을 붙여넣으세요"></textarea>
        </div>
      </div>

      <div id="mode-panel-text" class="input-mode-panel" hidden>
        <textarea id="text-input" class="text-input" rows="6" placeholder="레시피 글이나 캡션을 붙여넣으세요"></textarea>
      </div>

      <div id="mode-panel-image" class="input-mode-panel" hidden>
        <input id="image-input" type="file" accept="image/*" />
        <img id="image-preview" class="image-preview" hidden alt="선택한 이미지 미리보기" />
      </div>

      <button id="send-btn" type="button" class="btn-primary">보내기 ↑</button>
      <p id="home-status" class="muted" aria-live="polite"></p>
    </section>

    <p class="see-all-link"><a href="#recipes">저장된 레시피 전체보기 →</a></p>
  `;

  const tabs = container.querySelectorAll(".mode-tab");
  const panels = {
    link: container.querySelector("#mode-panel-link"),
    text: container.querySelector("#mode-panel-text"),
    image: container.querySelector("#mode-panel-image"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      Object.entries(panels).forEach(([mode, panel]) => {
        panel.hidden = mode !== tab.dataset.mode;
      });
    });
  });

  const linkInput = container.querySelector("#link-input");
  const instagramHint = container.querySelector("#instagram-hint");
  linkInput.addEventListener("input", () => {
    instagramHint.hidden = !INSTAGRAM_TIKTOK_PATTERN.test(linkInput.value);
  });

  const imageInput = container.querySelector("#image-input");
  const imagePreview = container.querySelector("#image-preview");
  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) {
      imagePreview.hidden = true;
      return;
    }
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.hidden = false;
  });

  const textInput = container.querySelector("#text-input");
  const captionInput = container.querySelector("#caption-input");
  const sendBtn = container.querySelector("#send-btn");
  const status = container.querySelector("#home-status");

  function clearInputs() {
    linkInput.value = "";
    textInput.value = "";
    captionInput.value = "";
    instagramHint.hidden = true;
    imageInput.value = "";
    imagePreview.hidden = true;
  }

  sendBtn.addEventListener("click", async () => {
    const activeMode = container.querySelector(".mode-tab.active").dataset.mode;
    const hasInput =
      (activeMode === "link" && linkInput.value.trim()) ||
      (activeMode === "text" && textInput.value.trim()) ||
      (activeMode === "image" && imageInput.files?.[0]);

    if (!hasInput) {
      status.textContent = "먼저 링크·글·이미지 중 하나를 입력해 주세요.";
      return;
    }

    sendBtn.disabled = true;
    try {
      const recipe = await sendToConvert(
        {
          mode: activeMode,
          link: linkInput.value,
          caption: captionInput.value,
          text: textInput.value,
          imageFile: imageInput.files?.[0],
        },
        (text) => {
          status.textContent = text;
        }
      );
      status.textContent = `완료: ${recipe.title} (재료 ${recipe.ingredients.length}개, ${recipe.stepGroups.length}단계)`;
      clearInputs();
    } catch (err) {
      status.textContent = err.message;
    } finally {
      sendBtn.disabled = false;
    }
  });
}
