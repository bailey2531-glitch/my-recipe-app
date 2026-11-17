// 브라우저에서 Gemini API를 직접 호출하는 가장 기본적인 함수.
// SPEC.md 4-1: 1차는 프록시 서버 없이 브라우저가 직접 호출한다(키는 폰에만 저장).
// SPEC.md 4-3: 응답은 JSON 스키마를 지정한 구조화 출력으로 받는다.
import { GEMINI_MODEL } from "./config.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// 요청 내용(텍스트/유튜브 링크/이미지 등)을 보내고, 지정한 JSON 스키마 형태의 응답을 받는다.
// prompt(텍스트 한 덩어리) 또는 parts(텍스트+영상+이미지를 섞은 배열) 중 하나를 넘긴다.
export async function callGeminiJson({ apiKey, prompt, parts, responseSchema }) {
  const url = `${API_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contentParts = parts || [{ text: prompt }];

  // 네트워크가 끊기거나 응답이 멈추면 "생성 대기 중"에서 영원히 안 움직이니,
  // 60초가 지나면 실패로 처리해서 사용자가 다시 시도할 수 있게 한다.
  const timeoutMs = 60000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: contentParts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("응답이 너무 오래 걸려서 중단했어요(60초). 네트워크 상태를 확인하고 다시 시도해 주세요.");
    }
    throw new Error("네트워크 요청에 실패했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
  } finally {
    clearTimeout(timeoutId);
  }

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
