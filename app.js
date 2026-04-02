// ===== REDUCED MOTION TOGGLE =====
function toggleReducedMotion(checked) {
  if (checked) {
    document.body.classList.add('reduced-motion');
  } else {
    document.body.classList.remove('reduced-motion');
  }
}

// ===== UTILITY =====
function activateOnEnterSpace(event, callback) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
}
function announce(message) {
  var el = document.getElementById('liveAnnouncer');
  el.textContent = '';
  requestAnimationFrame(function() { el.textContent = message; });
}

// ===== STATE =====
var state = {
  selectedRoles: new Set(),
  completedSims: new Set(),
  checkedItems: new Set(),
  quizAnswered: 0,
  quizCorrect: 0,
  badges: new Set()
};

var simTriggerElement = null;

var roleColors = { pm:'#1a5276', designer:'#e67e22', dev:'#27ae60', content:'#8e44ad', qa:'#e74c3c', visual:'#2980b9', operation:'#d35400', cognitive:'#8e44ad', technical:'#27ae60' };
var roleNames = { pm:'統籌', designer:'設計', dev:'工程', content:'內容', qa:'測試', visual:'視覺', operation:'操作', cognitive:'認知', technical:'技術' };

// ===== PHASE DATA =====
var phases = [
  { name:'規劃階段', color:'var(--primary)', description:'在動手之前，先建立團隊共識、盤點現有網站的無障礙問題、定義目標等級（WCAG 2.2 AA）。',
    tasks:[{text:'執行現有網站無障礙審計（使用 axe、Lighthouse 等工具）',roles:['qa','dev']},{text:'整理審計報告，列出優先修復項目',roles:['pm','qa']},{text:'訪談身心障礙使用者或團體，收集真實需求',roles:['pm','designer']},{text:'制定無障礙目標（例：WCAG 2.2 AA 全面符合）',roles:['pm']},{text:'建立專案時程表，納入各階段無障礙檢查點',roles:['pm']},{text:'安排團隊無障礙培訓工作坊',roles:['pm']},{text:'盤點現有內容的替代文字、字幕覆蓋率',roles:['content','qa']}],
    testing:['使用 Lighthouse、axe DevTools 掃描現有網站','用螢幕閱讀器（NVDA / VoiceOver）試用現有網站','記錄所有無法靠鍵盤操作的功能']},
  { name:'設計階段', color:'var(--accent)', description:'將無障礙需求融入設計系統。確保每個元件從一開始就考慮到多元使用者。',
    tasks:[{text:'建立色彩系統，確保所有前景/背景組合的對比度 \u2265 4.5:1',roles:['designer']},{text:'設定最小字級 16px，行高 \u2265 1.5 倍',roles:['designer']},{text:'設計觸控目標最小 44\u00d744px',roles:['designer']},{text:'為所有互動元件設計焦點狀態（focus state）',roles:['designer']},{text:'確保焦點元件不被其他內容遮擋（WCAG 2.2 新增 2.4.11）',roles:['designer']},{text:'建立錯誤提示的多重管道：顏色 + 圖示 + 文字',roles:['designer']},{text:'拖曳操作提供替代方式（WCAG 2.2 新增 2.5.7）',roles:['designer']},{text:'製作線框稿並標註語意結構（heading hierarchy）',roles:['designer']},{text:'使用者測試：邀請身心障礙者參與原型測試',roles:['designer','pm']},{text:'撰寫設計交付文件，包含無障礙規格',roles:['designer']}],
    testing:['使用 Colour Contrast Analyser 驗證所有色彩組合','在設計稿上標註 heading 層級，確認符合邏輯','用 Figma 的 A11y 插件檢查設計稿','模擬灰階模式，確認不依賴顏色傳達資訊']},
  { name:'開發階段', color:'#27ae60', description:'將設計轉化為語意正確、鍵盤可操作、螢幕閱讀器友善的程式碼。',
    tasks:[{text:'使用語意 HTML 標籤（nav, main, article, aside, header, footer）',roles:['dev']},{text:'所有圖片加上有意義的 alt 文字',roles:['dev','content']},{text:'表單元素正確綁定 label',roles:['dev']},{text:'實作鍵盤導航：Tab 順序合理、可見焦點指示',roles:['dev']},{text:'確保所有互動元件有正確的 ARIA role 和 state',roles:['dev']},{text:'影片加上字幕、音訊加上文字稿',roles:['content','dev']},{text:'設定 CI/CD 加入 axe-core 自動測試',roles:['dev']},{text:'實作跳過導航（skip navigation）連結',roles:['dev']},{text:'確保頁面在 200% 放大下仍可使用',roles:['dev']},{text:'幫助資訊在各頁面位置一致（WCAG 2.2 新增 3.2.6）',roles:['dev','content']},{text:'驗證不要求使用者重複輸入已提供的資訊（WCAG 2.2 新增 3.3.7）',roles:['dev']},{text:'登入流程提供非認知功能測試的替代方式（WCAG 2.2 新增 3.3.8）',roles:['dev']},{text:'撰寫替代文字指南供內容團隊使用',roles:['content']}],
    testing:['每次 PR 執行 axe-core 自動掃描','手動鍵盤測試所有互動元件','使用 NVDA / VoiceOver 測試表單流程','在行動裝置上測試觸控目標大小']},
  { name:'測試階段', color:'#8e44ad', description:'系統性地驗證所有頁面與功能的無障礙合規性。結合自動與手動測試。',
    tasks:[{text:'執行全站 axe / Lighthouse 自動掃描',roles:['qa','dev']},{text:'每頁手動鍵盤導航測試',roles:['qa']},{text:'使用 NVDA（Windows）+ VoiceOver（macOS/iOS）測試',roles:['qa']},{text:'在 Android TalkBack 上測試',roles:['qa']},{text:'測試所有表單的錯誤處理與提示',roles:['qa']},{text:'驗證色彩對比（前景/背景、大字/小字）',roles:['qa','designer']},{text:'測試頁面 200% 放大的排版',roles:['qa']},{text:'邀請身心障礙使用者進行真人測試',roles:['pm','qa']},{text:'整理缺陷清單並排定修復優先順序',roles:['qa','pm']},{text:'回歸測試修復後的項目',roles:['qa']}],
    testing:['建立測試矩陣：頁面 \u00d7 瀏覽器 \u00d7 輔助科技','記錄每個缺陷的 WCAG 違反條款','驗證所有 Critical / Major 問題已修復','產出無障礙測試報告']},
  { name:'上線階段', color:'#e74c3c', description:'最終驗收後部署上線，建立持續監控與改善機制。',
    tasks:[{text:'最終無障礙驗收測試',roles:['qa','pm']},{text:'撰寫無障礙聲明頁（Accessibility Statement）',roles:['content','pm']},{text:'建立使用者回饋管道（無障礙問題回報）',roles:['dev','pm']},{text:'上線前 Lighthouse 分數確認 \u2265 90',roles:['dev','qa']},{text:'部署後即時監控：檢查關鍵頁面是否正常',roles:['dev']},{text:'制定持續維護計畫：定期掃描、季度審計',roles:['pm']},{text:'建立新內容發布的無障礙檢查 SOP',roles:['content','pm']}],
    testing:['上線後 24 小時內完整掃描一次','確認無障礙聲明頁可被找到且內容正確','驗證回饋管道本身也是無障礙的']}
];

// ===== QUIZ DATA =====
var quizData = [
  {q:'你的同事用紅色標示「必填」欄位。這樣做有什麼問題？',opts:['紅色太刺眼，應該用橘色','色覺障礙者可能完全看不出來哪些是必填的','沒有問題，紅色是通用的錯誤色','應該用藍色，因為藍色是最安全的顏色'],correct:1,explain:'約 8% 的男性有色覺異常。只靠顏色傳達「必填」的資訊，對他們來說等於沒標。應該同時用文字（如「*必填」）或圖示來標示。'},
  {q:'以下何者是「臨時障礙」的例子？',opts:['先天性色覺異常','手臂骨折打石膏，只能單手操作','永久性聽力損失','學習障礙'],correct:1,explain:'臨時障礙是指暫時性的身體限制，如骨折、眼睛手術後、嘈雜環境等。無障礙設計幫助的不只是永久障礙者——每個人都可能成為臨時障礙者。'},
  {q:'PM 說「無障礙下一版再做」，以下哪個理由最有說服力？',opts:['這是法律要求，不做會被罰','後面補做的成本是一開始就做的 10 倍以上','無障礙很重要，我們應該有社會責任感','反正也沒有身障使用者會用我們的產品'],correct:1,explain:'根據業界經驗，事後修復無障礙問題的成本遠高於從一開始就考慮。就像蓋房子——地基歪了，裝潢再好也沒用。而且你不知道有多少人因為用不了而直接離開了。'},
  {q:'你的網站有一張數據圖表。以下哪個 alt text 最好？',opts:['「圖表」','「銷售數據圖表」','「2024 年 Q1-Q4 銷售額：Q1 120萬、Q2 150萬、Q3 180萬、Q4 200萬，整年成長 67%」','留空（alt=""），因為圖表太複雜'],correct:2,explain:'好的 alt text 要傳達圖片「想說什麼」，不只是「這是什麼」。視障使用者需要知道圖表的結論和關鍵數據，而不只是「這裡有一張圖表」。'},
  {q:'以下哪項測試是 AI 和自動化工具「無法」完成的？',opts:['檢查色彩對比度是否足夠','判斷一段文案是否讓焦慮症使用者感到壓力','偵測表單是否缺少 label','掃描網站是否有缺少 alt 的圖片'],correct:1,explain:'自動化工具只能偵測約 30-40% 的無障礙問題（技術面的）。「這個流程讓人焦慮嗎」「這段文案夠清楚嗎」——這些需要人的感知力，AI 無法判斷。'},
  {q:'什麼是「鍵盤陷阱」？',opts:['鍵盤的按鍵卡住了','焦點進入某個元件後，無法用鍵盤離開','一種防止使用者離開頁面的安全設計','鍵盤快捷鍵太多，使用者記不住'],correct:1,explain:'鍵盤陷阱是指使用者的焦點被困在某個元件中（常見於彈窗、嵌入影片），按 Tab 或 Esc 都離不開。對鍵盤使用者來說，這等於整個網站壞掉了。'},
  {q:'設計師做了一個很酷的 tooltip，滑鼠移上去才會顯示重要資訊。這有什麼問題？',opts:['tooltip 太慢，應該用 alert','手機使用者和鍵盤使用者無法觸發 hover','tooltip 的字太小','沒有問題，tooltip 是標準的 UI 元件'],correct:1,explain:'hover 是滑鼠專屬的操作。手機使用者（觸控螢幕沒有 hover）和鍵盤使用者都無法看到這個資訊。重要資訊不應該藏在 hover 裡。'},
  {q:'你的網站自動播放一段背景影片。從無障礙角度來看，最大的問題是什麼？',opts:['影片會減慢網站載入速度','前庭障礙（vestibular disorder）使用者可能會感到頭暈或噁心','影片的畫質可能不夠好','使用者可能不喜歡背景影片的內容'],correct:1,explain:'自動播放的動態內容可能觸發前庭障礙使用者的不適反應（頭暈、噁心）。應尊重使用者的 prefers-reduced-motion 設定，並提供暫停按鈕。'},
  {q:'一個「一鍵合規」的無障礙覆蓋層產品宣稱能自動修復所有問題。你應該？',opts:['馬上購買，省時省力','先試用免費版看看效果','不要相信——這類產品已導致多起訴訟，而且 AI agent 會直接跳過覆蓋層','問問同事有沒有人用過'],correct:2,explain:'AccessiBe（FTC 罰款 100 萬美金）和 UserWay（集體訴訟）都是覆蓋層產品。它們只修表面，不修底層。AI agent 讀的是 accessibility tree，覆蓋層的 JS 修飾完全被跳過。'},
  {q:'你發現網站上某個功能用鍵盤操作起來很彆扭，但用滑鼠完全正常。你會？',opts:['記錄為 bug，因為鍵盤使用者無法正常操作','忽略它，大多數人用滑鼠','加一行提示：「建議使用滑鼠操作」','等 QA 提出來再處理'],correct:0,explain:'鍵盤操作不順暢就是 bug。數百至千萬人依賴鍵盤操作網站。而且你自己在手受傷、用平板外接鍵盤、或者單純偏好鍵盤的時候，也會遇到一樣的問題。'},
  {q:'客戶要求登入頁面加一個「請輸入圖片中的文字」驗證碼。你會怎麼建議？',opts:['好的，這是標準的安全做法','建議改用不需要認知測試的方式，如 passkey 或簡訊驗證','加大驗證碼的字體就好','提供一個音訊版本的驗證碼作為替代'],correct:1,explain:'圖形驗證碼對視障者、認知障礙者、老年人都是巨大的障礙。WCAG 2.2 明確要求登入流程不得依賴認知功能測試。Passkey、簡訊驗證、WebAuthn 都是更好的替代方案。'},
  {q:'你的網站在手機上看起來很正常，但有使用者抱怨「按鈕太小，一直按錯」。最可能的原因是？',opts:['使用者的手機螢幕太小','按鈕的觸控目標不夠大（小於 44x44 像素）','使用者不太會用手機','手機的觸控螢幕壞了'],correct:1,explain:'按鈕看起來大小正常，但實際的可觸控區域可能很小。手指不是滑鼠游標——它沒有精確的像素級定位。建議觸控目標至少 44x44 像素，對手抖的人、老年人、大拇指操作的人都更友善。'}
];

