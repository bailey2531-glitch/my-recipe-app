// 홈 화면. 입력 카드(링크/텍스트/이미지) + "보내기" → 변환 흐름 + 공유받기 자동 채움 + 이번주 장보기 미리보기.
import { sendToConvert } from "../recipeConvert.js";
import { readShareParams, extractSharedUrl, clearShareParams } from "../shareTarget.js";
import { SOURCE_ICONS } from "../icons.js";
import { getAllShoppingItems } from "../db.js";

const INSTAGRAM_TIKTOK_PATTERN = /instagram\.com|tiktok\.com/i;

// "담은 재료: 계란, 대파, 두부 외 2개" 처럼 장보기 목록을 짧게 요약한다.
function summarizeShoppingPreview(items) {
  if (items.length === 0) return "아직 담은 재료가 없어요.";
  const names = items.map((item) => item.name);
  const shown = names.slice(0, 4).join(", ");
  const rest = names.length - 4;
  return `담은 재료: ${shown}${rest > 0 ? ` 외 ${rest}개` : ""}`;
}

export function renderHome(container) {
  container.innerHTML = `
    <section class="card">
      <h1>오늘 본 요리 영상,<br/>레시피로 남겨 두세요</h1>

      <div class="composer">
        <div class="composer-platforms" aria-hidden="true">
          <span class="composer-platform-icon">${SOURCE_ICONS.youtube}</span>
          <span class="composer-platform-icon">${SOURCE_ICONS.instagram}</span>
          <span class="composer-platform-icon">${SOURCE_ICONS.tiktok}</span>
          <span class="composer-platform-icon">${SOURCE_ICONS.web}</span>
        </div>

        <div class="composer-input-area">
          <div id="mode-panel-link" class="input-mode-panel">
            <input id="link-input" class="text-input" type="url" placeholder="링크를 넣어 주세요" />
            <div id="instagram-hint" hidden>
              <p class="muted">인스타는 자동 분석이 어려울 수 있어요. 캡션을 글자로 붙여넣거나, 캡션을 캡처한 사진을 올려주면 더 정확해요(둘 다 넣어도 좋아요).</p>
              <textarea id="caption-input" class="text-input" rows="4" placeholder="캡션(설명글)을 붙여넣으세요"></textarea>
              <label class="field-label" for="caption-image-input">캡션 캡처 이미지(선택)</label>
              <input id="caption-image-input" type="file" accept="image/*" />
              <img id="caption-image-preview" class="image-preview" hidden alt="캡션 캡처 미리보기" />
            </div>
          </div>

          <div id="mode-panel-text" class="input-mode-panel" hidden>
            <textarea id="text-input" class="text-input composer-textarea" placeholder="레시피 글이나 캡션을 붙여넣으세요"></textarea>
          </div>

          <div id="mode-panel-image" class="input-mode-panel" hidden>
            <input id="image-input" type="file" accept="image/*" />
            <img id="image-preview" class="image-preview" hidden alt="선택한 이미지 미리보기" />
          </div>
        </div>

        <div class="composer-actions">
          <button type="button" class="composer-icon-btn active" data-mode="link" aria-label="링크로 입력">${SOURCE_ICONS.link}</button>
          <button type="button" class="composer-icon-btn" data-mode="text" aria-label="텍스트로 입력">${SOURCE_ICONS.text}</button>
          <button type="button" class="composer-icon-btn" data-mode="image" aria-label="이미지로 입력">${SOURCE_ICONS.image}</button>
          <button type="button" class="composer-icon-btn" id="mic-btn" aria-label="음성으로 입력(준비 중)" title="음성 입력은 아직 준비 중이에요" disabled>${SOURCE_ICONS.mic}</button>
          <button type="button" class="composer-send-btn" id="send-btn" aria-label="보내기">${SOURCE_ICONS.send}</button>
        </div>
      </div>
      <p id="home-status" class="muted" aria-live="polite"></p>
    </section>

    <p class="see-all-link"><a href="#recipes">저장된 레시피 전체보기 →</a></p>

    <section class="card shopping-preview-card">
      <div class="shopping-preview-header">
        <h2>이번주 장보기</h2>
        <a href="#shopping">장보기 목록 →</a>
      </div>
      <p id="shopping-preview-text" class="muted">불러오는 중...</p>
    </section>
  `;

  const modeButtons = container.querySelectorAll(".composer-icon-btn[data-mode]");
  const panels = {
    link: container.querySelector("#mode-panel-link"),
    text: container.querySelector("#mode-panel-text"),
    image: container.querySelector("#mode-panel-image"),
  };

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      Object.entries(panels).forEach(([mode, panel]) => {
        panel.hidden = mode !== btn.dataset.mode;
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

  const captionImageInput = container.querySelector("#caption-image-input");
  const captionImagePreview = container.querySelector("#caption-image-preview");
  captionImageInput.addEventListener("change", () => {
    const file = captionImageInput.files?.[0];
    if (!file) {
      captionImagePreview.hidden = true;
      return;
    }
    captionImagePreview.src = URL.createObjectURL(file);
    captionImagePreview.hidden = false;
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
    captionImageInput.value = "";
    captionImagePreview.hidden = true;
  }

  // 유튜브·인스타 앱의 "공유"에서 이 앱으로 들어온 경우, 링크를 자동으로 채운다.
  // 실수로 바로 전송되지 않게, 입력칸만 채우고 "보내기"는 사용자가 직접 누르게 한다.
  const sharedParams = readShareParams();
  if (sharedParams) {
    const sharedUrl = extractSharedUrl(sharedParams);
    if (sharedUrl) {
      linkInput.value = sharedUrl;
      instagramHint.hidden = !INSTAGRAM_TIKTOK_PATTERN.test(sharedUrl);
      status.textContent = "공유받은 링크를 넣었어요. 확인하고 보내기를 눌러주세요.";
    }
    clearShareParams();
  }

  sendBtn.addEventListener("click", async () => {
    const activeMode = container.querySelector(".composer-icon-btn.active").dataset.mode;
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
          captionImageFile: captionImageInput.files?.[0],
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

  getAllShoppingItems().then((items) => {
    container.querySelector("#shopping-preview-text").textContent = summarizeShoppingPreview(items);
  });
}
