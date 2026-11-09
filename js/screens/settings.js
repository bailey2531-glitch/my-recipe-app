// 설정 화면. Gemini API 키, 백업 내보내기/가져오기, 전체 삭제(쇼핑몰 관리 등은 2차 작업).
import { getGeminiKey, setGeminiKey } from "../settingsStore.js";
import { testGeminiConnection } from "../geminiClient.js";
import { exportBackup, importBackup, deleteAllData } from "../backup.js";

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

    <section class="card">
      <h2>데이터</h2>

      <button id="export-btn" type="button" class="btn-ghost" style="width:100%;">백업 내보내기(JSON 파일로 저장)</button>
      <p id="export-status" class="muted" aria-live="polite"></p>

      <label class="field-label" for="import-input">백업 가져오기</label>
      <input id="import-input" type="file" accept="application/json" />
      <p id="import-status" class="muted" aria-live="polite"></p>

      <button id="delete-all-step1-btn" type="button" class="btn-ghost btn-danger" style="width:100%; margin-top:20px;">전체 삭제</button>
      <div id="delete-all-confirm" hidden>
        <p class="danger-text">정말 모든 레시피·레시피북·장보기 목록·사진을 지울까요? 이 작업은 되돌릴 수 없어요.</p>
        <button id="delete-all-step2-btn" type="button" class="btn-primary btn-danger-filled">네, 전부 삭제할게요</button>
        <button id="delete-all-cancel-btn" type="button" class="btn-ghost" style="width:100%; margin-top:8px;">취소</button>
      </div>
      <p id="delete-status" class="muted" aria-live="polite"></p>
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

  const exportBtn = container.querySelector("#export-btn");
  const exportStatus = container.querySelector("#export-status");
  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportStatus.textContent = "백업 파일을 만드는 중...";
    try {
      const result = await exportBackup();
      exportStatus.textContent = `저장했어요. (레시피 ${result.recipeCount}개, 레시피북 ${result.bookCount}개)`;
    } catch (err) {
      exportStatus.textContent = `백업에 실패했어요: ${err.message}`;
    } finally {
      exportBtn.disabled = false;
    }
  });

  const importInput = container.querySelector("#import-input");
  const importStatus = container.querySelector("#import-status");
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;

    const ok = window.confirm("가져오기를 하면 지금 있는 데이터를 모두 지우고 이 파일 내용으로 바꿔요. 계속할까요?");
    if (!ok) {
      importInput.value = "";
      return;
    }

    importStatus.textContent = "불러오는 중...";
    try {
      const result = await importBackup(file);
      importStatus.textContent = `복구했어요. (레시피 ${result.recipeCount}개, 레시피북 ${result.bookCount}개)`;
    } catch (err) {
      importStatus.textContent = err.message;
    } finally {
      importInput.value = "";
    }
  });

  const deleteStep1Btn = container.querySelector("#delete-all-step1-btn");
  const deleteConfirm = container.querySelector("#delete-all-confirm");
  const deleteStep2Btn = container.querySelector("#delete-all-step2-btn");
  const deleteCancelBtn = container.querySelector("#delete-all-cancel-btn");
  const deleteStatus = container.querySelector("#delete-status");

  deleteStep1Btn.addEventListener("click", () => {
    deleteConfirm.hidden = false;
    deleteStep1Btn.hidden = true;
  });

  deleteCancelBtn.addEventListener("click", () => {
    deleteConfirm.hidden = true;
    deleteStep1Btn.hidden = false;
  });

  deleteStep2Btn.addEventListener("click", async () => {
    deleteStep2Btn.disabled = true;
    try {
      await deleteAllData();
      deleteStatus.textContent = "전부 삭제했어요.";
      deleteConfirm.hidden = true;
      deleteStep1Btn.hidden = false;
    } catch (err) {
      deleteStatus.textContent = err.message;
    } finally {
      deleteStep2Btn.disabled = false;
    }
  });
}
