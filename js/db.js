// 레시피를 폰 안(IndexedDB)에 저장/조회/수정/삭제하는 함수 모음.
// SPEC.md 3장 데이터 구조(Recipe)를 그대로 저장소 레벨에서 다룬다.
const DB_NAME = "myrecipe";
const DB_VERSION = 3;
const STORE_RECIPES = "recipes";
const STORE_PHOTOS = "photos"; // "해먹었어요" 기록 사진(Blob)을 따로 저장한다
const STORE_SHOPPING = "shoppingItems"; // 장보기 목록에 담긴 재료

let dbPromise = null;

// DB는 한 번만 열고 재사용한다(요청마다 새로 열지 않음).
function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RECIPES)) {
        const store = db.createObjectStore(STORE_RECIPES, { keyPath: "id" });
        // 같은 링크를 다시 넣었을 때 "이미 저장된 레시피예요"를 확인하기 위한 색인
        store.createIndex("by-url", "source.url");
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SHOPPING)) {
        db.createObjectStore(STORE_SHOPPING, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function runTransaction(storeName, mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = run(store);

        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

function makeId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 레시피를 새로 추가한다. id/createdAt/updatedAt은 여기서 채운다.
export async function addRecipe(recipe) {
  const now = new Date().toISOString();
  const toSave = {
    ...recipe,
    id: recipe.id || makeId(),
    createdAt: now,
    updatedAt: now,
  };

  await runTransaction(STORE_RECIPES, "readwrite", (store) => store.add(toSave));
  return toSave;
}

// id로 레시피 하나를 가져온다. 없으면 undefined.
export function getRecipe(id) {
  return runTransaction(STORE_RECIPES, "readonly", (store) => store.get(id));
}

// 저장된 모든 레시피를 가져온다(정렬은 화면 쪽에서 한다).
export function getAllRecipes() {
  return runTransaction(STORE_RECIPES, "readonly", (store) => store.getAll());
}

// 레시피 일부 필드만 바꾼다(patch). updatedAt은 자동으로 갱신된다.
export async function updateRecipe(id, patch) {
  const existing = await getRecipe(id);
  if (!existing) {
    throw new Error(`레시피를 찾을 수 없어요: ${id}`);
  }

  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  await runTransaction(STORE_RECIPES, "readwrite", (store) => store.put(updated));
  return updated;
}

// 레시피를 삭제한다.
export function deleteRecipe(id) {
  return runTransaction(STORE_RECIPES, "readwrite", (store) => store.delete(id));
}

// 원본 링크로 이미 저장된 레시피가 있는지 찾는다(중복 링크 안내용).
export function findRecipeByUrl(url) {
  return runTransaction(STORE_RECIPES, "readonly", (store) => store.index("by-url").get(url));
}

// "해먹었어요" 기록 사진을 저장하고, 그 사진을 가리킬 id를 돌려준다.
export async function savePhoto(blob) {
  const id = makeId();
  await runTransaction(STORE_PHOTOS, "readwrite", (store) => store.add({ id, blob }));
  return id;
}

// id로 사진을 가져온다. { id, blob } 또는 undefined.
export function getPhoto(id) {
  return runTransaction(STORE_PHOTOS, "readonly", (store) => store.get(id));
}

export function deletePhoto(id) {
  return runTransaction(STORE_PHOTOS, "readwrite", (store) => store.delete(id));
}

// 장보기 목록에 재료 한 줄을 추가한다.
export async function addShoppingItem(item) {
  const toSave = { ...item, id: item.id || makeId() };
  await runTransaction(STORE_SHOPPING, "readwrite", (store) => store.add(toSave));
  return toSave;
}

export function getAllShoppingItems() {
  return runTransaction(STORE_SHOPPING, "readonly", (store) => store.getAll());
}

export async function updateShoppingItem(id, patch) {
  const all = await getAllShoppingItems();
  const existing = all.find((item) => item.id === id);
  if (!existing) {
    throw new Error(`장보기 항목을 찾을 수 없어요: ${id}`);
  }
  const updated = { ...existing, ...patch, id };
  await runTransaction(STORE_SHOPPING, "readwrite", (store) => store.put(updated));
  return updated;
}

export function deleteShoppingItem(id) {
  return runTransaction(STORE_SHOPPING, "readwrite", (store) => store.delete(id));
}
