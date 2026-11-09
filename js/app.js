// 앱 시작점. 지금은 뼈대만 그리고, 서비스워커를 등록한다.

function renderShellCheck() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="card">
      <h1>My Recipe</h1>
      <p>프로젝트 뼈대가 준비됐어요. (1번 작업 완료)</p>
      <p>다음 작업에서 하단 탭바와 화면 전환을 만듭니다.</p>
    </div>
  `;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
}

renderShellCheck();
registerServiceWorker();
