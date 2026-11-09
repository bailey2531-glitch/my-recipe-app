// 저장된 레시피 목록 화면. SPEC.md 2-10: 검색, 필터 칩, 정렬, 상태 표시(생성 대기중/실패).
import { getAllRecipes, deleteRecipe } from "../db.js";
import { retryRecipe } from "../recipeConvert.js";

const PLATFORM_LABEL = {
  youtube: "▶️ 유튜브",
  instagram: "📸 인스타",
  tiktok: "🎵 틱톡",
  web: "🔗 웹",
  text: "📝 텍스트",
  image: "🖼️ 이미지",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function matchesFilters(recipe, { searchText, activeChips }) {
  if (searchText && !recipe.title.toLowerCase().includes(searchText)) {
    return false;
  }
  if (activeChips.has("cooked") && !(recipe.cooks?.length > 0)) {
    return false;
  }
  if (activeChips.has("edited") && !recipe.parentId) {
    return false;
  }
  return true;
}

function sortRecipes(list, sortKey) {
  const sorted = [...list];
  if (sortKey === "oldest") {
    sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (sortKey === "mostCooked") {
    sorted.sort((a, b) => (b.cooks?.length || 0) - (a.cooks?.length || 0));
  } else {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 최신순(기본)
  }
  return sorted;
}

function rowHtml(recipe) {
  const platform = PLATFORM_LABEL[recipe.source?.platform] || "";
  const timeBadge = recipe.timeMinutes ? `<span class="time-badge">${recipe.timeMinutes}분</span>` : "";

  let statusHtml = "";
  if (recipe.status === "pending") {
    statusHtml = `<p class="status-pending">생성 대기 중</p>`;
  } else if (recipe.status === "failed") {
    statusHtml = `<p class="status-failed">실패 · <button type="button" class="retry-btn" data-id="${recipe.id}">다시 시도</button></p>`;
  }

  return `
    <li class="recipe-row" data-id="${recipe.id}">
      <div class="recipe-thumb ${recipe.status === "pending" ? "pulse" : ""}">${timeBadge}</div>
      <div class="recipe-row-body">
        <p class="recipe-row-title">${escapeHtml(recipe.title)}</p>
        <p class="muted recipe-row-sub">${platform}</p>
        ${statusHtml}
      </div>
      <details class="row-menu">
        <summary>⋮</summary>
        <div class="row-menu-list">
          <button type="button" class="delete-btn" data-id="${recipe.id}">삭제</button>
        </div>
      </details>
    </li>
  `;
}

export function renderRecipes(container) {
  container.innerHTML = `
    <section class="card">
      <h1>저장된 레시피</h1>
      <input id="recipe-search" class="text-input" type="search" placeholder="레시피 이름으로 검색" />

      <div class="filter-chip-row">
        <button type="button" class="filter-chip" data-filter="cooked">해먹어본 레시피</button>
        <button type="button" class="filter-chip" data-filter="edited">편집한 레시피</button>
      </div>

      <div class="sort-row">
        <label for="recipe-sort" class="muted">정렬</label>
        <select id="recipe-sort">
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="mostCooked">많이 해먹은 순</option>
        </select>
      </div>

      <ul id="recipe-list" class="recipe-list"></ul>
      <p id="recipe-empty" class="muted" hidden>저장된 레시피가 없어요. 홈 화면에서 링크를 보내보세요.</p>
      <p id="recipe-status" class="muted" aria-live="polite"></p>
    </section>
  `;

  const searchInput = container.querySelector("#recipe-search");
  const sortSelect = container.querySelector("#recipe-sort");
  const chips = container.querySelectorAll(".filter-chip");
  const listEl = container.querySelector("#recipe-list");
  const emptyEl = container.querySelector("#recipe-empty");
  const statusEl = container.querySelector("#recipe-status");

  const state = { activeChips: new Set() };

  async function refresh() {
    const all = await getAllRecipes();
    const searchText = searchInput.value.trim().toLowerCase();
    const filtered = all.filter((r) => matchesFilters(r, { searchText, activeChips: state.activeChips }));
    const sorted = sortRecipes(filtered, sortSelect.value);

    listEl.innerHTML = sorted.map(rowHtml).join("");
    emptyEl.hidden = sorted.length > 0;
  }

  searchInput.addEventListener("input", refresh);
  sortSelect.addEventListener("change", refresh);

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.filter;
      chip.classList.toggle("active");
      if (state.activeChips.has(key)) {
        state.activeChips.delete(key);
      } else {
        state.activeChips.add(key);
      }
      refresh();
    });
  });

  listEl.addEventListener("click", async (event) => {
    const retryBtn = event.target.closest(".retry-btn");
    const deleteBtn = event.target.closest(".delete-btn");

    if (retryBtn) {
      const id = retryBtn.dataset.id;
      const recipe = (await getAllRecipes()).find((r) => r.id === id);
      if (!recipe) return;

      statusEl.textContent = "다시 만드는 중...";
      try {
        await retryRecipe(recipe);
        statusEl.textContent = "다시 만들었어요.";
      } catch (err) {
        statusEl.textContent = err.message;
      }
      refresh();
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (window.confirm("이 레시피를 삭제할까요?")) {
        await deleteRecipe(id);
        refresh();
      }
    }
  });

  refresh();
}
