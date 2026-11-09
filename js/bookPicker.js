// 레시피를 레시피북에 담는 바텀시트. 레시피 상세의 "저장" 버튼,
// 저장된 레시피 목록의 ⋮ 메뉴에서 둘 다 쓴다.
import { getRecipe } from "./db.js";
import { getAllBooks, createBook, addRecipeToBook, removeRecipeFromBook } from "./bookService.js";
import { escapeHtml } from "./htmlUtil.js";

export async function openBookPicker(recipeId, { onChanged } = {}) {
  const recipe = await getRecipe(recipeId);
  if (!recipe) return;

  const books = await getAllBooks();

  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = `
    <div class="bottom-sheet">
      <div class="sheet-header">
        <h2>레시피북에 저장</h2>
        <button type="button" class="sheet-close" id="book-picker-close">✕</button>
      </div>
      <ul class="book-picker-list" id="book-picker-list">
        ${books
          .map(
            (book) => `
          <li class="book-picker-row">
            <label>
              <input type="checkbox" class="book-picker-checkbox" data-book-id="${book.id}" ${recipe.bookIds?.includes(book.id) ? "checked" : ""} />
              ${escapeHtml(book.name)}
            </label>
          </li>`
          )
          .join("")}
      </ul>
      ${books.length === 0 ? `<p class="muted">아직 만든 레시피북이 없어요.</p>` : ""}

      <div class="book-picker-new-row">
        <input type="text" id="book-picker-new-name" class="text-input" placeholder="새 레시피북 이름" />
        <button type="button" class="btn-primary" id="book-picker-new-btn">만들기</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelector("#book-picker-close").addEventListener("click", close);

  backdrop.querySelectorAll(".book-picker-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      const bookId = checkbox.dataset.bookId;
      const current = await getRecipe(recipeId);
      if (checkbox.checked) {
        await addRecipeToBook(recipeId, bookId, current);
      } else {
        await removeRecipeFromBook(recipeId, bookId, current);
      }
      onChanged?.();
    });
  });

  backdrop.querySelector("#book-picker-new-btn").addEventListener("click", async () => {
    const input = backdrop.querySelector("#book-picker-new-name");
    const name = input.value.trim();
    if (!name) return;
    const book = await createBook(name);
    const current = await getRecipe(recipeId);
    await addRecipeToBook(recipeId, book.id, current);
    onChanged?.();
    close();
    openBookPicker(recipeId, { onChanged }); // 새 목록으로 다시 연다
  });
}
