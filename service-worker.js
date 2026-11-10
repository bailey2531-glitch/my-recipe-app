// 서비스워커: 오프라인에서도 앱 화면(껍데기)이 뜨도록 핵심 파일을 미리 저장해 둔다.
// 레시피 같은 실제 데이터는 IndexedDB에 있어서 여기서 다루지 않는다.
// 파일을 추가/삭제하거나 내용을 크게 바꿨으면 CACHE_NAME의 버전 숫자를 올린다.
// 그래야 사용자 폰의 예전 캐시가 정리되고 새 파일로 바뀐다.
const CACHE_NAME = "myrecipe-shell-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./icons/icon.svg",
  "./js/app.js",
  "./js/backup.js",
  "./js/bookPicker.js",
  "./js/bookService.js",
  "./js/config.js",
  "./js/cookLog.js",
  "./js/db.js",
  "./js/geminiClient.js",
  "./js/htmlUtil.js",
  "./js/icons.js",
  "./js/imageResize.js",
  "./js/ingredientCategories.js",
  "./js/instagramUrl.js",
  "./js/platformLabel.js",
  "./js/recipeAi.js",
  "./js/recipeConvert.js",
  "./js/recipeThumbnail.js",
  "./js/router.js",
  "./js/screens/books.js",
  "./js/screens/home.js",
  "./js/screens/recipeDetail.js",
  "./js/screens/recipes.js",
  "./js/screens/settings.js",
  "./js/screens/shopping.js",
  "./js/settingsStore.js",
  "./js/shareLink.js",
  "./js/shareTarget.js",
  "./js/shoppingCart.js",
  "./js/youtubePlayer.js",
  "./js/youtubeUrl.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 우리 앱 파일(같은 출처, GET)만 캐시로 다룬다.
  // Gemini API·유튜브 임베드/썸네일 같은 외부 요청은 그대로 두고 손대지 않는다.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // 오프라인인데 캐시에도 없으면, 화면 이동 요청만큼은 index.html로 대신 보여준다.
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          throw new Error("오프라인 상태이고 캐시에도 없는 파일이에요.");
        });
    })
  );
});
