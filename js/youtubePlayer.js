// 유튜브 IFrame Player API를 불러와 플레이어를 만든다.
// 조리 순서의 "▶ 1:23" 버튼을 누르면 이 플레이어의 재생 위치를 옮긴다.
let apiReadyPromise = null;

function loadApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return apiReadyPromise;
}

// elementId 자리에 플레이어를 만들고, 준비되면 player 객체를 돌려준다.
export async function createYoutubePlayer(elementId, videoId) {
  await loadApi();
  return new Promise((resolve) => {
    const player = new window.YT.Player(elementId, {
      videoId,
      playerVars: { rel: 0 },
      events: {
        onReady: () => resolve(player),
      },
    });
  });
}

export function seekTo(player, seconds) {
  if (!player) return;
  player.seekTo(seconds, true);
  player.playVideo();
}
