// "해먹었어요" 기록(cooks)을 추가/수정/삭제한다. SPEC.md 2-6.
import { getRecipe, updateRecipe, savePhoto, deletePhoto } from "./db.js";

function makeId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 누를 때마다 새 기록이 추가되고 "N번 해먹었어요" 횟수가 올라간다.
export async function addCookRecord(recipeId, { rating, comment, photoBlob }) {
  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("레시피를 찾을 수 없어요.");

  const photoBlobId = photoBlob ? await savePhoto(photoBlob) : undefined;
  const record = {
    id: makeId(),
    date: new Date().toISOString(),
    rating,
    comment: comment || "",
    photoBlobId,
  };

  return updateRecipe(recipeId, { cooks: [...(recipe.cooks || []), record] });
}

export async function updateCookRecord(recipeId, cookId, { rating, comment, photoBlob, removePhoto }) {
  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("레시피를 찾을 수 없어요.");

  const cooks = [];
  for (const c of recipe.cooks || []) {
    if (c.id !== cookId) {
      cooks.push(c);
      continue;
    }

    let photoBlobId = c.photoBlobId;
    if (photoBlob) {
      if (photoBlobId) await deletePhoto(photoBlobId);
      photoBlobId = await savePhoto(photoBlob);
    } else if (removePhoto && photoBlobId) {
      await deletePhoto(photoBlobId);
      photoBlobId = undefined;
    }

    cooks.push({ ...c, rating: rating ?? c.rating, comment: comment ?? c.comment, photoBlobId });
  }

  return updateRecipe(recipeId, { cooks });
}

export async function deleteCookRecord(recipeId, cookId) {
  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("레시피를 찾을 수 없어요.");

  const target = (recipe.cooks || []).find((c) => c.id === cookId);
  if (target?.photoBlobId) await deletePhoto(target.photoBlobId);

  return updateRecipe(recipeId, { cooks: (recipe.cooks || []).filter((c) => c.id !== cookId) });
}
