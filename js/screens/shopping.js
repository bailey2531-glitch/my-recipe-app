// 장보기 "목록" 탭. SPEC.md 2-11. "온라인 장보기" 탭은 2차 작업.
import { getAllShoppingItems, updateShoppingItem } from "../db.js";
import { addManualItem, deleteCheckedItems, summarizeAmounts } from "../shoppingCart.js";
import { escapeHtml } from "../htmlUtil.js";
import { INGREDIENT_CATEGORIES } from "../ingredientCategories.js";

// 같은 재료를 여러 레시피에서 담았으면, 레시피별로 하나씩(중복 없이) 이름을 돌려준다.
function uniqueRecipeSources(sources) {
  const map = new Map();
  for (const s of sources) {
    if (s.recipeId && s.recipeTitle) map.set(s.recipeId, s.recipeTitle);
  }
  return [...map.entries()];
}

function itemRowHtml(item) {
  const amountText = summarizeAmounts(item.sources);
  const recipeSources = uniqueRecipeSources(item.sources);
  const recipeLinksHtml = recipeSources
    .map(([recipeId, title]) => `<a href="#recipe/${recipeId}" class="shopping-item-recipe-link">↳ ${escapeHtml(title)}</a>`)
    .join("");

  return `
    <li class="shopping-item-row">
      <input type="checkbox" class="shopping-checkbox" data-id="${item.id}" ${item.checked ? "checked" : ""} />
      <div class="shopping-item-body ${item.checked ? "checked" : ""}">
        <div class="shopping-item-main">
          ${
            recipeLinksHtml
              ? `<button type="button" class="shopping-item-name">${escapeHtml(item.name)}</button>`
              : `<span class="shopping-item-name">${escapeHtml(item.name)}</span>`
          }
          <span class="muted">${escapeHtml(amountText)}</span>
        </div>
        ${recipeLinksHtml ? `<div class="shopping-item-recipes" hidden>${recipeLinksHtml}</div>` : ""}
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

  container.innerHTML = `
    <h1>장보기</h1>

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

  // 체크·삭제 등으로 다시 그릴 때 보던 위치가 맨 위로 튀지 않게 스크롤을 되돌린다.
  function refresh() {
    const scrollY = window.scrollY;
    renderShopping(container).then(() => {
      window.scrollTo(0, scrollY);
    });
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

  // 재료 이름을 누르면, 어느 레시피에서 담은 재료인지 아래에 펼쳐서 보여준다.
  container.querySelectorAll(".shopping-item-name").forEach((btn) => {
    btn.addEventListener("click", () => {
      const recipesEl = btn.closest(".shopping-item-body")?.querySelector(".shopping-item-recipes");
      if (recipesEl) recipesEl.hidden = !recipesEl.hidden;
    });
  });

  container.querySelectorAll(".shopping-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      await updateShoppingItem(checkbox.dataset.id, { checked: checkbox.checked });
      refresh();
    });
  });
}
