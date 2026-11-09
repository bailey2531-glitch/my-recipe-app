// 레시피 상세 화면. SPEC.md 2-5·2-6: 요약 카드, 원본 영역(유튜브 임베드), 재료, 도구,
// 조리 순서, 팁 박스, "해먹었어요" 기록. 저장/편집/공유/장바구니 담기는 각자 담당 작업에서 연결한다.
import { getRecipe, getPhoto } from "../db.js";
import { escapeHtml } from "../htmlUtil.js";
import { PLATFORM_LABEL } from "../platformLabel.js";
import { createYoutubePlayer, seekTo } from "../youtubePlayer.js";
import { flowerIcon } from "../icons.js";
import { resizeImage } from "../imageResize.js";
import { addCookRecord, updateCookRecord, deleteCookRecord } from "../cookLog.js";
import { shareRecipeLink } from "../shareLink.js";
import { addIngredientToCart, addAllIngredientsToCart, getCartedIngredientNames, getCartCount } from "../shoppingCart.js";

function extractYoutubeVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) return shortsMatch[1];
    return null;
  } catch {
    return null;
  }
}

function formatTimestamp(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// 단계 설명 안에서 도구 이름(highlights)만 파란 글씨로 강조한다.
function highlightText(text, highlights) {
  let escaped = escapeHtml(text);
  (highlights || []).forEach((word) => {
    const escapedWord = escapeHtml(word);
    if (!escapedWord) return;
    escaped = escaped.split(escapedWord).join(`<span class="tool-highlight">${escapedWord}</span>`);
  });
  return escaped;
}

function ingredientChipsHtml(ingredientIds, ingredientsById) {
  const chips = (ingredientIds || [])
    .map((id) => ingredientsById.get(id))
    .filter(Boolean)
    .map((ing) => `<span class="ingredient-chip">${escapeHtml(ing.name)}</span>`)
    .join("");
  return chips ? `<div class="step-chips">${chips}</div>` : "";
}

function stepHtml(step, ingredientsById, showTimestamp) {
  const tipHtml = step.tip ? `<div class="tip-box">${escapeHtml(step.tip)}</div>` : "";
  const timestampBtn =
    showTimestamp && step.timestampSec != null
      ? `<button type="button" class="timestamp-btn" data-sec="${step.timestampSec}">▶ ${formatTimestamp(step.timestampSec)}</button>`
      : "";
  return `
    <li class="step-item">
      <div class="step-text-row">
        <p class="step-text">${highlightText(step.text, step.highlights)}</p>
        ${timestampBtn}
      </div>
      ${ingredientChipsHtml(step.ingredientIds, ingredientsById)}
      ${tipHtml}
    </li>
  `;
}

function stepGroupHtml(group, index, ingredientsById, showTimestamp) {
  return `
    <div class="step-group">
      <h3 class="step-group-title">${index + 1}단계 · ${escapeHtml(group.title)}</h3>
      <ol class="step-list">
        ${(group.steps || []).map((s) => stepHtml(s, ingredientsById, showTimestamp)).join("")}
      </ol>
    </div>
  `;
}

// 유튜브면 영상을 바로 재생할 수 있게 임베드 자리를 만들고,
// 그 외(인스타·틱톡·웹)는 썸네일 + "원본 보기" 링크만 보여준다(새 창으로 열기).
function sourceSectionHtml(recipe, youtubeVideoId) {
  const { platform, url, thumbnail } = recipe.source || {};

  if (platform === "youtube" && youtubeVideoId) {
    return `<div class="yt-embed-wrap"><div id="yt-player"></div></div>`;
  }

  if (!url) return "";

  return `
    <div class="source-fallback">
      ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" class="source-thumb" alt="원본 썸네일" />` : `<div class="source-thumb placeholder"></div>`}
      <a class="btn-ghost source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">원본 보기 ↗</a>
    </div>
  `;
}

function formatCookDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function cookCardHtml(cook, photoUrl) {
  const flowers = [1, 2, 3].map((n) => flowerIcon(n <= cook.rating, 18)).join("");
  return `
    <div class="cook-card" data-id="${cook.id}">
      <div class="cook-card-header">
        <div class="cook-card-flowers">${flowers}</div>
        <span class="muted">${formatCookDate(cook.date)}</span>
      </div>
      ${cook.comment ? `<p class="cook-card-comment">${escapeHtml(cook.comment)}</p>` : ""}
      ${photoUrl ? `<img src="${photoUrl}" class="cook-card-photo" alt="요리 사진" />` : ""}
      <div class="cook-card-actions">
        <button type="button" class="cook-edit-btn" data-id="${cook.id}">수정</button>
        <button type="button" class="cook-delete-btn" data-id="${cook.id}">삭제</button>
      </div>
    </div>
  `;
}

// "나의 요리 기록" 카드 목록(재료 위에 놓인다). 최신순으로 보여준다.
function cookSectionHtml(cooks, photoUrls) {
  if (!cooks.length) return "";
  const sorted = [...cooks].sort((a, b) => b.date.localeCompare(a.date));
  return `
    <section class="card">
      <h2>나의 요리 기록</h2>
      ${sorted.map((c) => cookCardHtml(c, photoUrls.get(c.id))).join("")}
    </section>
  `;
}

// "해먹었어요" 바텀시트를 열고, 저장되면 onSaved()를 호출한다.
// existing이 있으면 그 기록을 수정하는 모드로 연다.
function openCookSheet({ recipeId, existing, existingPhotoUrl, onSaved }) {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = `
    <div class="bottom-sheet">
      <div class="sheet-header">
        <h2>이 레시피, 해먹어보니 어땠나요?</h2>
        <button type="button" class="sheet-close" id="sheet-close-btn">✕</button>
      </div>

      <div class="flower-rating" id="flower-rating">
        ${[1, 2, 3].map((n) => `<button type="button" class="flower-btn" data-value="${n}">${flowerIcon(false, 36)}</button>`).join("")}
      </div>

      <label class="field-label" for="cook-comment">나만의 코멘트</label>
      <textarea id="cook-comment" class="text-input" rows="3" placeholder="어땠는지 적어보세요">${escapeHtml(existing?.comment || "")}</textarea>

      <label class="field-label">사진 추가</label>
      <input type="file" id="cook-photo-input" accept="image/*" />
      <img id="cook-photo-preview" class="image-preview" ${existingPhotoUrl ? `src="${existingPhotoUrl}"` : "hidden"} />
      <button type="button" class="btn-ghost" id="cook-photo-remove" ${existingPhotoUrl ? "" : "hidden"}>사진 빼기</button>

      <button type="button" class="btn-primary" id="cook-save-btn" disabled>저장하기</button>
      <p id="cook-sheet-status" class="muted" aria-live="polite"></p>
    </div>
  `;
  document.body.appendChild(backdrop);

  let rating = existing?.rating || 0;
  let photoBlob = null; // 새로 고른 사진(리사이즈됨)
  let removePhoto = false;

  const flowerBtns = backdrop.querySelectorAll(".flower-btn");
  const saveBtn = backdrop.querySelector("#cook-save-btn");
  const statusEl = backdrop.querySelector("#cook-sheet-status");
  const photoInput = backdrop.querySelector("#cook-photo-input");
  const photoPreview = backdrop.querySelector("#cook-photo-preview");
  const photoRemoveBtn = backdrop.querySelector("#cook-photo-remove");

  function renderFlowers() {
    flowerBtns.forEach((btn, i) => {
      btn.innerHTML = flowerIcon(i < rating, 36);
    });
    saveBtn.disabled = rating < 1;
  }
  renderFlowers();

  flowerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      rating = Number(btn.dataset.value);
      renderFlowers();
    });
  });

  function close() {
    backdrop.remove();
  }

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelector("#sheet-close-btn").addEventListener("click", close);

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    try {
      photoBlob = await resizeImage(file);
      removePhoto = false;
      photoPreview.src = URL.createObjectURL(photoBlob);
      photoPreview.hidden = false;
      photoRemoveBtn.hidden = false;
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });

  photoRemoveBtn.addEventListener("click", () => {
    photoBlob = null;
    removePhoto = true;
    photoInput.value = "";
    photoPreview.hidden = true;
    photoRemoveBtn.hidden = true;
  });

  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    statusEl.textContent = "저장하는 중...";
    try {
      const comment = backdrop.querySelector("#cook-comment").value.trim();
      if (existing) {
        await updateCookRecord(recipeId, existing.id, { rating, comment, photoBlob, removePhoto });
      } else {
        await addCookRecord(recipeId, { rating, comment, photoBlob });
      }
      close();
      onSaved();
    } catch (err) {
      statusEl.textContent = err.message;
      saveBtn.disabled = false;
    }
  });
}

function notFoundHtml() {
  return `
    <div class="detail-header">
      <button type="button" class="back-btn" id="back-btn">← 목록으로</button>
    </div>
    <section class="card">
      <p class="muted">레시피를 찾을 수 없어요. 삭제됐을 수 있어요.</p>
    </section>
  `;
}

export async function renderRecipeDetail(container, id) {
  // container(#app)는 화면이 바뀔 때마다 재사용되므로, container에 직접 건
  // 이벤트 리스너는 다시 그릴 때마다 지워야 한다(안 지우면 클릭할 때마다 중복 실행됨).
  container._cleanupListeners?.();
  const controller = new AbortController();
  container._cleanupListeners = () => controller.abort();
  const { signal } = controller;

  container.innerHTML = `<section class="card"><p class="muted">불러오는 중...</p></section>`;

  const recipe = id ? await getRecipe(id) : null;
  if (!recipe) {
    container.innerHTML = notFoundHtml();
    container.querySelector("#back-btn").addEventListener("click", () => {
      location.hash = "#recipes";
    });
    return;
  }

  const ingredientsById = new Map((recipe.ingredients || []).map((ing) => [ing.id, ing]));
  const platform = PLATFORM_LABEL[recipe.source?.platform] || "";
  const nutrition = recipe.nutrition;
  const isYoutube = recipe.source?.platform === "youtube";
  const youtubeVideoId = isYoutube ? extractYoutubeVideoId(recipe.source.url) : null;

  const cooks = recipe.cooks || [];
  const photoUrls = new Map();
  for (const cook of cooks) {
    if (!cook.photoBlobId) continue;
    const photo = await getPhoto(cook.photoBlobId);
    if (photo?.blob) photoUrls.set(cook.id, URL.createObjectURL(photo.blob));
  }

  const cookBtnLabel = cooks.length > 0 ? `✓ ${cooks.length}번 해먹었어요` : "해먹었어요";
  const cookBtnClass = cooks.length > 0 ? "btn-ghost cooked" : "btn-ghost";

  const cartedNames = await getCartedIngredientNames(id);
  const cartCount = await getCartCount();
  const allIngredientsCarted =
    (recipe.ingredients || []).length > 0 && (recipe.ingredients || []).every((ing) => cartedNames.has(ing.name.trim().toLowerCase()));

  container.innerHTML = `
    <div class="detail-header">
      <button type="button" class="back-btn" id="back-btn">←</button>
      <a class="cart-icon-wrap" href="#shopping" title="장보기 목록 보기">
        🧺
        ${cartCount > 0 ? `<span class="cart-badge">${cartCount}</span>` : ""}
      </a>
    </div>

    <section class="card">
      ${sourceSectionHtml(recipe, youtubeVideoId)}

      <h1>${escapeHtml(recipe.title)}</h1>
      <p class="muted">${platform}${recipe.source?.creator ? " · " + escapeHtml(recipe.source.creator) : ""}</p>

      <div class="summary-row">
        ${recipe.timeMinutes ? `<span class="summary-chip">⏱ ${recipe.timeMinutes}분</span>` : ""}
        ${recipe.servings ? `<span class="summary-chip">🍽 ${recipe.servings}인분</span>` : ""}
        ${nutrition?.kcal != null ? `<span class="summary-chip">🔥 ${nutrition.kcal}kcal</span>` : ""}
      </div>
      ${nutrition?.kcal != null ? `<p class="muted small">AI가 추정한 값이라 실제와 다를 수 있어요.</p>` : ""}

      ${(recipe.tags || []).length ? `<div class="tag-row">${recipe.tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}</div>` : ""}

      ${recipe.summary ? `<p class="summary-text">${escapeHtml(recipe.summary)}</p>` : ""}

      <div class="action-row">
        <button type="button" class="btn-ghost" disabled title="다음 작업에서 연결됩니다">저장</button>
        <button type="button" class="${cookBtnClass}" id="cook-btn">${cookBtnLabel}</button>
        <button type="button" class="btn-ghost" disabled title="다음 작업에서 연결됩니다">편집</button>
        ${
          recipe.source?.url
            ? `<button type="button" class="btn-ghost" id="share-btn">공유</button>`
            : `<button type="button" class="btn-ghost" disabled title="원본 링크가 없는 레시피예요">공유</button>`
        }
      </div>
    </section>

    ${cookSectionHtml(cooks, photoUrls)}

    <section class="card">
      <div class="ingredient-header">
        <h2>재료</h2>
        ${
          (recipe.ingredients || []).length
            ? `<button type="button" class="btn-ghost" id="cart-add-all-btn" ${allIngredientsCarted ? "disabled" : ""}>${allIngredientsCarted ? "✓ 모두 담음" : "전체 담기"}</button>`
            : ""
        }
      </div>
      <ul class="ingredient-list">
        ${(recipe.ingredients || [])
          .map((ing) => {
            const carted = cartedNames.has(ing.name.trim().toLowerCase());
            return `
          <li class="ingredient-row">
            <span>${escapeHtml(ing.name)}</span>
            <span class="muted">${escapeHtml(ing.amount)}${ing.unit ? " " + escapeHtml(ing.unit) : ""}</span>
            <button type="button" class="cart-add-btn ${carted ? "added" : ""}" data-name="${escapeHtml(ing.name)}" ${carted ? "disabled" : ""}>${carted ? "✓" : "+"}</button>
          </li>`;
          })
          .join("")}
      </ul>
      ${(recipe.tools || []).length ? `<p class="muted">도구 · ${recipe.tools.length}개 (${recipe.tools.map((t) => escapeHtml(t.name)).join(", ")})</p>` : ""}
    </section>

    <section class="card">
      <h2>조리 순서</h2>
      ${(recipe.stepGroups || []).map((g, i) => stepGroupHtml(g, i, ingredientsById, Boolean(youtubeVideoId))).join("")}
    </section>

    ${
      nutrition
        ? `
    <section class="card">
      <h2>1인분 영양 성분</h2>
      <div class="nutrition-row">
        <div><strong>${nutrition.kcal ?? "-"}</strong><span class="muted">kcal</span></div>
        <div><strong>${nutrition.protein ?? "-"}</strong><span class="muted">단백질(g)</span></div>
        <div><strong>${nutrition.carbs ?? "-"}</strong><span class="muted">탄수화물(g)</span></div>
        <div><strong>${nutrition.fat ?? "-"}</strong><span class="muted">지방(g)</span></div>
      </div>
      <p class="muted small">AI가 추정한 값이라 실제와 다를 수 있어요.</p>
    </section>`
        : ""
    }
  `;

  container.querySelector("#back-btn").addEventListener("click", () => {
    location.hash = "#recipes";
  });

  if (youtubeVideoId) {
    let player = null;
    createYoutubePlayer("yt-player", youtubeVideoId).then((p) => {
      player = p;
    });

    container.addEventListener(
      "click",
      (event) => {
        const btn = event.target.closest(".timestamp-btn");
        if (btn) {
          seekTo(player, Number(btn.dataset.sec));
        }
      },
      { signal }
    );
  }

  function refresh() {
    renderRecipeDetail(container, id);
  }

  container.querySelector("#cook-btn").addEventListener("click", () => {
    openCookSheet({ recipeId: id, onSaved: refresh });
  });

  const shareBtn = container.querySelector("#share-btn");
  shareBtn?.addEventListener("click", () => {
    shareRecipeLink({ title: recipe.title, url: recipe.source.url });
  });

  container.querySelector("#cart-add-all-btn")?.addEventListener("click", async () => {
    await addAllIngredientsToCart(recipe.ingredients || [], id, recipe.title);
    refresh();
  });

  container.querySelectorAll(".cart-add-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ingredient = (recipe.ingredients || []).find((ing) => ing.name === btn.dataset.name);
      if (!ingredient) return;
      await addIngredientToCart(ingredient, id, recipe.title);
      refresh();
    });
  });

  container.addEventListener(
    "click",
    async (event) => {
      const editBtn = event.target.closest(".cook-edit-btn");
      const deleteBtn = event.target.closest(".cook-delete-btn");

      if (editBtn) {
        const cookId = editBtn.dataset.id;
        const existing = cooks.find((c) => c.id === cookId);
        if (!existing) return;
        openCookSheet({ recipeId: id, existing, existingPhotoUrl: photoUrls.get(cookId), onSaved: refresh });
      }

      if (deleteBtn) {
        const cookId = deleteBtn.dataset.id;
        if (window.confirm("이 기록을 삭제할까요?")) {
          await deleteCookRecord(id, cookId);
          refresh();
        }
      }
    },
    { signal }
  );
}
