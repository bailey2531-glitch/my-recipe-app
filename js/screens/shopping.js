// 장보기 "목록" 탭. SPEC.md 2-11. "온라인 장보기" 탭은 2차 작업.
import { getRecipe, getAllShoppingItems, updateShoppingItem } from "../db.js";
import {
  getCartedRecipeIds,
  removeRecipeFromCart,
  addManualItem,
  deleteCheckedItems,
  summarizeAmounts,
} from "../shoppingCart.js";
import { escapeHtml } from "../htmlUtil.js";
import { INGREDIENT_CATEGORIES } from "../ingredientCategories.js";

function cartedRecipeCardHtml(recipeId, fallbackTitle, recipe) {
  return `
    <div class="carted-recipe-card">
      <div class="carted-recipe-thumb"></div>
      <div class="carted-recipe-info">
        <p class="carted-recipe-title">${escapeHtml(recipe?.title || fallbackTitle)}</p>
        ${recipe?.servings ? `<p class="muted small">${recipe.servings}인분</p>` : ""}
      </div>
      <button type="button" class="carted-recipe-remove" data-recipe-id="${recipeId}" title="이 레시피에서 담은 재료 빼기">✕</button>
    </div>
  `;
}

function itemRowHtml(item) {
  const amountText = summarizeAmounts(item.sources);
  const recipeNames = [...new Set(item.sources.filter((s) => s.recipeTitle).map((s) => s.recipeTitle))];
  return `
    <li class="shopping-item-row">
      <input type="checkbox" class="shopping-checkbox" data-id="${item.id}" ${item.checked ? "checked" : ""} />
      <div class="shopping-item-body ${item.checked ? "checked" : ""}">
        <div class="shopping-item-main">
          <span class="shopping-item-name">${escapeHtml(item.name)}</span>
          <span class="muted">${escapeHtml(amountText)}</span>
        </div>
        ${recipeNames.length ? `<p class="muted small">${recipeNames.map(escapeHtml).join(", ")}</p>` : ""}
      </div>
    </li>
  `;
}

function categoryGroupsHtml(items) {
  const byCategory = new Map(INGREDIENT_CATEGORIES.map((c) => [c, []]));
  for (const item of items) {
    const category = INGREDIENT_CATEGORIES.includes(item.category) ? item.category : "기타";
    byCategory.get(category).push(item);
  }

  return INGREDIENT_CATEGORIES.map((category) => {
    const group = byCategory.get(category);
    if (!group.length) return "";
    return `
      <section class="card category-group">
        <h3>${category}</h3>
        <ul class="shopping-item-list">
          ${group.map(itemRowHtml).join("")}
        </ul>
      </section>
    `;
  }).join("");
}

export async function renderShopping(container) {
  container.innerHTML = `<section class="card"><p class="muted">불러오는 중...</p></section>`;

  const items = await getAllShoppingItems();
  const cartedRecipeIds = await getCartedRecipeIds();
  const recipesById = new Map();
  for (const recipeId of cartedRecipeIds.keys()) {
    recipesById.set(recipeId, await getRecipe(recipeId));
  }

  const recipeCardsHtml = [...cartedRecipeIds.entries()]
    .map(([recipeId, title]) => cartedRecipeCardHtml(recipeId, title, recipesById.get(recipeId)))
    .join("");

  container.innerHTML = `
    <h1>장보기</h1>

    ${
      cartedRecipeIds.size
        ? `
    <section class="card">
      <h2>담은 레시피 ${cartedRecipeIds.size}</h2>
      <div class="carted-recipe-row">${recipeCardsHtml}</div>
    </section>`
        : ""
    }

    <section class="card">
      <div class="shopping-actions-row">
        <button type="button" class="btn-ghost" id="add-manual-btn">+ 새로 추가</button>
        <button type="button" class="btn-ghost" id="delete-checked-btn">체크 모두 삭제</button>
      </div>
      <div id="manual-add-form" class="manual-add-form" hidden>
        <input type="text" id="manual-name" class="text-input" placeholder="재료 이름" />
        <input type="text" id="manual-amount" class="text-input" placeholder="분량(예: 2개, 약간)" />
        <select id="manual-category" class="text-input">
          ${INGREDIENT_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <button type="button" class="btn-primary" id="manual-save-btn">추가</button>
      </div>
    </section>

    ${items.length ? categoryGroupsHtml(items) : `<p class="muted">담은 재료가 없어요. 레시피 화면에서 재료를 담아보세요.</p>`}
  `;

  function refresh() {
    renderShopping(container);
  }

  const addManualBtn = container.querySelector("#add-manual-btn");
  const manualForm = container.querySelector("#manual-add-form");
  addManualBtn.addEventListener("click", () => {
    manualForm.hidden = !manualForm.hidden;
  });

  container.querySelector("#manual-save-btn").addEventListener("click", async () => {
    const name = container.querySelector("#manual-name").value.trim();
    const amount = container.querySelector("#manual-amount").value.trim() || "적당량";
    const category = container.querySelector("#manual-category").value;
    if (!name) return;
    await addManualItem({ name, amount, category });
    refresh();
  });

  container.querySelector("#delete-checked-btn").addEventListener("click", async () => {
    if (window.confirm("체크한 재료를 모두 지울까요?")) {
      await deleteCheckedItems();
      refresh();
    }
  });

  container.querySelectorAll(".carted-recipe-remove").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (window.confirm("이 레시피에서 담은 재료를 뺄까요?")) {
        await removeRecipeFromCart(btn.dataset.recipeId);
        refresh();
      }
    });
  });

  container.querySelectorAll(".shopping-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      await updateShoppingItem(checkbox.dataset.id, { checked: checkbox.checked });
      refresh();
    });
  });
}