// ===== NAVIGATION (ARIA tabs) =====
function showSection(id, skipScroll) {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById('sec-' + id).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(function(t) {
    var isActive = t.id === 'tab-' + id;
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isTablistMode) {
      t.tabIndex = isActive ? 0 : -1;
    }
  });
  updateJourneyStepper(id);
  history.replaceState(null, '', '#' + id);
  if (!skipScroll) {
    var nav = document.getElementById('site-nav');
    if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ===== JOURNEY PROGRESS =====
var journeyVisited = new Set(['why']);

function updateJourneyStepper(activeId) {
  journeyVisited.add(activeId);
  document.querySelectorAll('.nav-tab[data-journey]').forEach(function(tab) {
    var id = tab.dataset.journey;
    tab.classList.remove('completed');
    if (id !== activeId && journeyVisited.has(id) && isJourneyStepDone(id)) {
      tab.classList.add('completed');
      tab.querySelector('.step-num').textContent = '\u2713';
    } else if (!tab.classList.contains('completed')) {
      var idx = ['why','roles','empathy','quiz','checklist','phases'].indexOf(id);
      tab.querySelector('.step-num').textContent = idx + 1;
    }
  });
}

function isJourneyStepDone(id) {
  switch (id) {
    case 'why': return journeyVisited.has('why');
    case 'roles': return state.selectedRoles.size > 0;
    case 'empathy': return state.completedSims.size >= 1;
    case 'quiz': return state.quizAnswered > 0;
    case 'phases': return journeyVisited.has('phases');
    case 'checklist': return state.checkedItems.size > 0;
    default: return false;
  }
}

// ===== NAV MODE TOGGLE =====
var isTablistMode = false;

function toggleTablistMode(enabled) {
  isTablistMode = enabled;
  var container = document.getElementById('navTabs');
  var tabs = Array.from(container.querySelectorAll('.nav-tab'));

  if (enabled) {
    container.setAttribute('role', 'tablist');
    tabs.forEach(function(tab) {
      tab.setAttribute('role', 'tab');
      var isActive = tab.getAttribute('aria-selected') === 'true';
      tab.tabIndex = isActive ? 0 : -1;
    });
  } else {
    container.removeAttribute('role');
    tabs.forEach(function(tab) {
      tab.removeAttribute('role');
      tab.tabIndex = 0;
    });
  }
  announce(enabled ? '已切換為 Tablist 模式：用方向鍵切換，Tab 只停一次' : '已切換為 Nav 模式：Tab 逐一經過每個選項');
}

document.addEventListener('DOMContentLoaded', function() {
  var container = document.getElementById('navTabs');
  if (!container) return;

  // Arrow key navigation (works in tablist mode only)
  container.addEventListener('keydown', function(e) {
    if (!isTablistMode) return;
    var tabs = Array.from(container.querySelectorAll('.nav-tab'));
    var idx = tabs.indexOf(document.activeElement);
    if (idx === -1) return;
    var newIdx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') newIdx = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') newIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') newIdx = 0;
    else if (e.key === 'End') newIdx = tabs.length - 1;
    else return;
    e.preventDefault();
    tabs[newIdx].focus();
    showSection(tabs[newIdx].id.replace('tab-', ''));
  });
});

// ===== ROLES =====
var roleMirrors = {
  pm: {
    title: '專案統籌',
    decisions: [
      '你排的優先序，決定了無障礙會不會被「下一版再做」砍掉',
      '你寫的需求文件，如果沒提到鍵盤操作，工程師不會主動做',
      '你選的上線日期，決定了團隊有沒有時間跑螢幕閱讀器測試',
      '你核准的設計稿，如果對比度不夠，最後被告的是公司'
    ],
    action: '你不需要懂技術細節，但你需要問一句：「這個對螢幕閱讀器使用者也能用嗎？」——光是這個問題就能改變整個團隊的意識。'
  },
  designer: {
    title: '設計',
    decisions: [
      '你選的顏色，決定了 3 億色覺障礙者能不能分辨錯誤和成功',
      '你設計的按鈕大小，決定了手抖的人點不點得到',
      '你畫的焦點狀態（或沒畫），決定了鍵盤使用者知不知道自己在哪',
      '你用的字型和行距，決定了閱讀障礙者能不能讀完一段話'
    ],
    action: '下次出設計稿前，花 2 分鐘用灰階模式看一次、用鍵盤 Tab 一次。這兩件事能攔下 80% 的問題。'
  },
  dev: {
    title: '工程開發',
    decisions: [
      '你寫 div 還是 button，決定了螢幕閱讀器看不看得到這個元素',
      '你加的 alt text，決定了視障者知不知道圖片在說什麼',
      '你綁的 label，決定了語音控制使用者能不能操作表單',
      '你處理焦點的方式，決定了鍵盤使用者會不會被困在某個元件裡'
    ],
    action: '你已經在寫 HTML 了——寫對的 HTML 不會比寫錯的多花多少時間。差別只在知不知道哪些標籤有語意。'
  },
  content: {
    title: '內容',
    decisions: [
      '你寫的標題層級，決定了螢幕閱讀器使用者能不能快速跳到想看的段落',
      '你用的專業術語，決定了認知障礙者能不能理解你的內容',
      '你上傳的影片有沒有字幕，決定了聾人能不能獲取資訊',
      '你寫的連結文字「點這裡」，讓螢幕閱讀器使用者完全不知道點了會去哪'
    ],
    action: '下次寫完一段文案，讀出來聽聽——如果用「聽」的也能理解，就是好的無障礙內容。'
  },
  qa: {
    title: '測試驗證',
    decisions: [
      '你的測試矩陣如果沒有「鍵盤操作」這一列，沒有人會測它',
      '你跑的自動掃描只能抓到 30-40%，剩下的只有你手動測才會發現',
      '你回報 bug 時寫的「在某個情況下無法操作」，是身障使用者每天的日常',
      '你判斷「這個不是 bug」的標準，如果沒考慮輔助技術，就是在替排除背書'
    ],
    action: '在你的測試流程裡加一步：每次測完用滑鼠操作後，把滑鼠收起來，用鍵盤再走一遍同樣的流程。'
  }
};

function toggleRole(role) {
  if (state.selectedRoles.has(role)) state.selectedRoles.delete(role);
  else state.selectedRoles.add(role);
  var isSelected = state.selectedRoles.has(role);
  document.querySelectorAll('.role-card').forEach(function(c) {
    c.setAttribute('aria-pressed', state.selectedRoles.has(c.dataset.role) ? 'true' : 'false');
  });
  document.querySelectorAll('#roleSelectorPills .filter-pill').forEach(function(p) {
    p.setAttribute('aria-pressed', state.selectedRoles.has(p.dataset.role) ? 'true' : 'false');
  });
  if (state.selectedRoles.size > 0) earnBadge('role-selected');
  renderChecklistFilters();
  updateRoleMirror();
  updateProgress();
  updateJourneyStepper('roles');
  announce(isSelected ? roleNames[role] + ' 已選擇' : roleNames[role] + ' 已取消');
}

