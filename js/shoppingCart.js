// 레시피 재료를 장보기 목록에 담는다. SPEC.md 2-11: 같은 재료가 여러 레시피에 있으면
// 한 줄로 합치고 레시피 이름을 나열한다(분량 합산·카테고리별 정리는 장보기 화면에서 한다).
import { getAllShoppingItems, addShoppingItem, updateShoppingItem, deleteShoppingItem } from "./db.js";

function normalizeName(name) {
  return (name || "").trim().toLowerCase();
}

// 이름이 같은 재료가 이미 있으면 그 줄에 source(레시피 또는 직접 추가)를 덧붙이고,
// 없으면 새 줄을 만든다.
async function addSourceToCart({ name, category, source }) {
  const all = await getAllShoppingItems();
  const existing = all.find((item) => normalizeName(item.name) === normalizeName(name));

  if (existing) {
    if (source.recipeId && existing.sources.some((s) => s.recipeId === source.recipeId)) {
      return existing; // 이미 이 레시피에서 담아둔 재료
    }
    return updateShoppingItem(existing.id, { sources: [...existing.sources, source] });
  }

  return addShoppingItem({ name, category: category || "기타", checked: false, sources: [source] });
}

export function addIngredientToCart(ingredient, recipeId, recipeTitle) {
  return addSourceToCart({
    name: ingredient.name,
    category: ingredient.category,
    source: { recipeId, recipeTitle, amount: ingredient.amount, unit: ingredient.unit || "" },
  });
}

export async function addAllIngredientsToCart(ingredients, recipeId, recipeTitle) {
  const results = [];
  for (const ingredient of ingredients) {
    results.push(await addIngredientToCart(ingredient, recipeId, recipeTitle));
  }
  return results;
}

// "+ 새로 추가"로 레시피 없이 직접 넣는 재료.
export function addManualItem({ name, amount, unit, category }) {
  return addSourceToCart({
    name,
    category,
    source: { recipeId: null, recipeTitle: null, amount: amount || "적당량", unit: unit || "" },
  });
}

// 장보기 화면에서 레시피 카드를 뺄 때: 그 레시피에서 담은 재료만 지운다.
// 다른 레시피도 같이 쓰는 재료면 그 연결만 지우고 줄 자체는 남긴다.
export async function removeRecipeFromCart(recipeId) {
  const all = await getAllShoppingItems();
  for (const item of all) {
    if (!item.sources.some((s) => s.recipeId === recipeId)) continue;
    const remaining = item.sources.filter((s) => s.recipeId !== recipeId);
    if (remaining.length === 0) {
      await deleteShoppingItem(item.id);
    } else {
      await updateShoppingItem(item.id, { sources: remaining });
    }
  }
}

// 체크된 재료를 한 번에 지운다.
export async function deleteCheckedItems() {
  const all = await getAllShoppingItems();
  for (const item of all) {
    if (item.checked) await deleteShoppingItem(item.id);
  }
}

// "담은 레시피" 카드에 쓸 recipeId -> recipeTitle 목록(중복 없이).
export async function getCartedRecipeIds() {
  const all = await getAllShoppingItems();
  const map = new Map();
  for (const item of all) {
    for (const s of item.sources) {
      if (s.recipeId) map.set(s.recipeId, s.recipeTitle);
    }
  }
  return map;
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

function parseNumericAmount(amount) {
  const trimmed = String(amount ?? "").trim();
  return /^[0-9]+(\.[0-9]+)?$/.test(trimmed) ? parseFloat(trimmed) : null;
}

// SPEC.md 2-11: 분량 합산은 단위가 같을 때만 한다. 단위가 다르거나 숫자가 아니면
// ("약간" 등) 그냥 나열한다.
export function summarizeAmounts(sources) {
  const units = new Set(sources.map((s) => s.unit || ""));
  if (units.size === 1) {
    const unit = [...units][0];
    const nums = sources.map((s) => parseNumericAmount(s.amount));
    if (nums.every((n) => n !== null)) {
      const total = Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
      return `${total}${unit}`;
    }
  }
  return sources.map((s) => `${s.amount}${s.unit || ""}`).join(" + ");
}
