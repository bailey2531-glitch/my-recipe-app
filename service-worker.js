// 서비스워커: 지금은 설치/활성화만 하고 아무 캐싱도 하지 않는다.
// 오프라인 캐싱은 19번 작업("서비스워커 오프라인 캐시")에서 채운다.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});