function updateRoleMirror() {
  var mirror = document.getElementById('roleMirror');
  if (!mirror) return;
  var selected = Array.from(state.selectedRoles);
  if (selected.length === 0) { mirror.style.display = 'none'; return; }
  mirror.textContent = '';
  selected.forEach(function(role) {
    var info = roleMirrors[role];
    if (!info) return;
    var section = document.createElement('div');
    section.style.marginBottom = '16px';
    var h4 = document.createElement('h4');
    h4.style.cssText = 'margin-bottom:8px;color:var(--primary);';
    h4.textContent = info.title + '：你每天在做的無障礙決定';
    section.appendChild(h4);
    var ul = document.createElement('ul');
    ul.style.cssText = 'margin:0 0 8px 20px;font-size:0.88rem;line-height:1.7;';
    info.decisions.forEach(function(d) {
      var li = document.createElement('li');
      li.textContent = d;
      ul.appendChild(li);
    });
    section.appendChild(ul);
    var actionBox = document.createElement('div');
    actionBox.style.cssText = 'padding:8px 12px;background:var(--card-bg);border-radius:8px;font-size:0.85rem;';
    var strong = document.createElement('strong');
    strong.textContent = '你可以做的一件事：';
    actionBox.appendChild(strong);
    actionBox.appendChild(document.createTextNode(info.action));
    section.appendChild(actionBox);
    mirror.appendChild(section);
  });
  mirror.style.display = 'block';
}

// ===== PHASES =====
function showPhaseDetail(idx) {
  var phase = phases[idx];
  var detail = document.getElementById('phaseDetail');
  var overview = document.getElementById('phaseOverview');
  var tasksHTML = phase.tasks.map(function(t, i) {
    var roleTags = t.roles.map(function(r) {
      return '<span class="check-role-tag" style="background:' + roleColors[r] + '20;color:' + roleColors[r] + ';">' + roleNames[r] + '</span>';
    }).join('');
    var highlight = state.selectedRoles.size === 0 || t.roles.some(function(r) { return state.selectedRoles.has(r); });
    return '<li style="opacity:' + (highlight ? 1 : 0.4) + '"><span style="color:var(--text-light);font-size:0.8rem;min-width:20px;">' + (i+1) + '.</span><span class="check-text">' + t.text + ' ' + roleTags + '</span></li>';
  }).join('');
  var testHTML = phase.testing.map(function(t) {
    return '<li style="padding:8px 0;border-bottom:1px solid var(--border);font-size:0.92rem;">' + t + '</li>';
  }).join('');
  detail.textContent = '';
  detail.insertAdjacentHTML('beforeend',
    '<button class="back-btn" onclick="backToPhases()"><span aria-hidden="true">&larr;</span> 返回階段總覽</button>' +
    '<div class="card" style="border-left:4px solid ' + phase.color + ';"><h3>' + phase.name + '</h3><p style="margin:8px 0 16px;">' + phase.description + '</p><h4 style="font-weight:600;margin-bottom:8px;">任務清單</h4><ul class="checklist" style="margin-bottom:20px;">' + tasksHTML + '</ul><h4 style="font-weight:600;margin-bottom:8px;">本階段測試重點</h4><ul style="list-style:none;padding:0;">' + testHTML + '</ul></div>'
  );
  overview.style.display = 'none';
  detail.classList.add('active');
  detail.querySelector('.back-btn').focus();
}

function backToPhases() {
  document.getElementById('phaseOverview').style.display = 'block';
  document.getElementById('phaseDetail').classList.remove('active');
}

// ===== IMMERSIVE SIMULATION ENGINE =====
var immersiveSim = {
  active: null,
  intervals: [],
  listeners: [],
  elements: [],
  timeout: null,
  originalBodyFilter: '',
  originalBodyCursor: '',

  start: function(type, config) {
    if (this.active) this.stop();
    this.active = type;
    this.originalBodyFilter = document.body.style.filter;
    this.originalBodyCursor = document.body.style.cursor;

    var dialog = document.getElementById('simDialog');
    if (dialog.open) dialog.close();

    var panel = document.getElementById('simControlPanel');
    panel.classList.add('active');
    document.getElementById('simControlTitle').textContent = config.title;
    document.getElementById('simControlChallenge').textContent = config.challenge;

    var sliderContainer = document.getElementById('simControlSlider');
    if (config.hasSlider) {
      sliderContainer.style.display = 'block';
      var slider = document.getElementById('simIntensity');
      slider.value = config.sliderDefault || 50;
      slider.oninput = config.onSliderChange || null;
      if (config.onSliderChange) config.onSliderChange({ target: slider });
    } else {
      sliderContainer.style.display = 'none';
    }

    var modesContainer = document.getElementById('simControlModes');
    if (config.modes) {
      modesContainer.style.display = 'block';
      modesContainer.textContent = '';
      modesContainer.className = 'sim-mode-btns';
      config.modes.forEach(function(mode, i) {
        var btn = document.createElement('button');
        btn.className = 'sim-mode-btn' + (i === 0 ? ' active' : '');
        btn.textContent = mode.label;
        btn.addEventListener('click', function() {
          modesContainer.querySelectorAll('.sim-mode-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          mode.activate();
        });
        modesContainer.appendChild(btn);
      });
    } else {
      modesContainer.style.display = 'none';
    }

    if (config.apply) config.apply();

    this.timeout = setTimeout(function() {
      announce('模擬已自動停止（3 分鐘時間到）');
      immersiveSim.stop();
    }, 180000);

    var escHandler = function(e) {
      if (e.key === 'Escape' && immersiveSim.active) {
        e.preventDefault();
        immersiveSim.stop();
      }
    };
    document.addEventListener('keydown', escHandler);
    this.listeners.push({ el: document, event: 'keydown', fn: escHandler, capture: false });

    document.body.classList.add('sim-running');
    // Flash control panel to draw attention
    panel.style.animation = 'none';
    panel.offsetHeight; // force reflow
    panel.style.animation = 'panelFlash 0.6s ease 2';
    announce(config.title + ' 已啟動。' + config.challenge);
  },

  addInterval: function(id) { this.intervals.push(id); },
  addElement: function(el) { this.elements.push(el); },
  addListener: function(el, event, fn, capture) {
    el.addEventListener(event, fn, !!capture);
    this.listeners.push({ el: el, event: event, fn: fn, capture: !!capture });
  },

  stop: function() {
    if (!this.active) return;
    var simType = this.active;
    this.active = null;

    if (this.timeout) { clearTimeout(this.timeout); this.timeout = null; }

    this.intervals.forEach(function(id) { clearInterval(id); });
    this.intervals = [];

    this.listeners.forEach(function(l) { l.el.removeEventListener(l.event, l.fn, !!l.capture); });
    this.listeners = [];

    this.elements.forEach(function(el) { if (el.parentNode) el.parentNode.removeChild(el); });
    this.elements = [];

    document.body.style.filter = this.originalBodyFilter;
    var wrapper = document.getElementById('pageWrapper');
    if (wrapper) wrapper.style.filter = '';
    document.body.style.cursor = this.originalBodyCursor;
    document.body.classList.remove('sim-active-motor', 'sim-active-keyboard', 'sim-active-anxiety', 'sim-active-autism');

    document.getElementById('simControlPanel').classList.remove('active');

    document.getElementById('srSimOverlay').classList.remove('active');
    document.getElementById('fakeCursor').style.display = 'none';
    var timer = document.getElementById('anxietyTimer');
    if (timer) timer.style.display = 'none';

    document.body.classList.remove('sim-running');
    completeSim(simType);
    announce('模擬已停止');
  }
};

function stopImmersiveSim() { immersiveSim.stop(); }

function showPhotosensWarning(callback) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    alert('你的系統已開啟「減少動態效果」。此模擬包含動畫效果，已自動停用。');
    return;
  }
  var dialog = document.getElementById('photosensDialog');
  var confirmBtn = document.getElementById('photosensConfirm');
  var cancelBtn = document.getElementById('photosensCancel');
  var onConfirm = function() {
    dialog.close();
    confirmBtn.removeEventListener('click', onConfirm);
    cancelBtn.removeEventListener('click', onCancel);
    callback();
  };
  var onCancel = function() {
    dialog.close();
    confirmBtn.removeEventListener('click', onConfirm);
    cancelBtn.removeEventListener('click', onCancel);
  };
  confirmBtn.addEventListener('click', onConfirm);
  cancelBtn.addEventListener('click', onCancel);
  dialog.showModal();
  requestAnimationFrame(function() { cancelBtn.focus(); });
}

// ===== EMPATHY SIMULATIONS =====

// -- Immersive sim functions --

function simLowVision() {
  var scotoma = document.createElement('div');
  scotoma.id = 'scotomaOverlay';
  scotoma.style.cssText = 'position:fixed;inset:0;z-index:9995;pointer-events:none;';
  document.body.appendChild(scotoma);
  immersiveSim.addElement(scotoma);

  var updateScotoma = function(e) {
    scotoma.style.background = 'radial-gradient(circle 80px at ' + e.clientX + 'px ' + e.clientY + 'px, rgba(0,0,0,0.6) 0%, transparent 100%)';
  };
  immersiveSim.addListener(document, 'mousemove', updateScotoma);

  immersiveSim.start('lowvision', {
    title: '低視力模擬（黃斑部病變）',
    challenge: '挑戰：找到「檢核清單」頁籤，勾選任一項目。按 Esc 停止。',
    hasSlider: true,
    sliderDefault: 40,
    onSliderChange: function(e) {
      var v = parseInt(e.target.value);
      var blur = 2 + (v / 100) * 6;
      var contrast = 0.9 - (v / 100) * 0.3;
      document.getElementById('pageWrapper').style.filter = 'blur(' + blur + 'px) contrast(' + contrast + ')';
      document.getElementById('simIntensityLabel').textContent =
        v < 33 ? '輕微' : v < 66 ? '中等' : '嚴重';
      document.getElementById('simControlPanel').style.filter = 'none';
    }
  });
}

function simColorBlind() {
  immersiveSim.start('colorblind', {
    title: '色覺障礙模擬',
    challenge: '挑戰：觀察頁面上的彩色按鈕和徽章，切換三種模式比較差異。按 Esc 停止。',
    hasSlider: false,
    modes: [
      { label: '紅色弱', activate: function() { document.getElementById('pageWrapper').style.filter = 'url(#sim-protanopia)'; }},
      { label: '綠色弱', activate: function() { document.getElementById('pageWrapper').style.filter = 'url(#sim-deuteranopia)'; }},
      { label: '全色盲', activate: function() { document.getElementById('pageWrapper').style.filter = 'grayscale(1)'; }}
    ],
    apply: function() { document.getElementById('pageWrapper').style.filter = 'url(#sim-protanopia)'; }
  });
}

