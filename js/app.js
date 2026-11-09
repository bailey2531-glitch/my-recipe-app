// 앱 시작점. 하단 탭바 라우터를 켜고, 서비스워커를 등록한다.
import { startRouter } from "./router.js";

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
}

startRouter();
registerServiceWorker();
