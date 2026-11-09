// 레시피북(레시피 모음) 관리. SPEC.md 2-9.
// 기본 북 "저장된 레시피"는 실제로 저장하지 않는 가짜(제목만 있는) 북으로,
// 항상 전체 레시피를 보여준다 — recipeId를 bookId로 안 쓰고 null로 다룬다.
import { getAllBooks, addBook, updateBook, deleteBook, getAllRecipes, updateRecipe } from "./db.js";

export const DEFAULT_BOOK_ID = null;
export const DEFAULT_BOOK_NAME = "저장된 레시피";

export function createBook(name) {
  return addBook({ name: name.trim() });
}

export function renameBook(id, name) {
  return updateBook(id, { name: name.trim() });
}

// 북을 지워도 레시피 자체는 남는다 — 레시피들의 bookIds에서 이 북 id만 지운다.
export async function removeBook(id) {
  const all = await getAllRecipes();
  for (const recipe of all) {
    if (!recipe.bookIds?.includes(id)) continue;
    await updateRecipe(recipe.id, { bookIds: recipe.bookIds.filter((b) => b !== id) });
  }
  await deleteBook(id);
}

export async function addRecipeToBook(recipeId, bookId, recipe) {
  const bookIds = new Set(recipe.bookIds || []);
  bookIds.add(bookId);
  return updateRecipe(recipeId, { bookIds: [...bookIds] });
}

export async function removeRecipeFromBook(recipeId, bookId, recipe) {
  const bookIds = (recipe.bookIds || []).filter((b) => b !== bookId);
  return updateRecipe(recipeId, { bookIds });
}

// bookId가 없으면(기본 북) 전체 레시피, 있으면 그 북에 속한 레시피만 돌려준다.
export async function getRecipesForBook(bookId) {
  const all = await getAllRecipes();
  if (!bookId) return all;
  return all.filter((recipe) => recipe.bookIds?.includes(bookId));
}

export { getAllBooks };
