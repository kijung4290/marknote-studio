export const FONT_FAMILIES = [
  { label: '기본 고딕 (SF / 맑은 고딕)', value: 'Malgun Gothic, Pretendard, sans-serif' },
  { label: '명조 / 바탕체', value: 'Nanum Myeongjo, Batang, Georgia, serif' },
  { label: '깔끔 돋움체', value: 'Dotum, Apple SD Gothic Neo, sans-serif' },
  { label: '궁서 / 붓글씨 느낌', value: 'Gungsuh, serif' },
  { label: '고정폭 코딩체', value: 'Consolas, D2Coding, Courier New, monospace' }
];

export const FONT_SIZES = [
  { label: '작게 (12px)', value: '12px' },
  { label: '조금 작게 (14px)', value: '14px' },
  { label: '기본 (16px)', value: '' },
  { label: '조금 크게 (18px)', value: '18px' },
  { label: '크게 (20px)', value: '20px' },
  { label: '아주 크게 (24px)', value: '24px' },
  { label: '특대 (28px)', value: '28px' },
  { label: '타이틀 (34px)', value: '34px' }
];

export const TEXT_COLORS = [
  { name: '기본 검정', color: '' },
  { name: '진회색', color: '#475569' },
  { name: '빨강 (강조)', color: '#e11d48' },
  { name: '주황', color: '#ea580c' },
  { name: '갈색/골드', color: '#b45309' },
  { name: '초록 (성공)', color: '#16a34a' },
  { name: '청록', color: '#0d9488' },
  { name: '파랑 (핵심)', color: '#2563eb' },
  { name: '남색', color: '#4f46e5' },
  { name: '보라', color: '#9333ea' },
  { name: '분홍', color: '#db2777' }
];

export const HIGHLIGHT_COLORS = [
  { name: '형광펜 없음', bg: '' },
  { name: '노란 형광펜', bg: '#fef08a' },
  { name: '연두 형광펜', bg: '#bbf7d0' },
  { name: '하늘 형광펜', bg: '#bae6fd' },
  { name: '분홍 형광펜', bg: '#fbcfe8' },
  { name: '연보라 형광펜', bg: '#e9d5ff' },
  { name: '살구 형광펜', bg: '#fed7aa' },
  { name: '은은한 회색', bg: '#e2e8f0' }
];

