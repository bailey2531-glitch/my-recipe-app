// 주소의 #뒤 값(hash)을 보고 어떤 화면을 보여줄지 정하는 간단한 라우터.
// 빌드 도구 없이 쓸 수 있게 해시 방식을 쓴다.
import { renderHome } from "./screens/home.js";
import { renderBooks } from "./screens/books.js";
import { renderShopping } from "./screens/shopping.js";
import { renderSettings } from "./screens/settings.js";
import { renderRecipes } from "./screens/recipes.js";
import { TAB_ICONS } from "./icons.js";

// tab: true인 항목만 하단 탭바에 나타난다. 저장된 레시피 목록(recipes)은
// 하단 탭이 아니라 홈 화면의 "전체보기" 링크로 들어가는 화면이다.
const ROUTES = {
  home: { render: renderHome, label: "홈", tab: true },
  books: { render: renderBooks, label: "레시피북", tab: true },
  shopping: { render: renderShopping, label: "장보기", tab: true },
  settings: { render: renderSettings, label: "설정", tab: true },
  recipes: { render: renderRecipes, label: "저장된 레시피" },
};

const DEFAULT_ROUTE = "home";

function currentRouteKey() {
  const hash = location.hash.replace("#", "");
  return ROUTES[hash] ? hash : DEFAULT_ROUTE;
}

function buildTabBar() {
  const nav = document.getElementById("tab-bar");
  nav.innerHTML = Object.entries(ROUTES)
    .filter(([, route]) => route.tab)
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