function simScreenReader() {
  var overlay = document.getElementById('srSimOverlay');
  var roleEl = document.getElementById('srSimRole');
  var textEl = document.getElementById('srSimText');

  var elements = [];
  var activeSection = document.querySelector('.section.active');
  if (activeSection) {
    activeSection.querySelectorAll('h1,h2,h3,h4,p,button,a,li,label').forEach(function(el) {
      if (el.offsetParent === null) return;
      var role = el.tagName.toLowerCase();
      if (role === 'h1' || role === 'h2' || role === 'h3' || role === 'h4')
        role = 'heading level ' + role[1];
      else if (role === 'a') role = 'link';
      else if (role === 'button') role = 'button';
      else if (role === 'li') role = 'list item';
      else if (role === 'label') role = 'label';
      else role = 'text';
      var text = el.textContent.trim().substring(0, 200);
      if (text) elements.push({ role: role, text: text });
    });
  }
  if (elements.length === 0) elements = [{ role: 'text', text: '（此頁無可讀取的內容）' }];

  var currentIdx = 0;
  var synth = window.speechSynthesis || null;

  function showElement(idx) {
    if (idx < 0 || idx >= elements.length) return;
    currentIdx = idx;
    var item = elements[idx];
    roleEl.textContent = '[' + item.role + '] (' + (idx + 1) + '/' + elements.length + ')';
    textEl.textContent = item.text;
    if (synth) {
      synth.cancel();
      var utter = new SpeechSynthesisUtterance(item.text);
      utter.lang = 'zh-TW';
      utter.rate = 0.9;
      synth.speak(utter);
    }
  }

  var keyHandler = function(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      showElement(currentIdx + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      showElement(currentIdx - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var item = elements[currentIdx];
      if (item.role === 'button' || item.role === 'link') {
        textEl.textContent = '（已啟動：' + item.text + '）';
      }
    }
  };

  overlay.classList.add('active');
  showElement(0);
  immersiveSim.addListener(document, 'keydown', keyHandler);


  immersiveSim.start('screenreader', {
    title: '螢幕閱讀器模擬（全盲體驗）',
    challenge: '挑戰：用方向鍵聽完前三個元素，按 Enter 啟動一個連結',
    hasSlider: false,
    apply: function() {}
  });

  var originalStop = immersiveSim.stop.bind(immersiveSim);
  var patchedStop = function() {
    if (synth) synth.cancel();
    overlay.classList.remove('active');
    originalStop();
    immersiveSim.stop = originalStop;
  };
  immersiveSim.stop = patchedStop;
}

function simMotor() {
  var jitterAmp = 8;
  var targets = document.querySelectorAll('button, a, input, [role="button"], .nav-tab');
  var jitterIds = [];

  // Make all interactive targets jitter in place
  var jitterId = setInterval(function() {
    targets.forEach(function(el) {
      if (el.closest('.sim-control-panel')) return;
      var jx = (Math.random() - 0.5) * 2 * jitterAmp;
      var jy = (Math.random() - 0.5) * 2 * jitterAmp;
      el.style.transform = 'translate(' + jx + 'px,' + jy + 'px)';
    });
  }, 80);
  immersiveSim.addInterval(jitterId);

  // Restore transforms on stop
  var cleanup = function() {
    targets.forEach(function(el) { el.style.transform = ''; });
  };

  immersiveSim.start('motor', {
    title: '肢體障礙模擬（手部顫抖）',
    challenge: '挑戰：試著點擊任何一個按鈕——它們一直在動，就像你的手在抖一樣',
    hasSlider: true,
    sliderDefault: 40,
    onSliderChange: function(e) {
      var v = parseInt(e.target.value);
      jitterAmp = 3 + (v / 100) * 15;
      document.getElementById('simIntensityLabel').textContent =
        v < 33 ? '輕微' : v < 66 ? '中等' : '嚴重';
    }
  });

  var origStop = immersiveSim.stop.bind(immersiveSim);
  immersiveSim.stop = function() {
    cleanup();
    origStop();
    immersiveSim.stop = origStop;
  };
}

function simKeyboard() {
  document.body.style.cursor = 'none';

  var clickBlocker = function(e) {
    e.preventDefault();
    e.stopPropagation();
    announce('滑鼠已停用。請使用 Tab、Enter、方向鍵操作。');
  };
  immersiveSim.addListener(document, 'click', clickBlocker, true);
  immersiveSim.addListener(document, 'mousedown', function(e) { if (e.target.closest('.sim-control-panel')) return; e.preventDefault(); }, true);

  immersiveSim.start('keyboard', {
    title: '純鍵盤操作體驗',
    challenge: '挑戰：只用鍵盤切換到「專案階段」並展開任一階段',
    hasSlider: false,
    apply: function() {}
  });
}

function simADHD() {
  immersiveSim.start('adhd', {
    title: 'ADHD 注意力分散模擬',
    challenge: '挑戰：在這些干擾中找到並切換到「動手做」頁籤。你現在體驗的每一個彈窗、倒數、通知，都是真實網站上常見的設計。對 ADHD 使用者來說，這不是模擬，這是日常。按 Esc 停止後想一想：你的網站有幾個這樣的東西？',
    hasSlider: true,
    sliderDefault: 50,
    onSliderChange: function(e) {
      document.getElementById('simIntensityLabel').textContent =
        parseInt(e.target.value) < 33 ? '輕微' : parseInt(e.target.value) < 66 ? '中等' : '嚴重';
    },
    apply: function() {
      // Chat popup
      var chat = document.createElement('div');
      chat.className = 'adhd-distraction';
      chat.style.cssText = 'bottom:80px;left:20px;background:var(--accent);color:white;max-width:200px;';
      chat.textContent = '需要幫助嗎？按此開始對話！';
      document.body.appendChild(chat);
      immersiveSim.addElement(chat);

      // Countdown banner
      var banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9996;background:var(--danger);color:white;text-align:center;padding:8px;font-weight:700;font-size:0.9rem;';
      var seconds = 120;
      banner.textContent = '工作階段剩餘時間：' + Math.floor(seconds/60) + ':' + ('0'+seconds%60).slice(-2);
      document.body.appendChild(banner);
      immersiveSim.addElement(banner);
      var countdownId = setInterval(function() {
        seconds = (seconds > 0) ? seconds - 1 : 120;
        banner.textContent = '工作階段剩餘時間：' + Math.floor(seconds/60) + ':' + ('0'+seconds%60).slice(-2);
      }, 1000);
      immersiveSim.addInterval(countdownId);

      // Cookie consent overlay
      var cookie = document.createElement('div');
      cookie.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9996;background:var(--card-bg);border-top:2px solid var(--border);padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -4px 20px rgba(0,0,0,0.2);';
      cookie.textContent = '';
      var cookieText = document.createElement('span');
      cookieText.style.cssText = 'font-size:0.82rem;color:var(--text);';
      cookieText.textContent = '本網站使用 Cookie 以提供您最佳體驗。繼續使用即表示您同意我們的隱私政策。';
      var cookieBtn = document.createElement('button');
      cookieBtn.style.cssText = 'padding:8px 20px;background:var(--primary);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;white-space:nowrap;';
      cookieBtn.textContent = '我同意';
      cookieBtn.onclick = function() { cookie.style.display = 'none'; };
      cookie.appendChild(cookieText);
      cookie.appendChild(cookieBtn);
      document.body.appendChild(cookie);
      immersiveSim.addElement(cookie);

      // Newsletter popup (appears after 3 seconds)
      setTimeout(function() {
        var newsletter = document.createElement('div');
        newsletter.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9997;background:var(--card-bg);border-radius:16px;padding:32px;max-width:360px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,0.3);text-align:center;';
        var nlClose = document.createElement('button');
        nlClose.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-light);';
        nlClose.textContent = 'X';
        nlClose.onclick = function() { newsletter.style.display = 'none'; backdrop.style.display = 'none'; };
        var nlTitle = document.createElement('div');
        nlTitle.style.cssText = 'font-size:1.1rem;font-weight:700;margin-bottom:8px;';
        nlTitle.textContent = '等等！別走！';
        var nlDesc = document.createElement('div');
        nlDesc.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin-bottom:12px;';
        nlDesc.textContent = '訂閱我們的電子報，獲得獨家優惠和最新消息！';
        var nlInput = document.createElement('input');
        nlInput.style.cssText = 'width:100%;padding:10px;border:2px solid var(--border);border-radius:8px;margin-bottom:8px;font-size:0.9rem;';
        nlInput.placeholder = '輸入你的 Email...';
        var nlBtn = document.createElement('button');
        nlBtn.style.cssText = 'width:100%;padding:10px;background:var(--accent);color:white;border:none;border-radius:8px;font-weight:600;font-size:0.9rem;cursor:pointer;';
        nlBtn.textContent = '立即訂閱';
        newsletter.appendChild(nlClose);
        newsletter.appendChild(nlTitle);
        newsletter.appendChild(nlDesc);
        newsletter.appendChild(nlInput);
        newsletter.appendChild(nlBtn);
        var backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;z-index:9996;background:rgba(0,0,0,0.5);';
        backdrop.onclick = function() { newsletter.style.display = 'none'; backdrop.style.display = 'none'; };
        document.body.appendChild(backdrop);
        document.body.appendChild(newsletter);
        immersiveSim.addElement(backdrop);
        immersiveSim.addElement(newsletter);
      }, 3000);

      // Random "special offer" popups
      var offerTexts = ['限時 50% 折扣！只剩 2 分鐘！', '恭喜！你是今天第 1000 位訪客！', '免費試用 30 天，立即開始！', '你的購物車裡有未結帳的商品！', '好友正在查看這個頁面...'];
      var offerId = setInterval(function() {
        var offer = document.createElement('div');
        var randomTop = Math.floor(Math.random() * 60) + 10;
        var randomLeft = Math.floor(Math.random() * 60) + 10;
        offer.style.cssText = 'position:fixed;top:' + randomTop + '%;left:' + randomLeft + '%;z-index:9996;background:var(--card-bg);border:2px solid var(--accent);border-radius:12px;padding:16px 20px;max-width:250px;box-shadow:0 4px 20px rgba(0,0,0,0.2);font-size:0.85rem;font-weight:600;';
        offer.textContent = offerTexts[Math.floor(Math.random() * offerTexts.length)];
        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'position:absolute;top:4px;right:8px;background:none;border:none;cursor:pointer;color:var(--text-light);font-size:0.8rem;';
        closeBtn.textContent = 'X';
        closeBtn.onclick = function() { if (offer.parentNode) offer.parentNode.removeChild(offer); };
        offer.appendChild(closeBtn);
        document.body.appendChild(offer);
        immersiveSim.addElement(offer);
        setTimeout(function() { if (offer.parentNode) offer.parentNode.removeChild(offer); }, 6000);
      }, 4000);
      immersiveSim.addInterval(offerId);

      // Notification sound simulation (visual ping)
      var pingId = setInterval(function() {
        var ping = document.createElement('div');
        ping.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9996;background:var(--primary);color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;box-shadow:0 0 20px var(--primary);animation:adhd-float 0.5s ease;';
        ping.textContent = '1';
        document.body.appendChild(ping);
        immersiveSim.addElement(ping);
        setTimeout(function() { if (ping.parentNode) ping.parentNode.removeChild(ping); }, 2000);
      }, 5000);
      immersiveSim.addInterval(pingId);

      var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!reducedMotion) {
      // Card pulse
      var cards = document.querySelectorAll('.card');
      var pulseId = setInterval(function() {
        var card = cards[Math.floor(Math.random() * cards.length)];
        if (card) {
          card.style.boxShadow = '0 0 20px var(--accent)';
          setTimeout(function() { card.style.boxShadow = ''; }, 1500);
        }
      }, 3000);
      immersiveSim.addInterval(pulseId);

      // Auto scroll
      var scrollId = setInterval(function() {
        window.scrollBy({ top: Math.random() > 0.5 ? 50 : -30, behavior: 'smooth' });
      }, 3000);
      immersiveSim.addInterval(scrollId);
      }

      // Tab notification dots
      var tabs = document.querySelectorAll('.nav-tab');
      var notifId = setInterval(function() {
        var tab = tabs[Math.floor(Math.random() * tabs.length)];
        if (!tab) return;
        var dot = document.createElement('span');
        dot.style.cssText = 'display:inline-block;width:8px;height:8px;background:var(--danger);border-radius:50%;margin-left:4px;vertical-align:top;';
        tab.appendChild(dot);
        immersiveSim.addElement(dot);
        setTimeout(function() { if (dot.parentNode) dot.parentNode.removeChild(dot); }, 5000);
      }, 4000);
      immersiveSim.addInterval(notifId);
    }
  });
}

