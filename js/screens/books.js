// 레시피북 화면. SPEC.md 2-9: 목록, 콜라주 표지, 재료 검색, 새 레시피북 만들기/이름변경/삭제.
import { getAllRecipes } from "../db.js";
import { getAllBooks, createBook, renameBook, removeBook, getRecipesForBook, DEFAULT_BOOK_ID, DEFAULT_BOOK_NAME } from "../bookService.js";
import { getRecipeThumbnail } from "../recipeThumbnail.js";
import { escapeHtml } from "../htmlUtil.js";
import { PLATFORM_LABEL } from "../platformLabel.js";
import { searchIcon } from "../icons.js";

function collageHtml(recipes) {
  const thumbs = recipes.slice(0, 4).map((r) => getRecipeThumbnail(r));
  while (thumbs.length < 4) thumbs.push(null);
  return `
    <div class="book-collage">
      ${thumbs.map((url) => (url ? `<div class="book-collage-cell" style="background-image:url('${url}')"></div>` : `<div class="book-collage-cell placeholder"></div>`)).join("")}
    </div>
  `;
}

function bookCardHtml(book, recipes) {
  const isDefault = book.id === DEFAULT_BOOK_ID;
  return `
    <a class="book-card" href="#recipes${isDefault ? "" : "/" + book.id}" data-book-id="${book.id ?? ""}">
      ${collageHtml(recipes)}
      <div class="book-card-footer">
        <span class="book-card-name">${escapeHtml(book.name)}</span>
        <span class="muted small">레시피 ${recipes.length}개</span>
      </div>
      ${
        isDefault
          ? ""
          : `
        <div class="book-card-actions">
          <button type="button" class="book-rename-btn" data-id="${book.id}" title="이름 바꾸기">✎</button>
          <button type="button" class="book-delete-btn" data-id="${book.id}" title="삭제">🗑</button>
        </div>`
      }
    </a>
  `;
}

// 검색어가 들어간 재료를 가진 레시피만 골라, 눌렀을 때 그 레시피로 바로 가는 목록을 만든다.
function ingredientMatchesHtml(allRecipes, query) {
  const matches = allRecipes.filter((r) => (r.ingredients || []).some((ing) => ing.name.toLowerCase().includes(query)));

  if (!matches.length) {
    return `<p class="muted">"${escapeHtml(query)}"가 들어간 레시피가 없어요.</p>`;
  }

  return `
    <ul class="ingredient-match-list">
      ${matches
        .map(
          (r) => `
        <li>
          <a href="#recipe/${r.id}" class="ingredient-match-row">
            <span class="ingredient-match-title">${escapeHtml(r.title)}</span>
            <span class="muted small">${PLATFORM_LABEL[r.source?.platform] || ""}</span>
          </a>
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

export async function renderBooks(container) {
  container.innerHTML = `<section class="card"><p class="muted">불러오는 중...</p></section>`;

  const allRecipes = await getAllRecipes();
  const books = await getAllBooks();
  const booksWithDefault = [{ id: DEFAULT_BOOK_ID, name: DEFAULT_BOOK_NAME }, ...books];

  const recipesByBook = new Map();
  for (const book of booksWithDefault) {
    recipesByBook.set(book.id, await getRecipesForBook(book.id));
  }

  container.innerHTML = `
    <h1>내 레시피북</h1>

    <div class="search-row">
      <span class="search-icon" aria-hidden="true">${searchIcon}</span>
      <input id="book-search" class="text-input search-input" type="search" placeholder="재료 이름으로 검색" />
    </div>

    <div class="book-new-row">
      <input type="text" id="book-new-name" class="text-input" placeholder="새 레시피북 이름" />
      <button type="button" class="btn-icon-round" id="book-new-btn" aria-label="새 레시피북 만들기">+</button>
    </div>

    <div id="book-results"></div>
  `;

  // 검색칸에 타이핑할 때는 결과 부분(#book-results)만 바꾸고, 검색칸(input) 자체는
  // 다시 그리지 않는다. input을 통째로 다시 그리면 한글 입력 중(조합 중) 글자가
  // 자모로 쪼개져 나오는 문제가 있어서, 입력칸은 그대로 두고 결과만 갈아끼운다.
  const searchInput = container.querySelector("#book-search");
  const resultsEl = container.querySelector("#book-results");

  function renderResults(searchText) {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      resultsEl.innerHTML = `<div class="book-grid">${booksWithDefault.map((b) => bookCardHtml(b, recipesByBook.get(b.id) || [])).join("")}</div>`;
      wireBookCardButtons();
      return;
    }

    resultsEl.innerHTML = ingredientMatchesHtml(allRecipes, query);
  }

  function wireBookCardButtons() {
    resultsEl.querySelectorAll(".book-rename-btn").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        const current = booksWithDefault.find((b) => b.id === btn.dataset.id);
        const name = window.prompt("새 이름을 입력하세요", current?.name || "");
        if (!name || !name.trim()) return;
        await renameBook(btn.dataset.id, name);
        refreshAll();
      });
    });

    resultsEl.querySelectorAll(".book-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        if (window.confirm("이 레시피북을 삭제할까요? (안에 있던 레시피는 지워지지 않아요)")) {
          await removeBook(btn.dataset.id);
          refreshAll();
        }
      });
    });
  }

  searchInput.addEventListener("input", () => renderResults(searchInput.value));
  renderResults("");

  container.querySelector("#book-new-btn").addEventListener("click", async () => {
    const nameInput = container.querySelector("#book-new-name");
    const name = nameInput.value.trim();
    if (!name) return;
    await createBook(name);
    refreshAll();
  });

  // 북 만들기·이름변경·삭제 뒤에 다시 그릴 때 스크롤 위치를 유지한다.
  function refreshAll() {
    const scrollY = window.scrollY;
    renderBooks(container).then(() => {
      window.scrollTo(0, scrollY);
    });
  }
}
