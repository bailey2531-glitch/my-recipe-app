// 백업 내보내기/가져오기, 전체 삭제. SPEC.md 2-13.
import {
  getAllRecipes,
  getAllBooks,
  getAllShoppingItems,
  getAllPhotos,
  clearAllData,
  putRecipeRaw,
  putBookRaw,
  putShoppingItemRaw,
  putPhotoRaw,
} from "./db.js";

const BACKUP_VERSION = 1;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

// 레시피·레시피북·장보기 목록·"해먹었어요" 사진을 JSON 파일로 내려받는다.
export async function exportBackup() {
  const [recipes, books, shoppingItems, photos] = await Promise.all([
    getAllRecipes(),
    getAllBooks(),
    getAllShoppingItems(),
    getAllPhotos(),
  ]);

  const photosWithDataUrl = await Promise.all(
    photos.map(async (p) => ({ id: p.id, dataUrl: await blobToDataUrl(p.blob) }))
  );

  const exportedAt = new Date().toISOString();
  const backup = {
    app: "myrecipe",
    version: BACKUP_VERSION,
    exportedAt,
    recipes,
    books,
    shoppingItems,
    photos: photosWithDataUrl,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `myrecipe-backup-${exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return {
    recipeCount: recipes.length,
    bookCount: books.length,
  };
}

// 백업 파일을 읽어서 지금 데이터를 전부 그 내용으로 바꾼다.
export async function importBackup(file) {
  const text = await file.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON 파일을 읽지 못했어요. 올바른 백업 파일인지 확인해 주세요.");
  }

  if (data.app !== "myrecipe" || !Array.isArray(data.recipes)) {
    throw new Error("My Recipe 백업 파일이 아니에요.");
  }

  await clearAllData();

  for (const recipe of data.recipes) await putRecipeRaw(recipe);
  for (const book of data.books || []) await putBookRaw(book);
  for (const item of data.shoppingItems || []) await putShoppingItemRaw(item);
  for (const photo of data.photos || []) {
    const blob = await dataUrlToBlob(photo.dataUrl);
    await putPhotoRaw({ id: photo.id, blob });
  }

  return {
    recipeCount: data.recipes.length,
    bookCount: (data.books || []).length,
  };
}

export { clearAllData as deleteAllData };
