// 설정 화면. 1차는 Gemini API 키 입력만 다룬다(백업/몰 관리 등은 이후 작업).
import { getGeminiKey, setGeminiKey } from "../settingsStore.js";
import { testGeminiConnection } from "../geminiClient.js";

export function renderSettings(container) {
  container.innerHTML = `
    <section class="card">
      <h1>설정</h1>

      <label class="field-label" for="gemini-key-input">Gemini API 키</label>
      <div class="key-input-row">
        <input id="gemini-key-input" type="password" placeholder="API 키를 붙여넣으세요" autocomplete="off" />
        <button id="toggle-key-visibility" type="button" class="btn-ghost">보기</button>
      </div>
      <button id="save-key-btn" type="button" class="btn-primary">저장</button>
      <p id="save-status" class="muted" aria-live="polite"></p>

      <button id="test-connection-btn" type="button" class="btn-ghost" style="width:100%; margin-top:16px;">연결 테스트</button>
      <p id="test-status" class="muted" aria-live="polite"></p>

      <p class="muted">키는 이 폰 브라우저 안에만 저장되고, 외부로 전송되지 않습니다. 채팅창이나 다른 곳에는 붙여넣지 마세요.</p>
    </section>
  `;

  const input = container.querySelector("#gemini-key-input");
  const toggleBtn = container.querySelector("#toggle-key-visibility");
  const saveBtn = container.querySelector("#save-key-btn");
  const status = container.querySelector("#save-status");
  const testBtn = container.querySelector("#test-connection-btn");
  const testStatus = container.querySelector("#test-status");

  // 저장된 값은 .value로 넣어서(innerHTML 아님) 특수문자 이슈를 피한다
  input.value = getGeminiKey();

  toggleBtn.addEventListener("click", () => {
    const willShow = input.type === "password";
    input.type = willShow ? "text" : "password";
    toggleBtn.textContent = willShow ? "숨기기" : "보기";
  });

  saveBtn.addEventListener("click", () => {
    setGeminiKey(input.value);
    status.textContent = "저장했어요.";
    window.setTimeout(() => {
      status.textContent = "";
    }, 2000);
  });

  testBtn.addEventListener("click", async () => {
    const key = getGeminiKey();
    if (!key) {
      testStatus.textContent = "먼저 API 키를 저장해 주세요.";
      return;
    }

    testBtn.disabled = true;
    testStatus.textContent = "Gemini에 연결하는 중...";

    try {
      const result = await testGeminiConnection(key);
      testStatus.textContent = `연결 성공: ${result.message}`;
    } catch (err) {
      testStatus.textContent = `연결 실패: ${err.message}`;
    } finally {
      testBtn.disabled = false;
    }
  });
}