export const TEMPLATES = [
  {
    id: 'welcome',
    title: '✨ 마크다운 상하 체계 & 꾸미기 완벽 가이드',
    icon: '✨',
    description: '제목(H1~H6), 다단계 목록, 토글 접기/펼치기, 알림 박스, 키보드 배지 등 모든 마크다운 문법 요소를 체험하세요.',
    html: `
      <h1>✨ 마크다운(Markdown) 상하 체계와 꾸미기 가이드</h1>
      <p>마크다운은 단순히 <strong>큰 제목·중간 제목</strong>만 있는 것이 아니라, <strong>다단계 들여쓰기 목록, 접기/펼치기 토글, 5종 알림 박스, 인용구, 인라인 배지</strong> 등 문서를 입체적으로 구조화하는 다양한 문법을 제공합니다.</p>

      <div data-callout="tip" class="callout-box callout-tip">
        <p>💡 <strong>핵심 팁:</strong> 문법 기호를 외울 필요 없이 상단 캡슐 바의 <strong>[✨ 마크다운 꾸미기]</strong> 버튼을 누르면 모든 마크다운 요소를 클릭 한 번으로 넣을 수 있습니다.</p>
      </div>

      <h2>1. 상하 계층을 나누는 4가지 방법</h2>
      <h3>① 제목 단계 (<code># H1</code> ~ <code>###### H6</code>)</h3>
      <p>대제목(H1)부터 세부 제목(H6)까지 최대 6단계로 문서의 뼈대(목차)를 나눕니다.</p>

      <h3>② 다단계 들여쓰기 목록 (<code>-</code>, <code>1.</code> + <code>▸ 하위</code> / <code>◂ 상위</code>)</h3>
      <ul>
        <li><strong>1단계 상위 항목</strong> (툴바의 <code>▸</code> 버튼이나 <kbd>Tab</kbd> 키로 하위 단계로 내릴 수 있습니다)
          <ul>
            <li><strong>2단계 하위 세부 항목</strong> — 상위 항목 아래에 종속된 내용
              <ul>
                <li><strong>3단계 더 깊은 보충 설명</strong> (<kbd>Shift</kbd> + <kbd>Tab</kbd> 또는 <code>◂</code> 버튼으로 상위 복귀)</li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>

      <h3>③ 접기/펼치기 아코디언 토글 (<code>&lt;details&gt;</code>)</h3>
      <details class="md-details-toggle" open data-summary="▶ 클릭해서 하위 상세 내용 접기 / 펼치기 (노션 토글 스타일)">
        <summary class="md-details-summary">▶ 클릭해서 하위 상세 내용 접기 / 펼치기 (노션 토글 스타일)</summary>
        <div class="md-details-body">
          <p>길어지는 보충 설명이나 참고 자료는 이렇게 <strong>토글 블록</strong> 안에 넣어서 깔끔하게 상하를 구분해 접어둘 수 있습니다.</p>
        </div>
      </details>

      <h3>④ 인용구 &amp; 5종 마크다운 알림 박스 (GitHub Alerts)</h3>
      <div data-callout="info" class="callout-box callout-info">
        <p>ℹ️ <strong>[참고 NOTE]</strong> 일반적인 안내사항이나 배경 지식을 눈에 띄게 구분합니다.</p>
      </div>
      <div data-callout="important" class="callout-box callout-important">
        <p>📌 <strong>[중요 IMPORTANT]</strong> 독자가 절대 놓치면 안 되는 핵심 요구사항을 강조합니다.</p>
      </div>
      <div data-callout="warn" class="callout-box callout-warn">
        <p>⚠️ <strong>[주의 WARNING]</strong> 주의해야 할 사항이나 제한 조건을 안내합니다.</p>
      </div>

      <h2>2. 글자를 돋보이게 하는 마크다운 인라인 꾸미기</h2>
      <ul>
        <li>기본 강조: <strong>굵게(**Bold**)</strong>, <em>기울임(*Italic*)</em>, <u>밑줄(&lt;u&gt;)</u>, <s>취소선(~~Strike~~)</s></li>
        <li>단어 코드 배지: <code>중요 키워드</code>, <code>2026년 핵심사업</code> 처럼 단어에 배경 캡슐을 씌웁니다.</li>
        <li>키보드 단축키 배지: <kbd>Ctrl</kbd> + <kbd>S</kbd> (저장), <kbd>Ctrl</kbd> + <kbd>F</kbd> (찾기) 처럼 실제 키보드 버튼 모양으로 꾸밉니다.</li>
        <li>위 첨자 · 아래 첨자: 면적 100m<sup>2</sup>, 각주 표시<sup>[1]</sup>, 물 분자식 H<sub>2</sub>O 표현이 가능합니다.</li>
        <li>색상 &amp; 형광펜: <span data-color="#0071e3" style="color: #0071e3"><strong>애플 블루 포인트</strong></span>와 <mark data-bg="#fef08a" style="background-color: #fef08a;">노란색 형광펜 하이라이트</mark>를 자유롭게 조합하세요.</li>
      </ul>
    `
  },
  {
    id: 'blank',
    title: '📄 빈 노트',
    icon: '📄',
    description: '깨끗한 새 종이에서 바로 작성을 시작합니다.',
    html: '<h1>제목 없는 노트</h1><p></p>'
  },
  {
    id: 'meeting',
    title: '📋 회의록 템플릿',
    icon: '📋',
    description: '일시, 참석자, 안건, 결정 사항 및 후속 조치를 깔끔하게 정리합니다.',
    html: `
      <h1>📋 프로젝트 정기 회의록</h1>
      <div data-callout="info" class="callout-box callout-info">
        <p>📅 <strong>일시:</strong> ${new Date().toISOString().slice(0, 10)} &nbsp;|&nbsp; 📍 <strong>장소:</strong> 소회의실 &nbsp;|&nbsp; 👥 <strong>참석자:</strong> 홍길동, 김철수, 이영희</p>
      </div>
      <h2>1. 오늘의 핵심 안건</h2>
      <ol>
        <li>신규 프로그램 운영 계획 점검</li>
        <li>부서별 협조 요청 사항 공유</li>
        <li>다음 주 일정 및 역할 분담</li>
      </ol>
      <h2>2. 주요 논의 내용</h2>
      <table>
        <thead>
          <tr>
            <th>안건</th>
            <th>논의 내용</th>
            <th>결정 사항</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>안건 1</strong></td>
            <td>대상자 모집 홍보물 시안 검토</td>
            <td><mark data-bg="#bbf7d0" style="background-color: #bbf7d0;">금요일까지 최종 확정</mark></td>
          </tr>
          <tr>
            <td><strong>안건 2</strong></td>
            <td>예산 집행 내역 중간 점검</td>
            <td>추가 물품 구매 승인</td>
          </tr>
        </tbody>
      </table>
      <h2>3. 후속 조치 (Action Items)</h2>
      <ul data-type="taskList" class="task-list">
        <li data-type="taskItem" data-checked="false" class="task-item"><p>[홍길동] 홍보 포스터 수정본 공유 (~금요일)</p></li>
        <li data-type="taskItem" data-checked="false" class="task-item"><p>[김철수] 참가 신청 안내 링크 발송</p></li>
      </ul>
    `
  },
  {
    id: 'report',
    title: '📊 주간 업무 보고서',
    icon: '📊',
    description: '금주 실적, 차주 계획, 주요 이슈 사항을 한눈에 보기 쉽게 작성합니다.',
    html: `
      <h1>📊 주간 업무 보고서</h1>
      <p><span data-color="#475569" style="color: #475569">작성일: ${new Date().toISOString().slice(0, 10)} | 작성자: 담당자명</span></p>
      <hr />
      <h2>1. 금주 주요 추진 실적</h2>
      <ul>
        <li><strong>주요 사업 A:</strong> 진행률 <span data-color="#2563eb" style="color: #2563eb"><strong>90% 달성</strong></span> (점검 완료)</li>
        <li><strong>민원 및 상담 응대:</strong> 총 15건 완료, 후속 지원 3건 연계</li>
      </ul>
      <h2>2. 차주 추진 계획</h2>
      <ul data-type="taskList" class="task-list">
        <li data-type="taskItem" data-checked="false" class="task-item"><p>월간 성과 지표 취합 및 보고서 제출</p></li>
        <li data-type="taskItem" data-checked="false" class="task-item"><p>협력 기관 실무자 간담회 진행</p></li>
      </ul>
      <h2>3. 건의 및 협조 요청 사항</h2>
      <div data-callout="warn" class="callout-box callout-warn">
        <p>⚠️ 행사 당일 차량 지원 및 사진 촬영 인력 협조가 필요합니다.</p>
      </div>
    `
  },
  {
    id: 'blog',
    title: '✍️ 블로그 · 안내문 포스팅',
    icon: '✍️',
    description: '가독성 높은 소제목, 인용구, 이미지, 링크가 어우러진 안내문 양식입니다.',
    html: `
      <h1 style="text-align: center">✨ 독자의 눈길을 사로잡는 제목을 입력하세요</h1>
      <p style="text-align: center"><span data-color="#64748b" style="color: #64748b">부제목을 입력하거나 핵심 요약 문장을 적어보세요</span></p>
      <hr />
      <h2>💡 들어가며</h2>
      <p>여기에 도입부 내용을 자연스럽게 작성합니다. 중요한 핵심 키워드에는 <mark data-bg="#fef08a" style="background-color: #fef08a;">형광펜 하이라이트</mark>나 <span data-color="#e11d48" style="color: #e11d48"><strong>포인트 색상</strong></span>을 활용해 가독성을 높여보세요.</p>
      <blockquote>
        <p>"핵심 메시지나 기억에 남는 한 줄 인용구를 넣으면 글의 완성도가 높아집니다."</p>
      </blockquote>
      <h2>📌 주요 내용 정리</h2>
      <ol>
        <li><strong>첫 번째 포인트:</strong> 구체적인 설명과 예시를 덧붙입니다.</li>
        <li><strong>두 번째 포인트:</strong> 독자가 바로 따라 할 수 있는 팁을 소개합니다.</li>
      </ol>
      <div data-callout="tip" class="callout-box callout-tip">
        <p>✨ <strong>함께 보면 좋은 링크:</strong> <a href="https://example.com">관련 안내 페이지 바로가기</a></p>
      </div>
    `
  },
  {
    id: 'casenote',
    title: '🤝 상담 및 사례 기록지',
    icon: '🤝',
    description: '복지관·기관 상담 내용, 대상자 욕구, 개입 계획을 체계적으로 기록합니다.',
    html: `
      <h1>🤝 상담 및 사례관리 기록지</h1>
      <table>
        <thead>
          <tr>
            <th>상담 일자</th>
            <th>상담 구분</th>
            <th>대상자(사례명)</th>
            <th>담당자</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${new Date().toISOString().slice(0, 10)}</td>
            <td>방문상담 / 내방상담</td>
            <td>홍○○ 어르신</td>
            <td>담당 사회복지사</td>
          </tr>
        </tbody>
      </table>
      <h2>1. 대상자 주요 상황 및 진술</h2>
      <p>대상자의 현재 건강 상태, 생활 환경, 주요 호소 문제를 기록합니다.</p>
      <h2>2. 사정 및 개입 내용</h2>
      <ul>
        <li><mark data-bg="#bae6fd" style="background-color: #bae6fd;">즉시 지원 사항:</mark> 긴급 생필품 연계 및 안부 확인</li>
        <li><mark data-bg="#bbf7d0" style="background-color: #bbf7d0;">연계 계획:</mark> 지역 보건소 방문간호 서비스 의뢰</li>
      </ul>
      <h2>3. 향후 계획 (점검 체크리스트)</h2>
      <ul data-type="taskList" class="task-list">
        <li data-type="taskItem" data-checked="false" class="task-item"><p>차주 수요일 유선 모니터링 진행</p></li>
        <li data-type="taskItem" data-checked="false" class="task-item"><p>사례회의 안건 상정 및 슈퍼비전 요청</p></li>
      </ul>
    `
  }
];