function simAutism() {
  immersiveSim.start('autism', {
    title: 'Autism 感覺過載模擬',
    challenge: '挑戰：找到並閱讀「全員必備素養」區塊',
    hasSlider: true,
    sliderDefault: 50,
    onSliderChange: function(e) {
      var v = parseInt(e.target.value);
      var sat = 1.5 + (v / 100) * 1.5;
      document.getElementById('pageWrapper').style.filter = 'saturate(' + sat + ')';
      document.getElementById('simIntensityLabel').textContent =
        v < 33 ? '輕微' : v < 66 ? '中等' : '嚴重';
    },
    apply: function() {
      document.getElementById('pageWrapper').style.filter = 'saturate(2.5)';

      var shiftId = setInterval(function() {
        var els = document.querySelectorAll('.card, .foundation-item, .role-card');
        var el = els[Math.floor(Math.random() * els.length)];
        if (el) {
          var shift = (Math.random() - 0.5) * 6;
          el.style.marginLeft = shift + 'px';
          setTimeout(function() { el.style.marginLeft = ''; }, 2000);
        }
      }, 3000);
      immersiveSim.addInterval(shiftId);

      var hoverStyle = document.createElement('style');
      hoverStyle.textContent = '.sim-active-autism .card:hover,.sim-active-autism .role-card:hover,.sim-active-autism button:hover{transform:scale(1.08) rotate(1deg) !important;transition:transform 0.1s !important;}';
      document.head.appendChild(hoverStyle);
      immersiveSim.addElement(hoverStyle);
      document.body.classList.add('sim-active-autism');

      var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion) {
      var hue = 0;
      var hueId = setInterval(function() {
        hue = (hue + 2) % 360;
        document.getElementById('pageWrapper').style.filter = 'saturate(2.5) hue-rotate(' + hue + 'deg)';
      }, 200);
      immersiveSim.addInterval(hueId);
      }
    }
  });
}

function simDyslexia() {
  var swapPairs = [['b','d'],['p','q'],['m','w'],['n','u']];
  // Similar-looking Chinese characters for swap
  var zhSwapPairs = [['人','入'],['大','太'],['未','末'],['土','士'],['日','曰'],['己','已'],['問','間'],['他','她'],['的','得'],['在','再']];
  var affectedNodes = [];

  function scrambleText() {
    var section = document.querySelector('.section.active');
    if (!section) return;
    var walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    var node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim().length < 3) continue;
      if (node.parentElement.closest('.sim-control-panel')) continue;
      var original = node.textContent;
      var chars = original.split('');
      for (var i = 0; i < chars.length; i++) {
        if (Math.random() > 0.08) continue;
        // Try English swaps
        var swapped = false;
        for (var p = 0; p < swapPairs.length; p++) {
          if (chars[i] === swapPairs[p][0]) { chars[i] = swapPairs[p][1]; swapped = true; break; }
          if (chars[i] === swapPairs[p][1]) { chars[i] = swapPairs[p][0]; swapped = true; break; }
        }
        // Try Chinese swaps
        if (!swapped) {
          for (var z = 0; z < zhSwapPairs.length; z++) {
            if (chars[i] === zhSwapPairs[z][0]) { chars[i] = zhSwapPairs[z][1]; break; }
            if (chars[i] === zhSwapPairs[z][1]) { chars[i] = zhSwapPairs[z][0]; break; }
          }
        }
        // Random character position swap (simulates jumping text)
        if (Math.random() > 0.7 && i < chars.length - 1) {
          var tmp = chars[i]; chars[i] = chars[i+1]; chars[i+1] = tmp;
        }
      }
      node.textContent = chars.join('');
      affectedNodes.push({ node: node, original: original });
    }
  }

  immersiveSim.start('dyslexia', {
    title: 'Dyslexia 閱讀障礙模擬',
    challenge: '挑戰：試著讀完這個頁面上的任何一段文字。注意：文字會跳動、相似字會互換、行距不穩定。',
    hasSlider: true,
    sliderDefault: 50,
    onSliderChange: function(e) {
      document.getElementById('simIntensityLabel').textContent =
        parseInt(e.target.value) < 33 ? '輕微' : parseInt(e.target.value) < 66 ? '中等' : '嚴重';
    },
    apply: function() {
      scrambleText();
      var scrambleId = setInterval(function() {
        affectedNodes.forEach(function(an) { an.node.textContent = an.original; });
        affectedNodes = [];
        scrambleText();
      }, 3000);
      immersiveSim.addInterval(scrambleId);

      // Unstable line-height + letter-spacing
      var lineStyle = document.createElement('style');
      lineStyle.textContent = '.section.active p,.section.active li,.section.active span,.section.active h3,.section.active div{line-height:' + (1.3 + Math.random() * 0.8) + ' !important;letter-spacing:' + (Math.random() * 2 - 0.5) + 'px !important;}';
      document.head.appendChild(lineStyle);
      immersiveSim.addElement(lineStyle);

      // Words occasionally blur and unblur
      var blurId = setInterval(function() {
        var els = document.querySelectorAll('.section.active p, .section.active li');
        var el = els[Math.floor(Math.random() * els.length)];
        if (el && !el.closest('.sim-control-panel')) {
          el.style.filter = 'blur(1.5px)';
          setTimeout(function() { el.style.filter = ''; }, 1500);
        }
      }, 2000);
      immersiveSim.addInterval(blurId);

      var origStop = immersiveSim.stop.bind(immersiveSim);
      immersiveSim.stop = function() {
        affectedNodes.forEach(function(an) { an.node.textContent = an.original; });
        affectedNodes = [];
        origStop();
        immersiveSim.stop = origStop;
      };
    }
  });
}

function simHearing() {
  var dialog = document.getElementById('simDialog');
  var modal = document.getElementById('simModal');
  modal.textContent = '';
  modal.insertAdjacentHTML('beforeend',
    '<button class="sim-close" onclick="closeSim()" aria-label="關閉">X</button>' +
    '<h2 style="font-size:1.2rem;margin-bottom:12px;">聽覺障礙模擬</h2>' +
    '<div style="background:#1a1a2e;border-radius:12px;padding:40px;text-align:center;margin-bottom:16px;">' +
    '  <div style="font-size:3rem;margin-bottom:16px;">&#x1F5E3;</div>' +
    '  <div style="background:#333;border-radius:20px;padding:12px 20px;display:inline-block;color:#888;">' +
    '    <span style="animation:blink 1s infinite;">...</span> ' +
    '    <span style="animation:blink 1s infinite 0.3s;">...</span> ' +
    '    <span style="animation:blink 1s infinite 0.6s;">...</span>' +
    '  </div>' +
    '  <p style="color:#666;margin-top:12px;font-size:0.85rem;">（正在播放音訊... 你聽到了什麼？）</p>' +
    '</div>' +
    '<div style="margin-bottom:16px;">' +
    '  <p style="font-weight:600;margin-bottom:8px;">問題：剛才的說話者傳達了什麼訊息？</p>' +
    '  <div style="display:flex;flex-direction:column;gap:8px;">' +
    '    <button class="quiz-opt" onclick="hearingReveal()" style="text-align:left;">A. 明天下午兩點開會</button>' +
    '    <button class="quiz-opt" onclick="hearingReveal()" style="text-align:left;">B. 報名截止日延長到週五</button>' +
    '    <button class="quiz-opt" onclick="hearingReveal()" style="text-align:left;">C. 我完全不知道，因為沒有字幕</button>' +
    '  </div>' +
    '</div>' +
    '<div id="hearingRevealArea" style="display:none;">' +
    '  <div class="card" style="background:var(--card-bg);border-left:4px solid var(--success);">' +
    '    <h3>正確答案是 C</h3>' +
    '    <p class="text-sm">沒有字幕的情況下，聾人和重聽者<strong>完全無法</strong>獲取音訊內容。即使「猜」也只是猜。所以所有預錄影片都必須提供字幕（WCAG 1.2.2）。</p>' +
    '  </div>' +
    '  <div class="card" style="background:#fff;margin-top:8px;">' +
    '    <h3>加上字幕後：</h3>' +
    '    <div style="background:#1a1a2e;border-radius:12px;padding:24px;text-align:center;color:white;">' +
    '      <div style="font-size:2rem;margin-bottom:8px;">&#x1F5E3;</div>' +
    '      <div style="background:rgba(0,0,0,0.7);border-radius:8px;padding:8px 16px;display:inline-block;font-size:0.95rem;">' +
    '        「各位好，提醒大家本週五是改版上線的截止日，請確認所有無障礙檢查已完成。」' +
    '      </div>' +
    '    </div>' +
    '    <p class="text-sm" style="margin-top:12px;">有了字幕，所有人——包括在嘈雜環境中的聽人——都能理解內容。</p>' +
    '  </div>' +
    '  <div style="text-align:center;margin-top:16px;">' +
    '    <button class="sim-btn" onclick="completeSim(\'hearing\');closeSim();" style="background:var(--success);">完成此體驗</button>' +
    '  </div>' +
    '</div>'
  );
  dialog.setAttribute('aria-label', '聽覺障礙模擬');
  dialog.showModal();
}

