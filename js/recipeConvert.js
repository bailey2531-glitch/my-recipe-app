// 홈 화면 "보내기" 버튼을 눌렀을 때의 전체 흐름.
// SPEC.md 2-3: pending으로 즉시 저장 → Gemini 호출 → 완료/실패 반영, 중복 링크면 안내만 한다.
import { addRecipe, updateRecipe, findRecipeByUrl } from "./db.js";
import { generateRecipeFromSource } from "./recipeAi.js";
import { getGeminiKey } from "./settingsStore.js";

function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return "web";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function makeId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Gemini가 돌려준 레시피 JSON을 DB에 저장할 형태로 다듬는다.
// 재료마다 id를 붙이고, 단계의 ingredientNames를 그 id로 바꿔 연결한다.
function normalizeAiRecipe(ai) {
  const ingredients = ai.ingredients.map((ing) => ({ id: makeId(), ...ing }));
  const nameToId = new Map(ingredients.map((ing) => [ing.name, ing.id]));

  const stepGroups = ai.stepGroups.map((group) => ({
    title: group.title,
    steps: group.steps.map((step) => ({
      text: step.text,
      ingredientIds: (step.ingredientNames || []).map((name) => nameToId.get(name)).filter(Boolean),
      tip: step.tip || "",
      highlights: step.highlights || [],
      timestampSec: step.timestampSec,
    })),
  }));

  return {
    title: ai.title,
    summary: ai.summary,
    timeMinutes: ai.timeMinutes,
    servings: ai.servings,
    tags: ai.tags || [],
    nutrition: ai.nutrition,
    ingredients,
    tools: (ai.tools || []).map((name) => ({ name })),
    stepGroups,
  };
}

// input: { mode: 'link'|'text'|'image', link, caption, text, imageFile }
// onStatus(text)로 진행 상황을 알려줄 수 있다(선택).
export async function sendToConvert(input, onStatus) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error("설정 화면에서 Gemini API 키를 먼저 저장해 주세요.");
  }

  let source; // Gemini 호출용
  let dbSource; // DB에 저장할 원본 정보(source.url/platform)

  if (input.mode === "link") {
    const url = input.link.trim();
    const platform = detectPlatform(url);

    const duplicate = await findRecipeByUrl(url);
    if (duplicate) {
      throw new Error(`이미 저장된 레시피예요: ${duplicate.title}`);
    }

    if (platform === "youtube") {
      source = { type: "youtube", url };
    } else if (platform === "instagram" || platform === "tiktok") {
      const caption = (input.caption || "").trim();
      if (!caption) {
        throw new Error("인스타·틱톡은 캡션을 함께 붙여넣어야 분석할 수 있어요.");
      }
      source = { type: "caption", text: caption };
    } else {
      throw new Error("지원하지 않는 링크예요. 레시피 글을 복사해서 '텍스트' 탭에 붙여넣어 주세요.");
    }

    dbSource = { url, platform };
  } else if (input.mode === "text") {
    const text = input.text.trim();
    source = { type: "text", text };
    dbSource = { platform: "text" };
  } else if (input.mode === "image") {
    const base64 = await fileToBase64(input.imageFile);
    source = { type: "image", base64, mimeType: input.imageFile.type };
    dbSource = { platform: "image" };
  } else {
    throw new Error(`알 수 없는 입력 방식이에요: ${input.mode}`);
  }

  const pending = await addRecipe({
    status: "pending",
    source: dbSource,
    title: "레시피 만드는 중...",
    tags: [],
    ingredients: [],
    tools: [],
    stepGroups: [],
  });

  onStatus?.("레시피를 만들고 있어요...");

  try {
    const ai = await generateRecipeFromSource({ apiKey, source });
    const fields = normalizeAiRecipe(ai);
    return await updateRecipe(pending.id, { status: "done", error: undefined, ...fields });
  } catch (err) {
    await updateRecipe(pending.id, { status: "failed", error: err.message });
    throw err;
  }
}

// 실패한 레시피를 다시 만든다. 원본 텍스트/캡션/이미지는 저장해 두지 않으므로
// 링크(유튜브)가 있는 경우에만 다시 시도할 수 있다.
export async function retryRecipe(recipe) {
  if (recipe.source?.platform !== "youtube" || !recipe.source?.url) {
    throw new Error("홈 화면에서 다시 보내 주세요(캡션·텍스트·이미지는 다시 입력이 필요해요).");
  }

  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error("설정 화면에서 Gemini API 키를 먼저 저장해 주세요.");
  }

  const source = { type: "youtube", url: recipe.source.url };

  try {
    const ai = await generateRecipeFromSource({ apiKey, source });
    const fields = normalizeAiRecipe(ai);
    return await updateRecipe(recipe.id, { status: "done", error: undefined, ...fields });
  } catch (err) {
    await updateRecipe(recipe.id, { status: "failed", error: err.message });
    throw err;
  }
}
