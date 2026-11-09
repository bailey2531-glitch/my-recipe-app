// 홈 화면. 입력 카드·저장한 레시피 가로 스크롤 등은 7, 9번 작업에서 채운다.
export function renderHome(container) {
  container.innerHTML = `
    <section class="card">
      <h1>오늘 본 요리 영상, 레시피로 남겨 두세요</h1>
      <p class="muted">홈 화면 자리입니다. 링크 입력 카드는 다음 작업에서 만듭니다.</p>
    </section>
  `;
}