function hearingReveal() {
  document.getElementById('hearingRevealArea').style.display = 'block';
  document.querySelectorAll('#simModal .quiz-opt').forEach(function(o) { o.style.pointerEvents = 'none'; o.style.opacity = '0.6'; });
  document.querySelectorAll('#simModal .quiz-opt')[2].style.borderColor = 'var(--success)';
  document.querySelectorAll('#simModal .quiz-opt')[2].style.background = '#eafaf1';
  document.querySelectorAll('#simModal .quiz-opt')[2].style.opacity = '1';
}

function simAnxiety() {
  var timerEl = document.getElementById('anxietyTimer');
  var seconds = 45;

  immersiveSim.start('anxiety', {
    title: '焦慮症模擬',
    challenge: '挑戰：試著在壓力下勾選任一檢核清單項目',
    hasSlider: false,
    apply: function() {
      timerEl.style.display = 'block';
      timerEl.textContent = '你的操作時間還剩 ' + seconds + ' 秒';
      var timerId = setInterval(function() {
        seconds--;
        if (seconds <= 0) seconds = 45;
        timerEl.textContent = '你的操作時間還剩 ' + seconds + ' 秒';
        if (seconds <= 10) timerEl.style.background = '#c0392b';
        else timerEl.style.background = 'var(--danger)';
      }, 1000);
      immersiveSim.addInterval(timerId);

      var errorHandler = function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
          if (e.target.closest('.sim-control-panel')) return;
          if (Math.random() > 0.5) {
            var err = document.createElement('div');
            err.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:9997;background:var(--card-bg);border:2px solid var(--danger);border-radius:8px;padding:12px 24px;font-size:0.9rem;color:var(--danger);font-weight:600;box-shadow:var(--shadow);';
            err.textContent = '發生錯誤。請重試。';
            document.body.appendChild(err);
            immersiveSim.addElement(err);
            setTimeout(function() { if (err.parentNode) err.parentNode.removeChild(err); }, 3000);
          }
        }
      };
      immersiveSim.addListener(document, 'click', errorHandler);

      var shiftId = setInterval(function() {
        var btns = document.querySelectorAll('.nav-tab, .filter-pill');
        var btn = btns[Math.floor(Math.random() * btns.length)];
        if (btn) {
          btn.style.transform = 'translateX(' + ((Math.random()-0.5)*4) + 'px)';
          setTimeout(function() { btn.style.transform = ''; }, 2000);
        }
      }, 5000);
      immersiveSim.addInterval(shiftId);
    }
  });
}

// -- Router --

function startImmersive(type) {
  var sims = {
    lowvision: simLowVision,
    colorblind: simColorBlind,
    motor: simMotor,
    keyboard: simKeyboard,
    adhd: simADHD,
    autism: simAutism,
    dyslexia: simDyslexia,
    screenreader: simScreenReader,
    anxiety: simAnxiety
  };
  if (sims[type]) sims[type]();
}

function openSim(type) {
  simTriggerElement = document.activeElement;
  var immersiveTypes = ['lowvision','colorblind','motor','keyboard','adhd','autism','dyslexia','screenreader','anxiety'];
  if (immersiveTypes.indexOf(type) !== -1) {
    var needsWarning = ['lowvision','motor','adhd','autism','dyslexia'].indexOf(type) !== -1;
    if (needsWarning) {
      showPhotosensWarning(function() { startImmersive(type); });
    } else {
      startImmersive(type);
    }
    return;
  }
  openDialogSim(type);
}

function openDialogSim(type) {
  var dialog = document.getElementById('simDialog');
  var modal = document.getElementById('simModal');
  if (type === 'hearing') { simHearing(); return; }
  if (type === 'temporary') {
    modal.textContent = '';
    modal.insertAdjacentHTML('beforeend',
      '<button class="sim-close" onclick="closeSim()" aria-label="關閉模擬體驗">X</button>' +
      '<h2 style="font-size:1.2rem;margin-bottom:4px;">臨時障礙情境</h2>' +
      '<h3 style="margin-bottom:12px;">每個人都可能是障礙者</h3><p class="text-sm text-muted">以下是日常中常見的臨時障礙場景。</p>' +
      '<div style="display:grid;gap:12px;margin-top:16px;">' +
      '<details class="disclosure-card"><summary>手臂骨折 &rarr; 類似單手操作障礙</summary><div class="detail-content"><p class="text-sm">石膏固定後你只能單手操作。那些需要雙手的操作、過小的按鈕，都會成為障礙。</p><p class="text-sm" style="margin-top:8px;color:var(--success);font-weight:600;">&rarr; 設計提示：確保所有功能都可以單手完成</p></div></details>' +
      '<details class="disclosure-card"><summary>大太陽下看手機 &rarr; 類似低視力</summary><div class="detail-content"><p class="text-sm">強光直射下螢幕反光嚴重，低對比度的文字完全看不見。</p><p class="text-sm" style="margin-top:8px;color:var(--success);font-weight:600;">&rarr; 設計提示：高對比度設計幫助所有使用者</p></div></details>' +
      '<details class="disclosure-card"><summary>一手抱嬰兒 &rarr; 類似單手操作障礙</summary><div class="detail-content"><p class="text-sm">新手爸媽經常一手抱著孩子。複雜手勢幾乎不可能完成。</p><p class="text-sm" style="margin-top:8px;color:var(--success);font-weight:600;">&rarr; 設計提示：觸控目標要大、避免複雜手勢</p></div></details>' +
      '<details class="disclosure-card"><summary>吵雜餐廳中 &rarr; 類似聽覺障礙</summary><div class="detail-content"><p class="text-sm">嘈雜環境中聽不到影片聲音。沒有字幕的影片等於無法使用。</p><p class="text-sm" style="margin-top:8px;color:var(--success);font-weight:600;">&rarr; 設計提示：所有影片提供字幕</p></div></details>' +
      '<details class="disclosure-card"><summary>老花眼 &rarr; 類似低視力</summary><div class="detail-content"><p class="text-sm">隨著年齡增長，過小的字級和低對比度文字都會造成困擾。</p><p class="text-sm" style="margin-top:8px;color:var(--success);font-weight:600;">&rarr; 設計提示：字級至少 16px、避免淺灰色文字</p></div></details>' +
      '</div>' +
      '<div class="card" style="margin-top:16px;background:var(--card-bg);"><h3>核心觀點</h3><p class="text-sm">無障礙不只是「為少數人設計」——它是為<strong>所有人在所有情境下</strong>設計。微軟的包容性設計框架指出：永久障礙、臨時障礙、情境障礙，三者的設計解方往往是相通的。</p></div>' +
      '<div style="text-align:center;margin-top:20px;"><button class="sim-btn" onclick="completeSim(\'temporary\')" style="background:var(--success);">完成此體驗</button></div>'
    );
    dialog.setAttribute('aria-label', '臨時障礙情境');
    dialog.showModal();
  }
}

function closeSim() { document.getElementById('simDialog').close(); if (simTriggerElement) { simTriggerElement.focus(); simTriggerElement = null; } }

function completeSim(type) {
  state.completedSims.add(type);
  var dialog = document.getElementById('simDialog');
  if (dialog.open) dialog.close();
  var count = state.completedSims.size;
  document.getElementById('empathyProgress').textContent = '已完成 ' + count + '/10 個同理心體驗。' + (count >= 10 ? ' 全部完成，太棒了！' : count >= 3 ? ' 繼續加油！' : ' 繼續探索更多情境吧！');
  if (count >= 1) earnBadge('empathy-1');
  if (count >= 3) earnBadge('empathy-3');
  if (count >= 10) earnBadge('empathy-all');
  updateProgress();
  updateJourneyStepper('empathy');
  announce('已完成 ' + count + ' 個同理心體驗');
}

// ===== QUIZ =====
function renderQuiz() {
  var container = document.getElementById('quizContainer');
  container.textContent = '';
  quizData.forEach(function(q, i) {
    var card = document.createElement('div');
    card.className = 'quiz-card';
    card.id = 'quiz-' + i;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-labelledby', 'quiz-q-' + i);
    var optsHTML = q.opts.map(function(opt, j) {
      return '<button class="quiz-opt" role="radio" aria-checked="false" data-qi="' + i + '" data-oi="' + j + '" onclick="answerQuiz(' + i + ',' + j + ')">' + opt + '</button>';
    }).join('');
    card.insertAdjacentHTML('beforeend',
      '<div class="quiz-q" id="quiz-q-' + i + '"><span class="q-num" aria-hidden="true">' + (i+1) + '</span><span>' + q.q + '</span></div>' +
      '<div class="quiz-options" role="radiogroup" aria-labelledby="quiz-q-' + i + '">' + optsHTML + '</div>' +
      '<div class="quiz-explain" id="explain-' + i + '" role="status">' + q.explain + '</div>'
    );
    container.appendChild(card);
    var radiogroup = card.querySelector('[role="radiogroup"]');
    radiogroup.addEventListener('keydown', function(e) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var opts = Array.from(this.querySelectorAll('.quiz-opt'));
      var idx = opts.indexOf(document.activeElement);
      if (idx === -1) return;
      var newIdx;
      if (e.key === 'ArrowDown') newIdx = (idx + 1) % opts.length;
      else newIdx = (idx - 1 + opts.length) % opts.length;
      opts[newIdx].focus();
    });
  });
}

