// 레시피 카드/콜라주에 쓸 썸네일 주소를 정한다.
import { extractYoutubeVideoId } from "./youtubeUrl.js";

export function getRecipeThumbnail(recipe) {
  if (recipe.source?.thumbnail) return recipe.source.thumbnail;

  if (recipe.source?.platform === "youtube" && recipe.source.url) {
    const videoId = extractYoutubeVideoId(recipe.source.url);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  return null;
}
