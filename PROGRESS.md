# 진행 기록

새 세션에서는 이 파일부터 읽고 이어서 진행한다.

---

## 2026-11-09
- 한 일: SPEC.md/CLAUDE.md 확인, 1차 개발 계획 승인(공식 문서 4건 확인: Gemini 브라우저 직접 호출, 유튜브 URL 분석 제한, 추천 모델 `gemini-3.6-flash`, Web Share Target). 작업 1번(프로젝트 뼈대) 완료: index.html, manifest.json(+임시 SVG 아이콘), css/style.css, 빈 service-worker.js, js/app.js, .gitignore, git 저장소 초기화. 로컬 정적 서버(Python http.server)로 모바일 화면(375×812) 확인, 콘솔 에러 없음, 서비스워커 activated 확인.
- 다음에 할 일: 계획의 2번 작업 — 하단 탭바(홈/레시피북/장보기/설정) + 화면 전환 만들기.
- 막힌 점: 없음. 참고: 이 PC에는 Node.js가 없어 로컬 미리보기는 Python `http.server`를 쓴다(`.claude/launch.json`에 설정됨). 아이콘은 임시 SVG라서 나중에 정식 아이콘으로 교체 필요.
- (같은 날 이어서) 작업 1번 커밋("프로젝트 뼈대 생성") 완료. 작업 2번(하단 탭바 + 화면 전환) 완료: `js/router.js`(해시 기반 라우터), `js/icons.js`(직접 그린 탭 아이콘 4종), `js/screens/{home,books,shopping,settings}.js`(자리만 있는 화면), 탭바 CSS 추가. 모바일 화면에서 4개 탭 전환·활성색 변경 확인.
- 다음에 할 일: 계획의 3번 작업 — 설정 화면에 Gemini API 키 입력(가려서 표시, localStorage 저장) 만들기.
- 막힌 점: 없음.