function answerQuiz(qi, oi) {
  var q = quizData[qi];
  var card = document.getElementById('quiz-' + qi);
  var opts = card.querySelectorAll('.quiz-opt');
  var explain = document.getElementById('explain-' + qi);
  if (opts[0].getAttribute('aria-disabled') === 'true') return;
  opts.forEach(function(o, j) {
    o.setAttribute('aria-disabled', 'true');
    o.setAttribute('aria-checked', j === oi ? 'true' : 'false');
    if (j === q.correct) o.classList.add('correct');
    if (j === oi && j !== q.correct) o.classList.add('wrong');
  });
  var isCorrect = oi === q.correct;
  explain.classList.add('show', isCorrect ? 'correct-bg' : 'wrong-bg');
  state.quizAnswered++;
  if (isCorrect) state.quizCorrect++;
  updateJourneyStepper('quiz');
  announce(isCorrect ? '答對了！' : '答錯了。正確答案是：' + q.opts[q.correct]);
  if (state.quizAnswered === quizData.length) {
    setTimeout(function() {
      var score = document.getElementById('quizScore');
      document.getElementById('scoreNum').textContent = state.quizCorrect + '/' + quizData.length;
      score.classList.add('show');
      if (state.quizCorrect >= quizData.length * 0.7) {
        document.getElementById('quizBadge').textContent = '';
        document.getElementById('quizBadge').insertAdjacentHTML('beforeend', '<div class="badge-earned">知識達人徽章已解鎖！</div>');
        earnBadge('quiz-pass');
      } else {
        document.getElementById('quizBadge').textContent = '答對 70% 以上可獲得「知識達人」徽章，再試一次吧！';
      }
      updateProgress();
    }, 600);
  }
}

function resetQuiz() { state.quizAnswered = 0; state.quizCorrect = 0; document.getElementById('quizScore').classList.remove('show'); renderQuiz(); announce('測驗已重設'); }

// ===== CHECKLIST (real checkboxes) =====
var checklistData = [
  {phase:'30 秒',text:'按 Tab 鍵三次，看看焦點跑去哪裡',roles:['dev','designer','qa']},
  {phase:'30 秒',text:'打開你的網站，按 Ctrl+U 看原始碼，搜尋 h1，看看有沒有主標題',roles:['dev','content']},
  {phase:'30 秒',text:'對任何一張圖片按右鍵 > 檢查，看看有沒有 alt',roles:['dev','content']},
  {phase:'30 秒',text:'用手機打開你的網站，試著用大拇指點最小的按鈕',roles:['designer','dev']},
  {phase:'30 秒',text:'把瀏覽器縮放到 200%，看看有沒有東西跑掉',roles:['dev','qa']},
  {phase:'2 分鐘',text:'打開 Chrome DevTools > Lighthouse > 勾 Accessibility > 跑一次',roles:['dev','qa']},
  {phase:'2 分鐘',text:'安裝 WAVE 擴充套件，對你的首頁掃一次',roles:['dev','designer','qa']},
  {phase:'2 分鐘',text:'找到頁面上的一個表單，看看 <label> 有沒有正確綁定 <input>',roles:['dev']},
  {phase:'2 分鐘',text:'檢查你的錯誤提示——把螢幕轉成灰階，還看得出哪裡出錯嗎？',roles:['designer','dev']},
  {phase:'2 分鐘',text:'找一個有顏色區分的地方（紅/綠），確認旁邊有文字或圖示輔助',roles:['designer','content']},
  {phase:'5 分鐘',text:'只用鍵盤完成你網站上最重要的一個流程（結帳、註冊、搜尋）',roles:['dev','qa']},
  {phase:'5 分鐘',text:'打開 NVDA 或 VoiceOver，閉上眼睛聽你的首頁念 30 秒',roles:['dev','qa','designer']},
  {phase:'5 分鐘',text:'檢查所有影片——有字幕嗎？靜音後還看得懂內容嗎？',roles:['content','dev']},
  {phase:'5 分鐘',text:'讓 AI（axe-core 或你的 a11y-audit skill）掃一次，列出問題清單',roles:['dev','qa']},
  {phase:'5 分鐘',text:'讀你自己的網站文案——一個不懂專業術語的人能讀懂嗎？',roles:['content','pm']},
  {phase:'15 分鐘',text:'把 Lighthouse 報告裡標紅的項目修掉（通常 3-5 個最明顯的）',roles:['dev']},
  {phase:'15 分鐘',text:'把所有缺少 alt 的圖片補上有意義的描述',roles:['content','dev']},
  {phase:'15 分鐘',text:'檢查整站的 heading 層級——是不是 h1 > h2 > h3 不跳級？',roles:['dev','content']},
  {phase:'15 分鐘',text:'確認所有互動元件（按鈕、連結、表單）都有可見的焦點樣式',roles:['dev','designer']},
  {phase:'15 分鐘',text:'試著用手機的 TalkBack 或 VoiceOver 操作一個關鍵流程',roles:['qa','dev']},
  {phase:'30 分鐘',text:'加一個 skip link，讓鍵盤使用者能跳過導航',roles:['dev']},
  {phase:'30 分鐘',text:'把色彩對比度不夠的文字和背景修到 4.5:1 以上',roles:['designer','dev']},
  {phase:'30 分鐘',text:'讓 AI 幫你寫 axe-core 測試，加進 CI/CD',roles:['dev']},
  {phase:'30 分鐘',text:'寫一頁無障礙聲明（說明你做了什麼、還有什麼限制、怎麼聯絡你）',roles:['content','pm']},
  {phase:'30 分鐘',text:'找一個身障朋友或長輩試用你的網站，聽他們的回饋',roles:['pm','designer','qa']},
  {phase:'交叉審核',text:'內容編輯審查設計',roles:['content']},
  {phase:'交叉審核',text:'PM 審查測試',roles:['pm']},
  {phase:'交叉審核',text:'QA 審查驗收標準',roles:['qa']}
];

function renderChecklistFilters() {
  var container = document.getElementById('checklistFilters');
  var allRoles = ['all','pm','designer','dev','content','qa'];
  var allLabels = { all:'全部', pm:'統籌', designer:'設計', dev:'工程', content:'內容', qa:'測試' };
  container.textContent = '';
  allRoles.forEach(function(r) {
    var btn = document.createElement('button');
    btn.className = 'filter-pill';
    btn.setAttribute('aria-pressed', r === 'all' ? 'true' : 'false');
    btn.textContent = allLabels[r];
    btn.addEventListener('click', function() { filterChecklist(r); });
    container.appendChild(btn);
  });
}

function filterChecklist(role) {
  var allLabels = { all:'全部', pm:'統籌', designer:'設計', dev:'工程', content:'內容', qa:'測試' };
  document.querySelectorAll('#checklistFilters .filter-pill').forEach(function(p) {
    p.setAttribute('aria-pressed', p.textContent === allLabels[role] ? 'true' : 'false');
  });
  renderChecklist(role);
}

function renderChecklist(roleFilter) {
  roleFilter = roleFilter || 'all';
  var container = document.getElementById('checklistContainer');
  var phaseGroups = {};
  checklistData.forEach(function(item, i) {
    if (roleFilter !== 'all' && item.roles.indexOf(roleFilter) === -1) return;
    if (state.selectedRoles.size > 0 && roleFilter === 'all') {
      if (!item.roles.some(function(r) { return state.selectedRoles.has(r); })) return;
    }
    if (!phaseGroups[item.phase]) phaseGroups[item.phase] = [];
    phaseGroups[item.phase].push({ text: item.text, roles: item.roles, idx: i });
  });
  container.textContent = '';
  Object.keys(phaseGroups).forEach(function(phase) {
    var items = phaseGroups[phase];
    var card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '16px';
    var titleMap = {
      '30 秒': '30 秒 — 看一眼就知道的事',
      '2 分鐘': '2 分鐘 — 跑一次工具',
      '5 分鐘': '5 分鐘 — 自己操作一遍',
      '15 分鐘': '15 分鐘 — 修最明顯的問題',
      '30 分鐘': '30 分鐘 — 補齊基礎建設',
      '交叉審核': '交叉審核 — 換個角度檢查'
    };
    var title = titleMap[phase] || phase;
    var h3 = document.createElement('h3');
    h3.style.marginBottom = '12px';
    h3.textContent = title;
    card.appendChild(h3);
    var ul = document.createElement('ul');
    ul.className = 'checklist';
    items.forEach(function(item) {
      var checked = state.checkedItems.has(item.idx);
      var li = document.createElement('li');
      if (checked) li.className = 'checked';
      var label = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      cb.dataset.idx = item.idx;
      cb.addEventListener('change', function() { toggleCheck(item.idx); });
      var span = document.createElement('span');
      span.className = 'check-text';
      span.textContent = item.text + ' ';
      item.roles.forEach(function(r) {
        var tag = document.createElement('span');
        tag.className = 'check-role-tag';
        tag.style.background = roleColors[r] + '20';
        tag.style.color = roleColors[r];
        tag.textContent = roleNames[r];
        span.appendChild(tag);
      });
      label.appendChild(cb);
      label.appendChild(span);
      li.appendChild(label);
      ul.appendChild(li);
    });
    card.appendChild(ul);
    container.appendChild(card);
  });
}

function toggleCheck(idx) {
  if (state.checkedItems.has(idx)) state.checkedItems.delete(idx);
  else state.checkedItems.add(idx);
  var checked = state.checkedItems.has(idx);
  var cb = document.querySelector('.checklist input[type="checkbox"]');
  var allCbs = document.querySelectorAll('.checklist input[type="checkbox"]');
  allCbs.forEach(function(c) {
    var changeHandler = c;
    var li = c.closest('li');
    if (!li) return;
    var label = li.querySelector('label');
    if (!label) return;
    var cbIdx = parseInt(c.dataset.idx);
    if (cbIdx === idx) {
      c.checked = checked;
      if (checked) li.classList.add('checked');
      else li.classList.remove('checked');
    }
  });
  var total = checklistData.length;
  if (state.checkedItems.size >= total * 0.5) earnBadge('checklist-50');
  if (state.checkedItems.size >= total) earnBadge('checklist-100');
  updateProgress();
  updateJourneyStepper('checklist');
}

// ===== BADGES =====
function earnBadge(id) {
  if (state.badges.has(id)) return;
  state.badges.add(id);
  var el = document.querySelector('[data-badge="' + id + '"]');
  if (el) {
    el.classList.add('earned');
    var labelEl = el.querySelector('.badge-label');
    el.setAttribute('aria-label', (labelEl ? labelEl.textContent : id) + ' — 已達成');
    el.style.animation = 'badgePop 0.4s ease';
  }
  announce('徽章解鎖：' + (el && el.querySelector('.badge-label') ? el.querySelector('.badge-label').textContent : id));
}

// ===== PROGRESS =====
function updateProgress() {
  var done = 0;
  if (state.selectedRoles.size > 0) done += 10;
  done += (state.completedSims.size / 10) * 30;
  if (state.quizAnswered === quizData.length) done += (state.quizCorrect / quizData.length) * 20;
  done += (state.checkedItems.size / checklistData.length) * 40;
  var pct = Math.round(done);
  var bar = document.getElementById('globalProgress');
  bar.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', pct);
  document.getElementById('globalPct').textContent = pct + '%';
}

