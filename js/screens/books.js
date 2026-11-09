// 레시피북 화면. SPEC.md 2-9: 목록, 콜라주 표지, 검색, 새 레시피북 만들기/이름변경/삭제.
import { getAllRecipes } from "../db.js";
import { getAllBooks, createBook, renameBook, removeBook, getRecipesForBook, DEFAULT_BOOK_ID, DEFAULT_BOOK_NAME } from "../bookService.js";
import { getRecipeThumbnail } from "../recipeThumbnail.js";
import { escapeHtml } from "../htmlUtil.js";

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

export async function renderBooks(container) {
  container.innerHTML = `<section class="card"><p class="muted">불러오는 중...</p></section>`;

  const allRecipes = await getAllRecipes();
  const books = await getAllBooks();
  const booksWithDefault = [{ id: DEFAULT_BOOK_ID, name: DEFAULT_BOOK_NAME }, ...books];

  const recipesByBook = new Map();
  for (const book of booksWithDefault) {
    recipesByBook.set(book.id, await getRecipesForBook(book.id));
  }

  render("");

  function render(searchText) {
    const query = searchText.trim().toLowerCase();
    const visibleBooks = query ? booksWithDefault.filter((b) => b.name.toLowerCase().includes(query)) : booksWithDefault;

    container.innerHTML = `
      <h1>내 레시피북</h1>
      <input id="book-search" class="text-input" type="search" placeholder="레시피북 이름으로 검색" value="${escapeHtml(searchText)}" />

      <div class="book-new-row">
        <input type="text" id="book-new-name" class="text-input" placeholder="새 레시피북 이름" />
        <button type="button" class="btn-primary" id="book-new-btn">+ 새 레시피 북</button>
      </div>

      <div class="book-grid">
        ${visibleBooks.map((b) => bookCardHtml(b, recipesByBook.get(b.id) || [])).join("")}
      </div>
      ${visibleBooks.length === 0 ? `<p class="muted">"${escapeHtml(searchText)}"와(과) 일치하는 레시피북이 없어요.</p>` : ""}
    `;

    const searchInput = container.querySelector("#book-search");
    searchInput.addEventListener("input", () => render(searchInput.value));
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);

    container.querySelector("#book-new-btn").addEventListener("click", async () => {
      const nameInput = container.querySelector("#book-new-name");
      const name = nameInput.value.trim();
      if (!name) return;
      await createBook(name);
      refreshAll();
    });

    container.querySelectorAll(".book-rename-btn").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        const current = booksWithDefault.find((b) => b.id === btn.dataset.id);
        const name = window.prompt("새 이름을 입력하세요", current?.name || "");
        if (!name || !name.trim()) return;
        await renameBook(btn.dataset.id, name);
        refreshAll();
      });
    });

    container.querySelectorAll(".book-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        if (window.confirm("이 레시피북을 삭제할까요? (안에 있던 레시피는 지워지지 않아요)")) {
          await removeBook(btn.dataset.id);
          refreshAll();
        }
      });
    });
  }

  function refreshAll() {
    renderBooks(container);
  }
}
