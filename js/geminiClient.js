// 브라우저에서 Gemini API를 직접 호출하는 가장 기본적인 함수.
// SPEC.md 4-1: 1차는 프록시 서버 없이 브라우저가 직접 호출한다(키는 폰에만 저장).
// SPEC.md 4-3: 응답은 JSON 스키마를 지정한 구조화 출력으로 받는다.
import { GEMINI_MODEL } from "./config.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// 텍스트 프롬프트를 보내고, 지정한 JSON 스키마 형태의 응답을 받는다.
export async function callGeminiJson({ apiKey, prompt, responseSchema }) {
  const url = `${API_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error?.message || `요청이 실패했어요 (상태 코드 ${res.status})`;
    if (res.status === 429) {
      throw new Error("사용 한도를 초과했어요. 잠시 뒤 다시 시도해 주세요.");
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error(`API 키를 확인해 주세요: ${message}`);
    }
    throw new Error(message);
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini가 빈 응답을 보냈어요.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini 응답을 JSON으로 읽지 못했어요.");
  }
}

// 설정 화면의 "연결 테스트" 버튼에서 쓰는 가장 단순한 호출 테스트.
export async function testGeminiConnection(apiKey) {
  return callGeminiJson({
    apiKey,
    prompt: "연결 테스트입니다. ok 필드에 true, message 필드에 한국어로 짧은 인사말을 담아 응답하세요.",
    responseSchema: {
      type: "object",
      properties: {
        ok: { type: "boolean" },
        message: { type: "string" },
      },
      required: ["ok", "message"],
    },
  });
}
