// 레시피 상세 화면(레이아웃). SPEC.md 2-5: 요약 카드, 재료, 도구, 조리 순서, 팁 박스.
// 원본 영역(유튜브 임베드·타임스탬프)은 11번 작업에서, 저장/해먹었어요/편집/공유 동작은 그 이후 작업에서 연결한다.
import { getRecipe } from "../db.js";
import { escapeHtml } from "../htmlUtil.js";
import { PLATFORM_LABEL } from "../platformLabel.js";

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

function stepHtml(step, ingredientsById) {
  const tipHtml = step.tip ? `<div class="tip-box">${escapeHtml(step.tip)}</div>` : "";
  return `
    <li class="step-item">
      <p class="step-text">${highlightText(step.text, step.highlights)}</p>
      ${ingredientChipsHtml(step.ingredientIds, ingredientsById)}
      ${tipHtml}
    </li>
  `;
}

function stepGroupHtml(group, index, ingredientsById) {
  return `
    <div class="step-group">
      <h3 class="step-group-title">${index + 1}단계 · ${escapeHtml(group.title)}</h3>
      <ol class="step-list">
        ${(group.steps || []).map((s) => stepHtml(s, ingredientsById)).join("")}
      </ol>
    </div>
  `;
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

  container.innerHTML = `
    <div class="detail-header">
      <button type="button" class="back-btn" id="back-btn">←</button>
      <span class="cart-icon" title="장보기 담기는 다음 작업에서 연결됩니다">🧺</span>
    </div>

    <section class="card">
      <p class="muted">원본 보기 영역(영상·타임스탬프)은 다음 작업에서 추가됩니다.</p>

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
        <button type="button" class="btn-ghost" disabled title="다음 작업에서 연결됩니다">해먹었어요</button>
        <button type="button" class="btn-ghost" disabled title="다음 작업에서 연결됩니다">편집</button>
        <button type="button" class="btn-ghost" disabled title="다음 작업에서 연결됩니다">공유</button>
      </div>
    </section>

    <section class="card">
      <h2>재료</h2>
      <ul class="ingredient-list">
        ${(recipe.ingredients || [])
          .map(
            (ing) => `
          <li class="ingredient-row">
            <span>${escapeHtml(ing.name)}</span>
            <span class="muted">${escapeHtml(ing.amount)}${ing.unit ? " " + escapeHtml(ing.unit) : ""}</span>
            <button type="button" class="cart-add-btn" disabled title="다음 작업에서 연결됩니다">+</button>
          </li>`
          )
          .join("")}
      </ul>
      ${(recipe.tools || []).length ? `<p class="muted">도구 · ${recipe.tools.length}개 (${recipe.tools.map((t) => escapeHtml(t.name)).join(", ")})</p>` : ""}
    </section>

    <section class="card">
      <h2>조리 순서</h2>
      ${(recipe.stepGroups || []).map((g, i) => stepGroupHtml(g, i, ingredientsById)).join("")}
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
}
