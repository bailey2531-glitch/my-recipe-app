// 하단 탭바용 아이콘. 참고 앱과 무관하게 직접 그린 단순 선 아이콘(SVG)이다.
export const TAB_ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11L12 4l8 7"/><path d="M6 10v9h12v-9"/></svg>`,
  books: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5z"/><path d="M20 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5z"/></svg>`,
  shopping: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18l-1.5 10.2a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8L3 9z"/><path d="M8 9 7 4"/><path d="M16 9l1-5"/><path d="M9 13v4"/><path d="M15 13v4"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>`,
};

// 홈 화면 입력창(컴포저)용 아이콘. 참고 화면의 로고를 그대로 쓰지 않고,
// 같은 뜻을 담은 단순한 선 아이콘을 직접 그렸다(재생·카메라·음표·지구본·사슬고리 등 흔한 기호).
export const SOURCE_ICONS = {
  youtube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10 9.3v5.4l5-2.7z" fill="currentColor" stroke="none"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="4"/><circle cx="12" cy="12" r="3.3"/><circle cx="16.5" cy="8.6" r="0.6" fill="currentColor" stroke="none"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17V5.5l8-1.5v9.5"/><circle cx="7.3" cy="17" r="2.3"/><circle cx="15.3" cy="15" r="2.3"/></svg>`,
  web: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1 1"/><path d="M14 10a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1"/></svg>`,
  text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.4"/><path d="M3 16l4.5-4.5 3 3L15 9l6 6"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/><path d="M9 21h6"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>`,
};

// "해먹었어요" 평가용 꽃 아이콘. 꽃잎 5장을 원으로 둘러 그린, 직접 만든 단순 도형이다(참고 앱의 이미지 아님).
export function flowerIcon(filled, size = 28) {
  const petalFill = filled ? "#FFC94A" : "#ffffff";
  const strokeColor = filled ? "#F2A900" : "#d8d8d8";
  const centerFill = filled ? "#F2A900" : "#e6e6e6";
  return `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <g fill="${petalFill}" stroke="${strokeColor}" stroke-width="1.3">
        <circle cx="12" cy="7" r="3.2" />
        <circle cx="16.76" cy="10.45" r="3.2" />
        <circle cx="14.94" cy="16.05" r="3.2" />
        <circle cx="9.06" cy="16.05" r="3.2" />
        <circle cx="7.24" cy="10.45" r="3.2" />
      </g>
      <circle cx="12" cy="12" r="2.4" fill="${centerFill}" />
    </svg>
  `;
}