// ===== FIX CENTERED SECTION =====
// ===== ACCESSIBLE WEBCHAT DEMO =====
function toggleChat() {
  var win = document.getElementById('chatWindow');
  var trigger = document.getElementById('chatTrigger');
  var isOpen = win.classList.contains('open');
  if (isOpen) {
    win.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
    announce('對話視窗已關閉');
  } else {
    win.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    document.getElementById('chatInput').focus();
    announce('對話視窗已開啟');
  }
}

var chatResponses = [
  '這是一個示範用的 chatbot。注意每則訊息都標記了發送者（助理/你），螢幕閱讀器會自動念出新訊息。',
  '試試按 Tab 在輸入框和送出按鈕之間移動。按 Escape 可以關閉這個視窗。',
  '這個 chat 使用了 role="log" 和 aria-live="polite"，讓新訊息能被螢幕閱讀器自動偵測和朗讀。',
  '設計參考來自 Craig Abbott 的文章。他指出大部分 webchat 對鍵盤使用者和螢幕閱讀器使用者都不友善。',
  '謝謝你的測試！你可以關閉這個視窗了。'
];
var chatResponseIdx = 0;

function sendChatDemo() {
  var input = document.getElementById('chatInput');
  var msg = input.value.trim();
  if (!msg) return;

  var messages = document.getElementById('chatMessages');

  // User message
  var userDiv = document.createElement('div');
  userDiv.className = 'chat-msg user';
  var userSender = document.createElement('span');
  userSender.className = 'chat-sender';
  userSender.setAttribute('aria-hidden', 'true');
  userSender.textContent = '你';
  var userText = document.createElement('span');
  userText.textContent = msg;
  userDiv.appendChild(userSender);
  userDiv.appendChild(userText);
  messages.appendChild(userDiv);

  input.value = '';

  // Bot response after short delay
  setTimeout(function() {
    var botDiv = document.createElement('div');
    botDiv.className = 'chat-msg bot';
    var botSender = document.createElement('span');
    botSender.className = 'chat-sender';
    botSender.setAttribute('aria-hidden', 'true');
    botSender.textContent = '助理';
    var botText = document.createElement('span');
    botText.textContent = chatResponses[chatResponseIdx % chatResponses.length];
    chatResponseIdx++;
    botDiv.appendChild(botSender);
    botDiv.appendChild(botText);
    messages.appendChild(botDiv);
    messages.scrollTop = messages.scrollHeight;
  }, 800);

  messages.scrollTop = messages.scrollHeight;
  input.focus();
}

// Escape to close chat
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var win = document.getElementById('chatWindow');
    if (win && win.classList.contains('open')) {
      toggleChat();
    }
  }
});

// ===== FONT/SPACING DEMO =====
function switchFont(type) {
  var el = document.getElementById('fontDemoText');
  if (!el) return;
  switch(type) {
    case 'default':
      el.style.fontSize = '0.85rem';
      el.style.lineHeight = '1.8';
      el.style.letterSpacing = '0';
      el.style.wordSpacing = '0';
      announce('已恢復預設');
      break;
    case 'cramped':
      el.style.fontSize = '0.75rem';
      el.style.lineHeight = '1.2';
      el.style.letterSpacing = '-0.5px';
      el.style.wordSpacing = '-1px';
      announce('字距行距已縮小——這是很多網站的實際狀態');
      break;
    case 'spacious':
      el.style.fontSize = '0.85rem';
      el.style.lineHeight = '2.2';
      el.style.letterSpacing = '1.5px';
      el.style.wordSpacing = '3px';
      announce('字距行距已加大——對閱讀障礙者和低視力者更舒適');
      break;
    case 'large':
      el.style.fontSize = '1.2rem';
      el.style.lineHeight = '2';
      el.style.letterSpacing = '0.5px';
      el.style.wordSpacing = '2px';
      announce('字體已放大——WCAG 建議 body text 至少 16px');
      break;
  }
}

// ===== FOCUS INDICATOR TOGGLE =====
var focusStyleSheet = null;
function toggleFocusIndicator(hide) {
  if (hide) {
    focusStyleSheet = document.createElement('style');
    focusStyleSheet.textContent = '*:focus-visible { outline: none !important; box-shadow: none !important; }';
    document.head.appendChild(focusStyleSheet);
    announce('Focus indicator 已關閉。試試用 Tab 鍵移動——你知道自己在哪嗎？');
  } else {
    if (focusStyleSheet && focusStyleSheet.parentNode) {
      focusStyleSheet.parentNode.removeChild(focusStyleSheet);
      focusStyleSheet = null;
    }
    announce('Focus indicator 已恢復。');
  }
}

// ===== CONTRAST TOGGLE =====
function toggleContrast(lowContrast) {
  var text = document.getElementById('contrastText');
  if (!text) return;
  if (lowContrast) {
    text.style.color = '#b0b0b0';
    announce('對比度已降低。你還讀得清楚嗎？');
  } else {
    text.style.color = '';
    announce('對比度已恢復正常。');
  }
}

var centeredFixed = false;
function toggleCenteredSection() {
  var section = document.querySelector('[style*="max-width:1000px"]');
  if (!section) return;
  var btn = document.getElementById('fixBtn');
  var reveal = document.getElementById('fixReveal');

  if (!centeredFixed) {
    section.style.textAlign = 'left';
    section.style.maxWidth = '700px';
    section.style.lineHeight = '1.8';
    var ps = section.querySelectorAll('p');
    ps.forEach(function(p) {
      p.style.marginBottom = '16px';
      p.style.lineHeight = '1.9';
    });
    if (btn) {
      btn.innerHTML = '這就是 Accessibility（無障礙／可及性）<br>一個改動，所有人受益。<br><span style="font-size:0.8rem;opacity:0.8;">再按一次回到修改前</span>';
      btn.style.textAlign = 'left';
      btn.style.background = 'var(--success)';
    }
    if (reveal) reveal.style.display = 'block';
    announce('文字已改為左對齊，行距和段落間距也已調整。');
    centeredFixed = true;
  } else {
    section.style.textAlign = 'center';
    section.style.maxWidth = '1000px';
    section.style.lineHeight = '';
    var ps = section.querySelectorAll('p');
    ps.forEach(function(p) {
      p.style.marginBottom = '8px';
      p.style.lineHeight = '1.4';
    });
    if (btn) {
      btn.textContent = '一鍵修好這段';
      btn.style.textAlign = '';
      btn.style.background = '';
    }
    if (reveal) reveal.style.display = 'none';
    announce('已恢復為置中對齊。');
    centeredFixed = false;
  }
}

// ===== BACK TO TOP + NAV SCROLL =====
window.addEventListener('scroll', function() {
  var btn = document.getElementById('backToTop');
  var nav = document.getElementById('site-nav');
  if (window.scrollY > window.innerHeight) {
    btn.classList.add('visible');
    btn.removeAttribute('tabindex');
  } else {
    btn.classList.remove('visible');
    btn.setAttribute('tabindex', '-1');
  }
  if (nav) {
    if (window.scrollY > 200) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
});


// ===== THEME TOGGLE =====
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  document.getElementById('themeIcon').textContent = next === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
  document.getElementById('themeLabel').textContent = next === 'dark' ? '\u6DFA\u8272\u6A21\u5F0F' : '\u6DF1\u8272\u6A21\u5F0F';
  try { localStorage.setItem('theme', next); } catch(e) {}
  announce(next === 'dark' ? '\u5DF2\u5207\u63DB\u81F3\u6DF1\u8272\u6A21\u5F0F' : '\u5DF2\u5207\u63DB\u81F3\u6DFA\u8272\u6A21\u5F0F');
}

// Restore saved theme
(function() {
  try {
    var saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      if (saved === 'dark') {
        document.getElementById('themeIcon').textContent = '\u2600\uFE0F';
        document.getElementById('themeLabel').textContent = '\u6DFA\u8272\u6A21\u5F0F';
      }
    }
  } catch(e) {}
})();

// ===== SEARCH =====
function searchContent(event) {
  event.preventDefault();
  var query = document.getElementById('search-input').value.trim().toLowerCase();
  var resultsDiv = document.getElementById('search-results');
  if (!resultsDiv) return;
  resultsDiv.textContent = '';
  if (!query) return;

  var results = [];
  document.querySelectorAll('section[id^="sec-"]').forEach(function(section) {
    var sectionId = section.id.replace('sec-', '');
    var walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    var node;
    while (node = walker.nextNode()) {
      var text = node.textContent.trim();
      if (text.length < 10) continue;
      var idx = text.toLowerCase().indexOf(query);
      if (idx === -1) continue;
      var start = Math.max(0, idx - 40);
      var end = Math.min(text.length, idx + query.length + 40);
      var snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
      results.push({ sectionId: sectionId, snippet: snippet, query: query });
    }
  });

  if (results.length === 0) {
    var noResult = document.createElement('p');
    noResult.style.cssText = 'text-align:center;padding:12px;color:var(--text-light);font-size:0.85rem;';
    noResult.textContent = '找不到相關內容';
    resultsDiv.appendChild(noResult);
    announce('找不到相關內容');
    return;
  }

  var seen = new Set();
  results.forEach(function(r) {
    var key = r.sectionId + ':' + r.snippet;
    if (seen.has(key)) return;
    seen.add(key);
    var item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    var escaped = r.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var highlighted = r.snippet.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
    item.innerHTML = highlighted;
    item.addEventListener('click', function() { showSection(r.sectionId); resultsDiv.textContent = ''; });
    item.addEventListener('keydown', function(e) { if (e.key === 'Enter') { showSection(r.sectionId); resultsDiv.textContent = ''; } });
    resultsDiv.appendChild(item);
  });

  announce('找到 ' + results.length + ' 筆結果');
}

document.getElementById('search-input').addEventListener('input', function() {
  if (!this.value.trim()) {
    var resultsDiv = document.getElementById('search-results');
    if (resultsDiv) resultsDiv.textContent = '';
  }
});

// ===== INIT =====
renderQuiz();
renderChecklistFilters();
renderChecklist();
updateProgress();

// Restore tab from URL hash on load
var hash = window.location.hash.replace('#', '');
if (hash && document.getElementById('sec-' + hash)) {
  showSection(hash, true);
}

var extraStyle = document.createElement('style');
extraStyle.textContent = '@keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }';
document.head.appendChild(extraStyle);
