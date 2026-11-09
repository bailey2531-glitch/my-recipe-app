// 주소의 #뒤 값(hash)을 보고 어떤 화면을 보여줄지 정하는 간단한 라우터.
// 빌드 도구 없이 쓸 수 있게 해시 방식을 쓴다.
import { renderHome } from "./screens/home.js";
import { renderBooks } from "./screens/books.js";
import { renderShopping } from "./screens/shopping.js";
import { renderSettings } from "./screens/settings.js";
import { TAB_ICONS } from "./icons.js";

const ROUTES = {
  home: { render: renderHome, label: "홈" },
  books: { render: renderBooks, label: "레시피북" },
  shopping: { render: renderShopping, label: "장보기" },
  settings: { render: renderSettings, label: "설정" },
};

const DEFAULT_ROUTE = "home";

function currentRouteKey() {
  const hash = location.hash.replace("#", "");
  return ROUTES[hash] ? hash : DEFAULT_ROUTE;
}

function buildTabBar() {
  const nav = document.getElementById("tab-bar");
  nav.innerHTML = Object.entries(ROUTES)
    .map(
      ([key, { label }]) => `
        <a class="tab-item" data-route="${key}" href="#${key}">
          <span class="tab-icon">${TAB_ICONS[key]}</span>
          <span class="tab-label">${label}</span>
        </a>`
    )
    .join("");
}

function updateTabBar(activeKey) {
  document.querySelectorAll("#tab-bar .tab-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === activeKey);
  });
}

function renderCurrentScreen() {
  const key = currentRouteKey();
  const app = document.getElementById("app");
  ROUTES[key].render(app);
  updateTabBar(key);
  window.scrollTo(0, 0);
}

export function startRouter() {
  buildTabBar();
  window.addEventListener("hashchange", renderCurrentScreen);
  renderCurrentScreen();
}
