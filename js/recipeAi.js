// 영상/캡션/텍스트/이미지를 Gemini에 보내 레시피 JSON으로 바꾸는 함수.
// 규칙은 SPEC.md 4-2(입력별 처리), 4-3(출력 형식)을 그대로 따른다.
import { callGeminiJson } from "./geminiClient.js";
import { INGREDIENT_CATEGORIES } from "./ingredientCategories.js";

const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    timeMinutes: { type: "integer" },
    servings: { type: "integer" },
    tags: { type: "array", items: { type: "string" } },
    nutrition: {
      type: "object",
      properties: {
        kcal: { type: "integer" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
      },
      required: ["kcal", "protein", "carbs", "fat"],
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          amount: { type: "string" }, // "적당량"처럼 문자열도 허용
          unit: { type: "string" },
          category: { type: "string", enum: INGREDIENT_CATEGORIES },
        },
        required: ["name", "amount", "category"],
      },
    },
    tools: { type: "array", items: { type: "string" } },
    stepGroups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                ingredientNames: { type: "array", items: { type: "string" } },
                tip: { type: "string" },
                highlights: { type: "array", items: { type: "string" } },
                timestampSec: { type: "integer" },
              },
              required: ["text"],
            },
          },
        },
        required: ["title", "steps"],
      },
    },
  },
  required: ["title", "summary", "timeMinutes", "servings", "tags", "nutrition", "ingredients", "tools", "stepGroups"],
};

function buildInstructions(canHaveTimestamp) {
  return [
    "너는 요리 영상·글을 분석해서 한국어 레시피로 정리하는 도우미야. 아래 규칙을 반드시 지켜.",
    "1. 모든 내용은 한국어로 작성한다.",
    "2. 원본에 없는 재료, 분량, 팁을 지어내지 않는다. 분량을 모르면 amount에 \"적당량\"이라고 쓴다.",
    "3. tip은 원본에서 실제로 강조한 요령만 담는다. 강조한 내용이 없으면 빈 문자열로 둔다.",
    "4. 조리 순서는 2~4개의 큰 단계(stepGroups)로 묶고, 각 큰 단계에 짧은 제목을 단다.",
    `5. 재료마다 category를 다음 중 하나로 정확히 지정한다: ${INGREDIENT_CATEGORIES.join(", ")}`,
    "6. 조리에 쓰는 도구(키친타월, 프라이팬 등)는 tools 목록과 해당 단계의 highlights에 넣는다.",
    "7. 칼로리·영양 성분은 1인분 기준 추정치로 계산한다.",
    canHaveTimestamp
      ? "8. 영상에서 각 단계가 시작하는 시간을 알 수 있으면 timestampSec(초)을 넣는다. 모르면 비운다."
      : "8. 원본에 영상 시간 정보가 없으니 timestampSec은 비워둔다.",
  ].join("\n");
}

// source: { type: 'youtube', url } | { type: 'caption'|'text', text } | { type: 'image', base64, mimeType }
function buildParts(source) {
  const instructions = buildInstructions(source.type === "youtube");

  switch (source.type) {
    case "youtube":
      return [
        { fileData: { fileUri: source.url } },
        { text: `${instructions}\n\n위 유튜브 요리 영상을 분석해서 레시피 JSON으로 만들어줘.` },
      ];
    case "caption": {
      const hasImage = Boolean(source.base64);
      const hasText = Boolean(source.text);
      const captionDesc = hasImage && hasText ? "캡션(설명글)과 캡션을 캡처한 사진" : hasImage ? "캡션을 캡처한 사진" : "캡션(설명글)";
      const parts = [];
      if (hasImage) {
        parts.push({ inlineData: { mimeType: source.mimeType, data: source.base64 } });
      }
      parts.push({
        text: `${instructions}\n\n아래는 인스타그램/틱톡 게시물의 ${captionDesc}이야. 이 내용만 근거로 레시피 JSON을 만들어줘. 여기 없는 내용은 지어내지 말고 비워둬.${hasText ? `\n\n---\n${source.text}` : ""}`,
      });
      return parts;
    }
    case "text":
      return [{ text: `${instructions}\n\n아래 글을 분석해서 레시피 JSON으로 만들어줘.\n\n---\n${source.text}` }];
    case "image":
      return [
        { inlineData: { mimeType: source.mimeType, data: source.base64 } },
        { text: `${instructions}\n\n위 이미지(레시피 캡처 또는 사진)를 분석해서 레시피 JSON으로 만들어줘.` },
      ];
    default:
      throw new Error(`알 수 없는 입력 종류예요: ${source.type}`);
  }
}

function assertValidRecipeJson(data) {
  if (!data || typeof data !== "object" || !data.title || !Array.isArray(data.ingredients) || !Array.isArray(data.stepGroups)) {
    throw new Error("필수 항목(제목/재료/조리순서)이 빠진 응답이에요.");
  }
  return data;
}

// Gemini를 호출해 레시피 JSON을 받는다. 실패하면 SPEC 4-3 규칙대로 1회만 재시도한다.
export async function generateRecipeFromSource({ apiKey, source }) {
  const parts = buildParts(source);
  const call = () => callGeminiJson({ apiKey, parts, responseSchema: RECIPE_SCHEMA }).then(assertValidRecipeJson);

  try {
    return await call();
  } catch {
    return await call(); // 1회 재시도. 여기서도 실패하면 원래 에러가 호출한 쪽으로 올라간다.
  }
}
