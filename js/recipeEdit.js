// "편집" 버튼 → AI 대화로 레시피 고치기. SPEC.md 2-7(편집 화면)·4-4(편집 대화) 규칙을 따른다.
// 원본은 그대로 두고, 수정된 레시피를 새 레시피로 저장한다(parentId로 원본과 연결).
import { callGeminiJson } from "./geminiClient.js";
import { RECIPE_SCHEMA } from "./recipeAi.js";
import { normalizeAiRecipe } from "./recipeConvert.js";
import { addRecipe } from "./db.js";
import { INGREDIENT_CATEGORIES } from "./ingredientCategories.js";

// 저장된 레시피(ingredientIds로 재료를 가리킴)를 Gemini에 보낼 때는
// recipeAi.js가 쓰는 형식(ingredientNames)으로 바꿔서 보낸다.
function recipeToAiShape(recipe) {
  const ingredientsById = new Map((recipe.ingredients || []).map((ing) => [ing.id, ing]));
  return {
    title: recipe.title,
    summary: recipe.summary,
    timeMinutes: recipe.timeMinutes,
    servings: recipe.servings,
    tags: recipe.tags || [],
    nutrition: recipe.nutrition,
    ingredients: (recipe.ingredients || []).map(({ name, amount, unit, category }) => ({ name, amount, unit, category })),
    tools: (recipe.tools || []).map((t) => t.name),
    stepGroups: (recipe.stepGroups || []).map((group) => ({
      title: group.title,
      steps: (group.steps || []).map((step) => ({
        text: step.text,
        ingredientNames: (step.ingredientIds || []).map((id) => ingredientsById.get(id)?.name).filter(Boolean),
        tip: step.tip || "",
        highlights: step.highlights || [],
        timestampSec: step.timestampSec,
      })),
    })),
  };
}

function buildInstructions() {
  return [
    "너는 사용자의 레시피를 사용자 요청대로 고쳐주는 요리 도우미야. 아래 규칙을 반드시 지켜.",
    "1. 모든 내용은 한국어로 작성한다.",
    "2. 아래 '현재 레시피' 내용을 기준으로만 고친다. 사용자가 요청하지 않은 재료·분량·단계를 마음대로 지어내거나 빼지 않는다.",
    "3. 분량(인분)을 바꿔달라고 하면 재료 분량과 칼로리·영양 성분도 같은 비율로 같이 바꾼다.",
    "4. answer에는 무엇을 어떻게 바꿨는지 한두 문장으로 짧게 설명한다.",
    "5. recipe에는 수정된 레시피 전체를 원래와 같은 형식으로 빠짐없이 담는다(바뀌지 않은 부분도 그대로 포함한다).",
    `6. 재료마다 category는 다음 중 하나로 정확히 지정한다: ${INGREDIENT_CATEGORIES.join(", ")}`,
  ].join("\n");
}

const EDIT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    recipe: RECIPE_SCHEMA,
  },
  required: ["answer", "recipe"],
};

function assertValidEditResponse(data) {
  if (!data || typeof data.answer !== "string" || !data.recipe?.title || !Array.isArray(data.recipe?.ingredients) || !Array.isArray(data.recipe?.stepGroups)) {
    throw new Error("AI 응답 형식이 올바르지 않아요.");
  }
  return data;
}

// recipe: 현재 보고 있는 레시피(DB에 저장된 형태). message: 사용자 요청 텍스트.
// imageBase64/imageMimeType: 사진을 함께 첨부했을 때만 넘긴다(선택).
// 실패하면 SPEC 4-3과 같은 규칙으로 1회만 재시도한다.
export async function requestRecipeEdit({ apiKey, recipe, message, imageBase64, imageMimeType }) {
  const parts = [];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
  }
  parts.push({
    text: `${buildInstructions()}\n\n현재 레시피:\n${JSON.stringify(recipeToAiShape(recipe))}\n\n사용자 요청: ${message}`,
  });

  const call = () => callGeminiJson({ apiKey, parts, responseSchema: EDIT_RESPONSE_SCHEMA }).then(assertValidEditResponse);

  try {
    return await call();
  } catch {
    return await call();
  }
}

// AI가 돌려준 수정본을 새 레시피로 저장한다(원본은 그대로 둔다).
export async function saveEditedRecipe(originalRecipe, aiRecipe) {
  const fields = normalizeAiRecipe(aiRecipe);
  return addRecipe({
    status: "done",
    source: originalRecipe.source,
    parentId: originalRecipe.id,
    ...fields,
  });
}
