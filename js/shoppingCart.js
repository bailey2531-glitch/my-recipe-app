// 레시피 재료를 장보기 목록에 담는다. SPEC.md 2-11: 같은 재료가 여러 레시피에 있으면
// 한 줄로 합치고 레시피 이름을 나열한다(분량 합산·카테고리별 정리는 장보기 화면에서 한다).
import { getAllShoppingItems, addShoppingItem, updateShoppingItem } from "./db.js";

function normalizeName(name) {
  return (name || "").trim().toLowerCase();
}

// 이름이 같은 재료가 이미 있으면 그 줄에 이번 레시피를 추가로 연결하고,
// 없으면 새 줄을 만든다. 같은 레시피에서 같은 재료를 두 번 눌러도 중복으로 쌓이지 않는다.
export async function addIngredientToCart(ingredient, recipeId, recipeTitle) {
  const all = await getAllShoppingItems();
  const existing = all.find((item) => normalizeName(item.name) === normalizeName(ingredient.name));

  if (existing) {
    if (existing.sources.some((s) => s.recipeId === recipeId)) {
      return existing; // 이미 이 레시피에서 담아둔 재료
    }
    return updateShoppingItem(existing.id, {
      sources: [...existing.sources, { recipeId, recipeTitle, amount: ingredient.amount, unit: ingredient.unit || "" }],
    });
  }

  return addShoppingItem({
    name: ingredient.name,
    category: ingredient.category || "기타",
    checked: false,
    sources: [{ recipeId, recipeTitle, amount: ingredient.amount, unit: ingredient.unit || "" }],
  });
}

export async function addAllIngredientsToCart(ingredients, recipeId, recipeTitle) {
  const results = [];
  for (const ingredient of ingredients) {
    results.push(await addIngredientToCart(ingredient, recipeId, recipeTitle));
  }
  return results;
}

// 특정 레시피에서 이미 담은 재료 이름 목록(소문자). 상세 화면에서 버튼 상태를 표시할 때 쓴다.
export async function getCartedIngredientNames(recipeId) {
  const all = await getAllShoppingItems();
  const names = new Set();
  for (const item of all) {
    if (item.sources.some((s) => s.recipeId === recipeId)) {
      names.add(normalizeName(item.name));
    }
  }
  return names;
}

// 상단 장바구니 배지에 쓸 전체 재료 줄 수.
export async function getCartCount() {
  const all = await getAllShoppingItems();
  return all.length;
}
