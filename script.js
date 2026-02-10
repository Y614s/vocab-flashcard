const STORAGE_KEY = 'vocab_flashcard_data_v2';
const LEGACY_STORAGE_KEY = 'vocab_flashcard_data';
const ACTIVE_SESSION_KEY = 'vocab_flashcard_active_session_v1';
const CUSTOM_PLANS_KEY = 'vocab_custom_plans_v1';
const BACKUP_VERSION = 1;
const STATE_SCHEMA_VERSION = 3;
const WRONG_FILTERS_KEY = 'vocab_wrong_filters_v1';
const SW_UPDATE_DISMISS_KEY = 'vocab_sw_update_dismiss_v1';
const WRONG_CLEAN_DAYS = 30;
const RESULT_WEAK_TOP = 5;
const SEARCH_DEBOUNCE_MS = 180;
const INSTALL_DISMISS_KEY = 'vocab_install_dismiss_until_v1';
const INSTALL_DISMISS_DAYS = 7;
const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];
const CORE_DEFAULTS = window.VocabCore && window.VocabCore.defaults ? window.VocabCore.defaults : {};
const SM2_MIN_EASE = Number(CORE_DEFAULTS.sm2MinEase) || 1.3;
const SM2_MAX_EASE = Number(CORE_DEFAULTS.sm2MaxEase) || 2.9;
const SM2_DEFAULT_EASE = Number(CORE_DEFAULTS.sm2DefaultEase) || 2.5;
const SM2_MAX_INTERVAL_DAYS = Number(CORE_DEFAULTS.sm2MaxIntervalDays) || 120;
const WRONG_PAGE_SIZE = 30;
const MODES = new Set(['flashcard', 'picture', 'listening', 'spelling']);
const PICTURE_EMOJIS = ['🧩', '🎯', '📚', '🧠', '🔍', '🌟', '🧭', '📝', '🎨', '🪄'];
let customPlans = [];
let editingPlanId = null;

const DEFAULT_STATE = {
  schemaVersion: STATE_SCHEMA_VERSION,
  currentBook: 'cet4',
  dailyGoal: 20,
  learningMode: 'flashcard',
  bookProgress: { cet4: { learnedIndex: 0 }, cet6: { learnedIndex: 0 }, kaoyan: { learnedIndex: 0 } },
  wordRecords: {},
  customWords: { cet4: [], cet6: [], kaoyan: [] },
  totalLearned: 0,
  streak: 0,
  lastStudyDate: null,
  todayNewCount: 0,
  todayReviewCount: 0,
  reminderEnabled: false,
  reminderTime: '20:00',
  studyLogs: []
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
let sessionQueue = [];
let sessionIndex = 0;
let sessionStudied = 0;
let currentWord = null;
let answerLocked = false;
let feedbackTimer = null;
let pictureOptions = [];
let pictureCorrect = 0;
let listeningOptions = [];
let listeningCorrect = 0;
let spellingInput = '';
let spellingTarget = '';
let spellingHintCount = 0;
let pendingPlan = null;
let deferredInstallPrompt = null;
let installPromptPending = false;
let sessionToastTimer = null;
let wrongBookFilters = {
  keyword: '',
  sort: 'score',
  onlyHard: false
};
let wrongBookPage = 1;
let wrongSearchDebounceTimer = null;
let sessionWordStats = {};
let swRegistrationRef = null;
let reminderTimer = null;
let syncModalMode = '';
let vocabLibraryReady = typeof window.getLibrary === 'function';
let vocabLibraryPromise = null;
let sessionResult = {
  startAt: 0,
  endAt: 0,
  known: 0,
  fuzzy: 0,
  unknown: 0,
  newWords: 0,
  reviewWords: 0
};

const dom = {
  dashboardView: document.getElementById('dashboardView'),
  flashcardView: document.getElementById('flashcardView'),
  pictureView: document.getElementById('pictureView'),
  listeningView: document.getElementById('listeningView'),
  spellingView: document.getElementById('spellingView'),
  offlineIndicator: document.getElementById('offlineIndicator'),
  customPlanBtn: document.getElementById('customPlanBtn'),
  customPlansView: document.getElementById('customPlansView'),
  customPlansBackBtn: document.getElementById('customPlansBackBtn'),
  customPlansList: document.getElementById('customPlansList'),
  createPlanBtn: document.getElementById('createPlanBtn'),
  customPlanModal: document.getElementById('customPlanModal'),
  planNameInput: document.getElementById('planNameInput'),
  planBookSelect: document.getElementById('planBookSelect'),
  planModeSelect: document.getElementById('planModeSelect'),
  planGoalInput: document.getElementById('planGoalInput'),
  planGoalValue: document.getElementById('planGoalValue'),
  planRangeStart: document.getElementById('planRangeStart'),
  planRangeEnd: document.getElementById('planRangeEnd'),
  planRangeHint: document.getElementById('planRangeHint'),
  cancelPlanModal: document.getElementById('cancelPlanModal'),
  savePlanBtn: document.getElementById('savePlanBtn'),
  currentPlan: document.getElementById('currentPlan'),
  bookCet4: document.getElementById('bookCet4'),
  bookCet6: document.getElementById('bookCet6'),
  bookKaoyan: document.getElementById('bookKaoyan'),
  dailyGoalSlider: document.getElementById('dailyGoalSlider'),
  dailyGoalValue: document.getElementById('dailyGoalValue'),
  reminderEnabledChk: document.getElementById('reminderEnabledChk'),
  reminderTimeInput: document.getElementById('reminderTimeInput'),
  statLearned: document.getElementById('statLearned'),
  statStreak: document.getElementById('statStreak'),
  statTotal: document.getElementById('statTotal'),
  insightChart7d: document.getElementById('insightChart7d'),
  insightAccuracy30d: document.getElementById('insightAccuracy30d'),
  insightModeGrid: document.getElementById('insightModeGrid'),
  quickActions: document.getElementById('quickActions'),
  resumeSessionBtn: document.getElementById('resumeSessionBtn'),
  quickReviewBtn: document.getElementById('quickReviewBtn'),
  quickNewBtn: document.getElementById('quickNewBtn'),
  quickWrongBtn: document.getElementById('quickWrongBtn'),
  quickSpellingBtn: document.getElementById('quickSpellingBtn'),
  quickWrongSpellingBtn: document.getElementById('quickWrongSpellingBtn'),
  quickWrongBookBtn: document.getElementById('quickWrongBookBtn'),
  startSessionBtn: document.getElementById('startSessionBtn'),
  planView: document.getElementById('planView'),
  planBackBtn: document.getElementById('planBackBtn'),
  planStartBtn: document.getElementById('planStartBtn'),
  planSubtitle: document.getElementById('planSubtitle'),
  planBook: document.getElementById('planBook'),
  planMode: document.getElementById('planMode'),
  planReview: document.getElementById('planReview'),
  planNew: document.getElementById('planNew'),
  planTotal: document.getElementById('planTotal'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataBtn: document.getElementById('importDataBtn'),
  syncCodeExportBtn: document.getElementById('syncCodeExportBtn'),
  syncCodeImportBtn: document.getElementById('syncCodeImportBtn'),
  importWordsJsonBtn: document.getElementById('importWordsJsonBtn'),
  backupFileInput: document.getElementById('backupFileInput'),
  wordJsonInput: document.getElementById('wordJsonInput'),
  installEntry: document.getElementById('installEntry'),
  installTip: document.getElementById('installTip'),
  installAppBtn: document.getElementById('installAppBtn'),
  installDismissBtn: document.getElementById('installDismissBtn'),
  modeFlashcard: document.getElementById('modeFlashcard'),
  modePicture: document.getElementById('modePicture'),
  modeListening: document.getElementById('modeListening'),
  modeSpelling: document.getElementById('modeSpelling'),
  backBtn: document.getElementById('backBtn'),
  importBtn: document.getElementById('importBtn'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  wordCard: document.getElementById('wordCard'),
  word: document.getElementById('word'),
  phonetic: document.getElementById('phonetic'),
  meaning: document.getElementById('meaning'),
  mnemonicText: document.getElementById('mnemonicText'),
  etymologyText: document.getElementById('etymologyText'),
  exampleText: document.getElementById('exampleText'),
  playBtn: document.getElementById('playBtn'),
  btnUnknown: document.getElementById('btnUnknown'),
  btnFuzzy: document.getElementById('btnFuzzy'),
  btnKnown: document.getElementById('btnKnown'),
  importModal: document.getElementById('importModal'),
  importText: document.getElementById('importText'),
  cancelImport: document.getElementById('cancelImport'),
  confirmImport: document.getElementById('confirmImport'),
  pictureBackBtn: document.getElementById('pictureBackBtn'),
  pictureAudioBtn: document.getElementById('pictureAudioBtn'),
  pictureWord: document.getElementById('pictureWord'),
  picturePhonetic: document.getElementById('picturePhonetic'),
  pictureOptions: document.getElementById('pictureOptions'),
  pictureProgressFill: document.getElementById('pictureProgressFill'),
  pictureProgressText: document.getElementById('pictureProgressText'),
  pictureFeedback: document.getElementById('pictureFeedback'),
  pictureFeedbackWord: document.getElementById('pictureFeedbackWord'),
  pictureFeedbackMeaning: document.getElementById('pictureFeedbackMeaning'),
  listeningBackBtn: document.getElementById('listeningBackBtn'),
  listeningPlayBtn: document.getElementById('listeningPlayBtn'),
  listeningOptions: document.getElementById('listeningOptions'),
  listeningProgressFill: document.getElementById('listeningProgressFill'),
  listeningProgressText: document.getElementById('listeningProgressText'),
  listeningFeedback: document.getElementById('listeningFeedback'),
  listeningFeedbackWord: document.getElementById('listeningFeedbackWord'),
  listeningFeedbackMeaning: document.getElementById('listeningFeedbackMeaning'),
  spellingBackBtn: document.getElementById('spellingBackBtn'),
  spellingAudioBtn: document.getElementById('spellingAudioBtn'),
  spellingDefinition: document.getElementById('spellingDefinition'),
  spellingDisplay: document.getElementById('spellingDisplay'),
  spellingHint: document.getElementById('spellingHint'),
  spellingKeyboard: document.getElementById('spellingKeyboard'),
  keyHint: document.getElementById('keyHint'),
  keyDelete: document.getElementById('keyDelete'),
  spellingProgressFill: document.getElementById('spellingProgressFill'),
  spellingProgressText: document.getElementById('spellingProgressText'),
  spellingFeedback: document.getElementById('spellingFeedback'),
  spellingFeedbackWord: document.getElementById('spellingFeedbackWord'),
  spellingFeedbackMeaning: document.getElementById('spellingFeedbackMeaning'),
  resultView: document.getElementById('resultView'),
  resultSubtitle: document.getElementById('resultSubtitle'),
  resultTotal: document.getElementById('resultTotal'),
  resultKnown: document.getElementById('resultKnown'),
  resultFuzzy: document.getElementById('resultFuzzy'),
  resultUnknown: document.getElementById('resultUnknown'),
  resultAccuracy: document.getElementById('resultAccuracy'),
  resultDuration: document.getElementById('resultDuration'),
  resultNew: document.getElementById('resultNew'),
  resultReview: document.getElementById('resultReview'),
  resultBackBtn: document.getElementById('resultBackBtn'),
  resultNextBtn: document.getElementById('resultNextBtn'),
  resultInsights: document.getElementById('resultInsights'),
  resultWeakList: document.getElementById('resultWeakList'),
  sessionToast: document.getElementById('sessionToast'),
  wrongView: document.getElementById('wrongView'),
  wrongBackBtn: document.getElementById('wrongBackBtn'),
  wrongSubtitle: document.getElementById('wrongSubtitle'),
  wrongSearchInput: document.getElementById('wrongSearchInput'),
  wrongSortSelect: document.getElementById('wrongSortSelect'),
  wrongOnlyHardChk: document.getElementById('wrongOnlyHardChk'),
  wrongClearHardBtn: document.getElementById('wrongClearHardBtn'),
  wrongClearOldBtn: document.getElementById('wrongClearOldBtn'),
  wrongExportBtn: document.getElementById('wrongExportBtn'),
  wrongList: document.getElementById('wrongList'),
  wrongEmpty: document.getElementById('wrongEmpty'),
  wrongMoreBtn: document.getElementById('wrongMoreBtn'),
  wrongPracticeBtn: document.getElementById('wrongPracticeBtn'),
  wrongClearBtn: document.getElementById('wrongClearBtn'),
  updateBanner: document.getElementById('updateBanner'),
  updateBannerText: document.getElementById('updateBannerText'),
  updateNowBtn: document.getElementById('updateNowBtn'),
  updateLaterBtn: document.getElementById('updateLaterBtn'),
  syncModal: document.getElementById('syncModal'),
  syncModalTitle: document.getElementById('syncModalTitle'),
  syncModalHint: document.getElementById('syncModalHint'),
  syncCodeText: document.getElementById('syncCodeText'),
  syncModalCancelBtn: document.getElementById('syncModalCancelBtn'),
  syncModalConfirmBtn: document.getElementById('syncModalConfirmBtn'),
  srLive: document.getElementById('srLive')
};

function nword(v) { return String(v || '').trim().toLowerCase(); }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseDay(s) { const [y, m, d] = String(s || '').split('-').map(Number); return y && m && d ? new Date(y, m - 1, d) : null; }
function dayDiff(a, b) { const da = parseDay(a); const db = parseDay(b); return da && db ? Math.round((db - da) / 86400000) : 0; }
function addDays(s, x) { const d = parseDay(s) || new Date(); d.setDate(d.getDate() + x); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function shuffle(arr) { const x = [...arr]; for (let i = x.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1));[x[i], x[j]] = [x[j], x[i]]; } return x; }
function rkey(book, word) { return `${book}::${nword(word)}`; }
function ensureProgress(book) { if (!state.bookProgress[book]) state.bookProgress[book] = { learnedIndex: 0 }; }
function clearTimer() { if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null; } }

function getInstallDismissUntil() {
  return localStorage.getItem(INSTALL_DISMISS_KEY) || '';
}

function isInstallDismissed() {
  const until = getInstallDismissUntil();
  if (!until) return false;
  return dayDiff(today(), until) >= 0;
}

function dismissInstallEntry() {
  localStorage.setItem(INSTALL_DISMISS_KEY, addDays(today(), INSTALL_DISMISS_DAYS));
  updateInstallEntry();
}

function clearInstallDismiss() {
  localStorage.removeItem(INSTALL_DISMISS_KEY);
}

function showSessionToast(message) {
  if (!dom.sessionToast) return;
  if (sessionToastTimer) {
    clearTimeout(sessionToastTimer);
    sessionToastTimer = null;
  }
  dom.sessionToast.textContent = message || '已自动保存学习进度';
  dom.sessionToast.classList.remove('hidden');
  sessionToastTimer = setTimeout(() => {
    dom.sessionToast.classList.add('hidden');
    sessionToastTimer = null;
  }, 1600);
}

function announce(message) {
  if (!dom.srLive) return;
  dom.srLive.textContent = '';
  setTimeout(() => {
    dom.srLive.textContent = String(message || '').trim();
  }, 10);
}

function modeLabelSafe(mode) {
  if (mode === 'picture') return '图片选义';
  if (mode === 'listening') return '听音选义';
  if (mode === 'spelling') return '拼写';
  return '闪卡';
}

function studyLogSummary(days) {
  const n = Math.max(1, Number(days) || 7);
  const end = parseDay(today()) || new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (n - 1));
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return (state.studyLogs || []).filter((x) => x && x.date && x.date >= from && x.date <= today());
}

function renderInsights() {
  if (!dom.insightChart7d || !dom.insightAccuracy30d || !dom.insightModeGrid) return;
  const list7 = studyLogSummary(7);
  const byDay = new Map();
  list7.forEach((x) => {
    byDay.set(x.date, (byDay.get(x.date) || 0) + Math.max(0, Number(x.total) || 0));
  });

  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = addDays(today(), -i);
    days.push({ day: d, value: byDay.get(d) || 0 });
  }
  const maxVal = Math.max(1, ...days.map((x) => x.value));
  dom.insightChart7d.innerHTML = days.map((x) => {
    const h = Math.max(8, Math.round((x.value / maxVal) * 52));
    return `<div class="insight-bar" style="height:${h}px" title="${escapeHtml(x.day)}: ${x.value}"></div>`;
  }).join('');

  const list30 = studyLogSummary(30);
  let total30 = 0;
  let known30 = 0;
  list30.forEach((x) => {
    total30 += Math.max(0, Number(x.total) || 0);
    known30 += Math.max(0, Number(x.known) || 0);
  });
  const acc = total30 > 0 ? Math.round((known30 / total30) * 100) : 0;
  dom.insightAccuracy30d.textContent = `${acc}%`;

  const modeStats = {};
  list30.forEach((x) => {
    const m = String(x.mode || 'flashcard');
    if (!modeStats[m]) modeStats[m] = { total: 0, known: 0 };
    modeStats[m].total += Math.max(0, Number(x.total) || 0);
    modeStats[m].known += Math.max(0, Number(x.known) || 0);
  });
  const modes = ['flashcard', 'picture', 'listening', 'spelling'];
  dom.insightModeGrid.innerHTML = modes.map((m) => {
    const row = modeStats[m] || { total: 0, known: 0 };
    const v = row.total > 0 ? `${Math.round((row.known / row.total) * 100)}%` : '--';
    return (
      `<div class="insight-mode-item">`
        + `<div class="insight-mode-name">${escapeHtml(modeLabelSafe(m))}</div>`
        + `<div class="insight-mode-value">${escapeHtml(v)}</div>`
      + `</div>`
    );
  }).join('');
}

function recordStudyLog() {
  const total = Math.max(0, Number(sessionStudied) || 0);
  if (!total) return;
  const duration = sessionResult.endAt > sessionResult.startAt ? sessionResult.endAt - sessionResult.startAt : 0;
  const item = {
    date: today(),
    mode: state.learningMode,
    total,
    known: Math.max(0, Number(sessionResult.known) || 0),
    fuzzy: Math.max(0, Number(sessionResult.fuzzy) || 0),
    unknown: Math.max(0, Number(sessionResult.unknown) || 0),
    duration
  };
  if (!Array.isArray(state.studyLogs)) state.studyLogs = [];
  state.studyLogs.push(item);
  state.studyLogs = state.studyLogs.slice(-120);
}

function closeSyncModal() {
  if (!dom.syncModal) return;
  if (typeof dom.syncModal.close === 'function' && dom.syncModal.open) dom.syncModal.close();
}

function openSyncModal(mode) {
  if (!dom.syncModal || !dom.syncCodeText || !dom.syncModalTitle || !dom.syncModalHint) return;
  syncModalMode = mode;
  if (mode === 'export') {
    dom.syncModalTitle.textContent = '生成同步码';
    dom.syncModalHint.textContent = '复制同步码到另一台设备，使用“导入同步码”恢复数据。';
    try {
      dom.syncCodeText.value = encodeSyncPayload(backupPayload());
      if (dom.syncModalConfirmBtn) dom.syncModalConfirmBtn.disabled = false;
    } catch (e) {
      dom.syncCodeText.value = '';
      dom.syncModalHint.textContent = '当前数据较大，不适合同步码。请使用“导出备份”文件方式。';
      if (dom.syncModalConfirmBtn) dom.syncModalConfirmBtn.disabled = true;
    }
    dom.syncCodeText.readOnly = true;
  } else {
    dom.syncModalTitle.textContent = '导入同步码';
    dom.syncModalHint.textContent = '粘贴同步码后点击确定，将覆盖当前本地数据。';
    dom.syncCodeText.value = '';
    dom.syncCodeText.readOnly = false;
    if (dom.syncModalConfirmBtn) dom.syncModalConfirmBtn.disabled = false;
  }
  if (typeof dom.syncModal.showModal === 'function') dom.syncModal.showModal();
  else dom.syncModal.setAttribute('open', '');
  dom.syncCodeText.focus();
  dom.syncCodeText.select();
}

function confirmSyncModal() {
  if (!dom.syncCodeText) return;
  const code = String(dom.syncCodeText.value || '').trim();
  if (!code) {
    alert('同步码不能为空。');
    return;
  }
  if (syncModalMode === 'export') {
    try {
      navigator.clipboard && navigator.clipboard.writeText(code).catch(() => {});
      showSessionToast('同步码已生成，可复制到其他设备');
      announce('同步码已生成');
    } catch (e) {}
    closeSyncModal();
    return;
  }
  try {
    const parsed = decodeSyncPayload(code);
    const ok = window.confirm('导入同步码将覆盖当前学习数据，是否继续？');
    if (!ok) return;
    applyImportedBackup(parsed);
    closeSyncModal();
    showSessionToast('同步码导入成功');
    announce('同步码导入成功');
  } catch (e) {
    alert('同步码无效，请检查后重试。');
  }
}

function parseReminderMinutes(timeText) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(timeText || ''));
  if (!m) return 20 * 60;
  const hh = Math.max(0, Math.min(23, Number(m[1]) || 0));
  const mm = Math.max(0, Math.min(59, Number(m[2]) || 0));
  return hh * 60 + mm;
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let out = '';
  for (let i = 0; i < arr.length; i += 3) {
    const a = arr[i];
    const b = i + 1 < arr.length ? arr[i + 1] : 0;
    const c = i + 2 < arr.length ? arr[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += BASE64_ALPHABET[(triple >> 18) & 0x3f];
    out += BASE64_ALPHABET[(triple >> 12) & 0x3f];
    out += i + 1 < arr.length ? BASE64_ALPHABET[(triple >> 6) & 0x3f] : '=';
    out += i + 2 < arr.length ? BASE64_ALPHABET[triple & 0x3f] : '=';
  }
  return out;
}

function base64ToBytes(input) {
  const str = String(input || '').replace(/\s+/g, '');
  if (!str || str.length % 4 !== 0) throw new Error('invalid_base64');

  const table = {};
  for (let i = 0; i < BASE64_ALPHABET.length; i += 1) {
    table[BASE64_ALPHABET[i]] = i;
  }

  const output = [];
  for (let i = 0; i < str.length; i += 4) {
    const c1 = str[i];
    const c2 = str[i + 1];
    const c3 = str[i + 2];
    const c4 = str[i + 3];
    if (!(c1 in table) || !(c2 in table) || (c3 !== '=' && !(c3 in table)) || (c4 !== '=' && !(c4 in table))) {
      throw new Error('invalid_base64');
    }

    const b1 = table[c1];
    const b2 = table[c2];
    const b3 = c3 === '=' ? 0 : table[c3];
    const b4 = c4 === '=' ? 0 : table[c4];
    const triple = (b1 << 18) | (b2 << 12) | (b3 << 6) | b4;
    output.push((triple >> 16) & 0xff);
    if (c3 !== '=') output.push((triple >> 8) & 0xff);
    if (c4 !== '=') output.push(triple & 0xff);
  }

  return new Uint8Array(output);
}

function encodeSyncPayload(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > 1200000) throw new Error('sync_too_large');
  return bytesToBase64(bytes);
}

function decodeSyncPayload(code) {
  const bytes = base64ToBytes(code);
  const json = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  return JSON.parse(json);
}

function askNotificationPermissionIfNeeded() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function fireReminderNotification() {
  if (!state.reminderEnabled) return;
  const title = '背单词提醒';
  const body = '到时间学习了，今天也保持进步。';
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag: 'vocab-daily-reminder', renotify: true });
    } catch (e) {}
  } else {
    showSessionToast(body);
  }
  announce('学习提醒已触发');
}

function scheduleReminder() {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
  if (!state.reminderEnabled) return;

  const now = new Date();
  const mins = parseReminderMinutes(state.reminderTime);
  const target = new Date(now);
  target.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = Math.max(15000, target.getTime() - now.getTime());
  reminderTimer = setTimeout(() => {
    fireReminderNotification();
    scheduleReminder();
  }, delay);
}

function normalizeStaticLabels() {
  document.title = '背单词';
  if (dom.exportDataBtn) dom.exportDataBtn.textContent = '导出备份';
  if (dom.importDataBtn) dom.importDataBtn.textContent = '导入备份';
  if (dom.syncCodeExportBtn) dom.syncCodeExportBtn.textContent = '生成同步码';
  if (dom.syncCodeImportBtn) dom.syncCodeImportBtn.textContent = '导入同步码';
  if (dom.importWordsJsonBtn) dom.importWordsJsonBtn.textContent = '导入词表JSON';
  if (dom.resultBackBtn) dom.resultBackBtn.textContent = '返回首页';
  if (dom.resultNextBtn) dom.resultNextBtn.textContent = '继续学习';
  if (dom.wrongPracticeBtn) dom.wrongPracticeBtn.textContent = '练习这些错题';
  if (dom.wrongClearBtn) dom.wrongClearBtn.textContent = '清空错题记录';
  if (dom.wrongClearHardBtn) dom.wrongClearHardBtn.textContent = '清理高频错题';
  if (dom.wrongClearOldBtn) dom.wrongClearOldBtn.textContent = `清理${WRONG_CLEAN_DAYS}天前`;
  if (dom.wrongExportBtn) dom.wrongExportBtn.textContent = '导出错题';
}

function ensureVocabLibraryLoaded() {
  if (vocabLibraryReady) return Promise.resolve();
  if (vocabLibraryPromise) return vocabLibraryPromise;

  vocabLibraryPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = './vocab_library.js';
    script.async = true;
    script.onload = () => {
      vocabLibraryReady = typeof window.getLibrary === 'function';
      resolve();
    };
    script.onerror = () => {
      showSessionToast('词库加载失败，请检查网络后重试');
      resolve();
    };
    document.body.appendChild(script);
  }).finally(() => {
    vocabLibraryPromise = null;
  });

  return vocabLibraryPromise;
}

function clampNumber(value, min, max, fallback) {
  if (window.VocabCore && typeof window.VocabCore.clampNumber === 'function') {
    return window.VocabCore.clampNumber(value, min, max, fallback);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function intervalToLevel(days) {
  if (window.VocabCore && typeof window.VocabCore.intervalToLevel === 'function') {
    return window.VocabCore.intervalToLevel(days);
  }
  const d = Math.max(0, Number(days) || 0);
  if (d >= 60) return 5;
  if (d >= 21) return 4;
  if (d >= 7) return 3;
  if (d >= 3) return 2;
  if (d >= 1) return 1;
  return 0;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hydrateReviewFields() {
  if (!state || !state.wordRecords || typeof state.wordRecords !== 'object') return;
  state.schemaVersion = STATE_SCHEMA_VERSION;
  Object.keys(state.wordRecords).forEach((key) => {
    const r = state.wordRecords[key];
    if (!r || typeof r !== 'object') return;
    const level = Math.max(0, Number(r.level) || 0);
    const baseInterval = Math.max(0, REVIEW_INTERVALS[Math.min(level, REVIEW_INTERVALS.length - 1)] || 0);
    r.lapseCount = Math.max(0, Number(r.lapseCount) || 0);
    r.repetition = Math.max(0, Number(r.repetition) || 0);
    r.intervalDays = Math.max(0, Number(r.intervalDays) || baseInterval);
    r.easeFactor = clampNumber(r.easeFactor, SM2_MIN_EASE, SM2_MAX_EASE, SM2_DEFAULT_EASE);
    if (!['known', 'fuzzy', 'unknown'].includes(r.lastResult)) r.lastResult = '';
  });
}

function normalizeQueueWord(item) {
  if (!item || typeof item !== 'object' || !item.word || !item.definition) return null;
  const out = {
    word: String(item.word).trim(),
    definition: String(item.definition).trim(),
    phonetic: String(item.phonetic || '').trim(),
    mnemonic: String(item.mnemonic || '').trim(),
    etymology: String(item.etymology || '').trim(),
    example: String(item.example || '').trim(),
    isReview: Boolean(item.isReview),
    currentLevel: Math.max(0, Number(item.currentLevel) || 0),
    retryCount: Math.max(0, Number(item.retryCount) || 0)
  };
  if (Number.isInteger(item.originalIndex) && item.originalIndex >= 0) out.originalIndex = item.originalIndex;
  return out;
}

function getSavedSession() {
  const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !MODES.has(data.mode)) return null;
    const bookId = ['cet4', 'cet6', 'kaoyan'].includes(data.bookId) ? data.bookId : 'cet4';
    const queue = Array.isArray(data.queue) ? data.queue.map(normalizeQueueWord).filter(Boolean) : [];
    if (!queue.length) return null;
    const index = Math.max(0, Math.min(Number(data.index) || 0, queue.length - 1));
    const studied = Math.max(0, Number(data.studied) || 0);
    const result = data.result && typeof data.result === 'object' ? data.result : {};
    const normalizedResult = {
      startAt: Number(result.startAt) || 0,
      endAt: Number(result.endAt) || 0,
      known: Math.max(0, Number(result.known) || 0),
      fuzzy: Math.max(0, Number(result.fuzzy) || 0),
      unknown: Math.max(0, Number(result.unknown) || 0),
      newWords: Math.max(0, Number(result.newWords) || 0),
      reviewWords: Math.max(0, Number(result.reviewWords) || 0)
    };
    return { mode: data.mode, bookId, queue, index, studied, result: normalizedResult };
  } catch (e) {
    return null;
  }
}

function saveActiveSession() {
  if (!sessionQueue.length || sessionIndex >= sessionQueue.length) {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    return;
  }
  const payload = {
    version: 1,
    mode: state.learningMode,
    bookId: state.currentBook,
    queue: sessionQueue,
    index: sessionIndex,
    studied: sessionStudied,
    result: sessionResult,
    savedAt: Date.now()
  };
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(payload));
}

function clearActiveSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

function backupPayload() {
  const activeSession = getSavedSession();
  return {
    app: 'vocab-flashcard',
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state,
    activeSession
  };
}

function exportBackup() {
  try {
    const payload = backupPayload();
    const data = JSON.stringify(payload, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = today().replace(/-/g, '');
    a.href = url;
    a.download = `vocab-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('导出失败，请稍后重试。');
  }
}

function applyImportedBackup(data) {
  let nextState = null;
  let nextSession = null;

  if (data && typeof data === 'object' && data.state && typeof data.state === 'object') {
    nextState = normalizeState(applyStateMigrations(data.state));
    if (data.activeSession && typeof data.activeSession === 'object') {
      const tmp = data.activeSession;
      const wrapped = {
        mode: tmp.mode,
        bookId: tmp.bookId,
        queue: tmp.queue,
        index: tmp.index,
        studied: tmp.studied,
        result: tmp.result
      };
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(wrapped));
      nextSession = getSavedSession();
    } else {
      clearActiveSession();
    }
  } else if (data && typeof data === 'object') {
    nextState = normalizeState(data);
    clearActiveSession();
  }

  if (!nextState) {
    throw new Error('invalid backup');
  }

  state = nextState;
  scheduleReminder();
  hydrateReviewFields();
  sessionQueue = [];
  sessionIndex = 0;
  sessionStudied = 0;
  pendingPlan = null;
  currentWord = null;
  answerLocked = false;
  sessionResult = {
    startAt: 0,
    endAt: 0,
    known: 0,
    fuzzy: 0,
    unknown: 0,
    newWords: 0,
    reviewWords: 0
  };
  clearTimer();
  hideFeedback();

  saveState();
  if (!nextSession) clearActiveSession();
  showDashboard();
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsText(file, 'utf-8');
  });
}

function triggerImportBackup() {
  if (!dom.backupFileInput) return;
  dom.backupFileInput.value = '';
  dom.backupFileInput.click();
}

async function handleBackupFileChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await readFileText(file);
    const json = JSON.parse(text);
    const ok = window.confirm('导入会覆盖当前学习进度与词库，是否继续？');
    if (!ok) return;
    applyImportedBackup(json);
    alert('导入成功。');
  } catch (e) {
    alert('导入失败：文件格式无效或内容损坏。');
  } finally {
    if (dom.backupFileInput) dom.backupFileInput.value = '';
  }
}

function applyStateMigrations(raw) {
  const src = raw && typeof raw === 'object' ? JSON.parse(JSON.stringify(raw)) : {};
  let version = Math.max(0, Number(src.schemaVersion) || 0);

  if (version < 1) {
    version = 1;
  }

  if (version < 2) {
    if (src.wordRecords && typeof src.wordRecords === 'object') {
      Object.keys(src.wordRecords).forEach((key) => {
        const r = src.wordRecords[key];
        if (!r || typeof r !== 'object') return;
        r.lapseCount = Math.max(0, Number(r.lapseCount) || 0);
        r.repetition = Math.max(0, Number(r.repetition) || 0);
        r.intervalDays = Math.max(0, Number(r.intervalDays) || 0);
        r.easeFactor = clampNumber(r.easeFactor, SM2_MIN_EASE, SM2_MAX_EASE, SM2_DEFAULT_EASE);
        if (!['known', 'fuzzy', 'unknown'].includes(r.lastResult)) r.lastResult = '';
      });
    }
    version = 2;
  }

  if (version < 3) {
    src.reminderEnabled = Boolean(src.reminderEnabled);
    src.reminderTime = typeof src.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(src.reminderTime)
      ? src.reminderTime
      : '20:00';
    src.studyLogs = Array.isArray(src.studyLogs) ? src.studyLogs : [];
    version = 3;
  }

  src.schemaVersion = Math.max(STATE_SCHEMA_VERSION, version);
  return src;
}

function triggerImportWordsJson() {
  if (!dom.wordJsonInput) return;
  dom.wordJsonInput.value = '';
  dom.wordJsonInput.click();
}

function normalizeJsonWordItem(item) {
  if (!item) return null;

  if (Array.isArray(item)) {
    const w = String(item[0] || '').trim();
    const d = String(item[1] || '').trim();
    if (!w || !d) return null;
    return { word: w, definition: d, phonetic: '', mnemonic: '', etymology: '', example: '' };
  }

  if (typeof item === 'string') {
    const text = item.trim();
    if (!text) return null;
    const parts = text.split(/[,\t，]/).map((x) => x.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    return {
      word: parts[0],
      definition: parts.slice(1).join('，'),
      phonetic: '',
      mnemonic: '',
      etymology: '',
      example: ''
    };
  }

  if (typeof item !== 'object') return null;

  const word = String(item.word || item.term || item.vocab || item.text || item.name || item.en || item.english || '').trim();
  let def = item.definition ?? item.meaning ?? item.translation ?? item.cn ?? item.zh ?? item.explain ?? item.gloss ?? '';
  if (Array.isArray(def)) def = def.map((x) => String(x || '').trim()).filter(Boolean).join('；');
  if (def && typeof def === 'object') def = JSON.stringify(def);
  def = String(def || '').trim();
  if (!word || !def) return null;

  const phonetic = String(item.phonetic || item.pronunciation || item.pronounce || '').trim();
  const mnemonic = String(item.mnemonic || item.memory || '').trim();
  const etymology = String(item.etymology || item.origin || '').trim();
  const example = String(item.example || item.sentence || '').trim();
  return { word, definition: def, phonetic, mnemonic, etymology, example };
}

function pickWordArrayFromJson(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const candidateKeys = ['words', 'list', 'data', 'items', 'vocabulary', 'vocab', 'entries', 'wordList'];
  for (let i = 0; i < candidateKeys.length; i += 1) {
    const k = candidateKeys[i];
    if (Array.isArray(data[k])) return data[k];
  }

  const firstLevel = Object.keys(data);
  for (let i = 0; i < firstLevel.length; i += 1) {
    const obj = data[firstLevel[i]];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue;
    for (let j = 0; j < candidateKeys.length; j += 1) {
      const k = candidateKeys[j];
      if (Array.isArray(obj[k])) return obj[k];
    }
  }

  const values = Object.values(data);
  const isDictionaryShape = values.length > 0 && values.every((v) => ['string', 'number', 'boolean'].includes(typeof v));
  if (isDictionaryShape) {
    return Object.keys(data).map((k) => ({ word: k, definition: data[k] }));
  }

  return [];
}

function parseWordsFromJsonPayload(payload) {
  const arr = pickWordArrayFromJson(payload);
  return arr.map(normalizeJsonWordItem).filter(Boolean);
}

function appendWordsToCurrentBook(words) {
  const book = state.currentBook;
  if (!Array.isArray(state.customWords[book])) state.customWords[book] = [];

  const existing = new Set(getLibraryFor(book).map((w) => nword(w.word)));
  let added = 0;
  let duplicated = 0;
  let invalid = 0;

  words.forEach((w) => {
    const item = normalizeJsonWordItem(w);
    if (!item) {
      invalid += 1;
      return;
    }
    const key = nword(item.word);
    if (!key) {
      invalid += 1;
      return;
    }
    if (existing.has(key)) {
      duplicated += 1;
      return;
    }
    state.customWords[book].push(item);
    existing.add(key);
    added += 1;
  });

  if (added > 0) {
    saveState();
    updateDashboard();
  }

  return { added, duplicated, invalid };
}

async function handleWordJsonFileChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const okLib = await ensureLibraryBeforeAction();
    if (!okLib) return;
    const text = await readFileText(file);
    const payload = JSON.parse(text);
    const parsed = parseWordsFromJsonPayload(payload);
    if (!parsed.length) {
      alert('未识别到可导入的单词。支持数组词表或 {word: definition} 字典格式。');
      return;
    }
    const stat = appendWordsToCurrentBook(parsed);
    alert(`导入完成：新增 ${stat.added}，重复 ${stat.duplicated}，无效 ${stat.invalid}`);
    announce(`词表导入完成，新增 ${stat.added} 个`);
  } catch (e) {
    alert('JSON 导入失败，请检查文件格式。');
  } finally {
    if (dom.wordJsonInput) dom.wordJsonInput.value = '';
  }
}

function normalizeState(raw) {
  const s = JSON.parse(JSON.stringify(DEFAULT_STATE));
  s.schemaVersion = STATE_SCHEMA_VERSION;
  if (!raw || typeof raw !== 'object') return s;
  if (['cet4', 'cet6', 'kaoyan'].includes(raw.currentBook)) s.currentBook = raw.currentBook;
  const g = Number(raw.dailyGoal); s.dailyGoal = Number.isFinite(g) ? Math.max(5, Math.min(50, g)) : s.dailyGoal;
  if (MODES.has(raw.learningMode)) s.learningMode = raw.learningMode;
  s.totalLearned = Math.max(0, Number(raw.totalLearned) || 0);
  s.streak = Math.max(0, Number(raw.streak) || 0);
  s.lastStudyDate = typeof raw.lastStudyDate === 'string' ? raw.lastStudyDate : null;
  s.todayNewCount = Math.max(0, Number(raw.todayNewCount) || 0);
  s.todayReviewCount = Math.max(0, Number(raw.todayReviewCount) || 0);
  if (raw.bookProgress && typeof raw.bookProgress === 'object') ['cet4', 'cet6', 'kaoyan'].forEach((b) => {
    const x = raw.bookProgress[b]; if (x && typeof x === 'object') s.bookProgress[b] = { learnedIndex: Math.max(0, Number(x.learnedIndex) || 0) };
  });
  if (raw.customWords && typeof raw.customWords === 'object') ['cet4', 'cet6', 'kaoyan'].forEach((b) => {
    const list = raw.customWords[b]; if (Array.isArray(list)) s.customWords[b] = list.filter((w) => w && w.word && w.definition).map((w) => ({ word: String(w.word).trim(), definition: String(w.definition).trim(), phonetic: String(w.phonetic || '').trim(), mnemonic: String(w.mnemonic || '').trim(), etymology: String(w.etymology || '').trim(), example: String(w.example || '').trim() }));
  });
  if (raw.wordRecords && typeof raw.wordRecords === 'object') {
    const out = {};
    Object.keys(raw.wordRecords).forEach((k) => {
      const v = raw.wordRecords[k]; if (!v || typeof v !== 'object') return;
      let book = v.bookId; let word = v.word;
      if (!word) { if (k.includes('::')) { const p = k.split('::'); book = book || p[0]; word = p.slice(1).join('::'); } else word = k; }
      if (!word) return; if (!['cet4', 'cet6', 'kaoyan'].includes(book)) book = s.currentBook;
      out[rkey(book, word)] = { bookId: book, word: String(word).trim(), level: Math.max(0, Math.min(REVIEW_INTERVALS.length - 1, Number(v.level) || 0)), firstSeen: v.firstSeen || today(), lastSeen: v.lastSeen || today(), nextReviewDate: v.nextReviewDate || today(), correctCount: Math.max(0, Number(v.correctCount) || 0), incorrectCount: Math.max(0, Number(v.incorrectCount) || 0), fuzzyCount: Math.max(0, Number(v.fuzzyCount) || 0) };
    });
    s.wordRecords = out;
  }
  s.reminderEnabled = Boolean(raw && raw.reminderEnabled);
  s.reminderTime = raw && typeof raw.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(raw.reminderTime)
    ? raw.reminderTime
    : '20:00';
  s.studyLogs = Array.isArray(raw && raw.studyLogs)
    ? raw.studyLogs
      .map((x) => ({
        date: String((x && x.date) || ''),
        mode: String((x && x.mode) || ''),
        total: Math.max(0, Number(x && x.total) || 0),
        known: Math.max(0, Number(x && x.known) || 0),
        fuzzy: Math.max(0, Number(x && x.fuzzy) || 0),
        unknown: Math.max(0, Number(x && x.unknown) || 0),
        duration: Math.max(0, Number(x && x.duration) || 0)
      }))
      .filter((x) => x.date)
      .slice(-120)
    : [];
  return s;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    return;
  }
  try {
    state = normalizeState(applyStateMigrations(JSON.parse(raw)));
  } catch (e) {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
  if (state.lastStudyDate !== today()) {
    state.todayNewCount = 0; state.todayReviewCount = 0;
    if (state.lastStudyDate && dayDiff(state.lastStudyDate, today()) > 1) state.streak = 0;
  }
}

function saveState() {
  state.schemaVersion = STATE_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function markStudyToday() {
  const t = today();
  if (state.lastStudyDate === t) return;
  if (!state.lastStudyDate) state.streak = 1; else state.streak = dayDiff(state.lastStudyDate, t) === 1 ? state.streak + 1 : 1;
  state.todayNewCount = 0; state.todayReviewCount = 0; state.lastStudyDate = t;
}

function getBookName(book) {
  if (typeof getLibraryConfig === 'function') { const c = getLibraryConfig(book); if (c && c.name) return c.name; }
  return book === 'cet6' ? '大学英语六级' : book === 'kaoyan' ? '考研英语' : '大学英语四级';
}

function getLibraryFor(book = state.currentBook) {
  const base = typeof getLibrary === 'function' ? (getLibrary(book) || []) : [];
  const custom = state.customWords[book] || [];
  const seen = new Set(); const out = [];
  [...base, ...custom].forEach((w) => {
    if (!w || !w.word || !w.definition) return;
    const k = nword(w.word); if (!k || seen.has(k)) return; seen.add(k);
    out.push({ word: String(w.word).trim(), definition: String(w.definition).trim(), phonetic: String(w.phonetic || '').trim(), mnemonic: String(w.mnemonic || '').trim(), etymology: String(w.etymology || '').trim(), example: String(w.example || '').trim() });
  });
  return out;
}

function pendingReviewCount(book = state.currentBook) {
  const t = today(); let n = 0;
  Object.keys(state.wordRecords).forEach((k) => {
    const r = state.wordRecords[k];
    if (r && r.bookId === book && r.nextReviewDate && r.nextReviewDate <= t) n += 1;
  });
  return n;
}

function pendingWrongCount(book = state.currentBook) {
  let n = 0;
  Object.keys(state.wordRecords).forEach((k) => {
    const r = state.wordRecords[k];
    if (!r || r.bookId !== book) return;
    const incorrect = Math.max(0, Number(r.incorrectCount) || 0);
    const fuzzy = Math.max(0, Number(r.fuzzyCount) || 0);
    if (incorrect > 0 || fuzzy >= 2) n += 1;
  });
  return n;
}

function generateWrongQueue(limit = Math.max(20, state.dailyGoal)) {
  const book = state.currentBook;
  const lib = getLibraryFor(book);
  if (!lib.length) return [];

  if (window.VocabCore && typeof window.VocabCore.buildWrongQueue === 'function') {
    return window.VocabCore.buildWrongQueue({
      bookId: book,
      library: lib,
      records: state.wordRecords,
      limit
    });
  }

  const byWord = new Map();
  lib.forEach((w, i) => {
    byWord.set(nword(w.word), { ...w, originalIndex: i });
  });

  const ranked = [];
  Object.keys(state.wordRecords).forEach((k) => {
    const r = state.wordRecords[k];
    if (!r || r.bookId !== book || !r.word) return;
    const libWord = byWord.get(nword(r.word));
    if (!libWord) return;

    const incorrect = Math.max(0, Number(r.incorrectCount) || 0);
    const fuzzy = Math.max(0, Number(r.fuzzyCount) || 0);
    const correct = Math.max(0, Number(r.correctCount) || 0);
    if (incorrect <= 0 && fuzzy < 2) return;

    const level = Math.max(0, Number(r.level) || 0);
    const lapse = Math.max(0, Number(r.lapseCount) || 0);
    const lastPenalty = r.lastResult === 'unknown' ? 2 : r.lastResult === 'fuzzy' ? 1 : 0;
    const score = incorrect * 2 + fuzzy + lapse + lastPenalty - Math.floor(correct / 2) - level;
    ranked.push({
      ...libWord,
      isReview: true,
      currentLevel: level,
      wrongScore: score
    });
  });

  ranked.sort((a, b) => (b.wrongScore || 0) - (a.wrongScore || 0));
  return ranked.slice(0, limit).map((w) => {
    const out = { ...w };
    delete out.wrongScore;
    return out;
  });
}

function getWrongEntries(book = state.currentBook, limit = 200) {
  const lib = getLibraryFor(book);
  const byWord = new Map();
  lib.forEach((w) => byWord.set(nword(w.word), w));

  const list = [];
  Object.keys(state.wordRecords).forEach((k) => {
    const r = state.wordRecords[k];
    if (!r || r.bookId !== book || !r.word) return;

    const incorrect = Math.max(0, Number(r.incorrectCount) || 0);
    const fuzzy = Math.max(0, Number(r.fuzzyCount) || 0);
    const lapse = Math.max(0, Number(r.lapseCount) || 0);
    if (incorrect <= 0 && fuzzy < 2) return;

    const info = byWord.get(nword(r.word));
    const score = incorrect * 2 + fuzzy + lapse + (r.lastResult === 'unknown' ? 2 : r.lastResult === 'fuzzy' ? 1 : 0);
    list.push({
      key: k,
      bookId: book,
      word: r.word,
      definition: info ? info.definition : '',
      incorrect,
      fuzzy,
      lapse,
      lastSeen: r.lastSeen || '',
      nextReviewDate: r.nextReviewDate || '',
      score
    });
  });

  list.sort((a, b) => b.score - a.score);
  return list.slice(0, Math.max(1, Number(limit) || 200));
}

function normalizeSearchText(value) {
  if (window.VocabCore && typeof window.VocabCore.normalizeSearchText === 'function') {
    return window.VocabCore.normalizeSearchText(value);
  }
  return String(value || '').trim().toLowerCase();
}

function wrongEntryMatches(entry, keyword) {
  if (window.VocabCore && typeof window.VocabCore.wrongEntryMatches === 'function') {
    return window.VocabCore.wrongEntryMatches(entry, keyword);
  }
  const k = normalizeSearchText(keyword);
  if (!k) return true;
  const word = normalizeSearchText(entry.word);
  const def = normalizeSearchText(entry.definition);
  return word.includes(k) || def.includes(k);
}

function sortWrongEntries(list, sortKey) {
  if (window.VocabCore && typeof window.VocabCore.sortWrongEntries === 'function') {
    return window.VocabCore.sortWrongEntries(list, sortKey);
  }
  const x = [...list];
  if (sortKey === 'alpha') {
    x.sort((a, b) => String(a.word || '').localeCompare(String(b.word || ''), 'en'));
    return x;
  }
  if (sortKey === 'due') {
    x.sort((a, b) => String(a.nextReviewDate || '').localeCompare(String(b.nextReviewDate || '')));
    return x;
  }
  if (sortKey === 'recent') {
    x.sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || '')));
    return x;
  }
  x.sort((a, b) => b.score - a.score);
  return x;
}

function syncWrongFilterControls() {
  if (dom.wrongSearchInput) dom.wrongSearchInput.value = wrongBookFilters.keyword;
  if (dom.wrongSortSelect) dom.wrongSortSelect.value = wrongBookFilters.sort;
  if (dom.wrongOnlyHardChk) dom.wrongOnlyHardChk.checked = wrongBookFilters.onlyHard;
}

function saveWrongFilters() {
  const payload = {
    keyword: String(wrongBookFilters.keyword || '').trim(),
    sort: String(wrongBookFilters.sort || 'score'),
    onlyHard: Boolean(wrongBookFilters.onlyHard)
  };
  localStorage.setItem(WRONG_FILTERS_KEY, JSON.stringify(payload));
}

function loadWrongFilters() {
  const raw = localStorage.getItem(WRONG_FILTERS_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    wrongBookFilters.keyword = String(data.keyword || '').trim();
    wrongBookFilters.sort = String(data.sort || 'score');
    wrongBookFilters.onlyHard = Boolean(data.onlyHard);
  } catch (e) {
    wrongBookFilters.keyword = '';
    wrongBookFilters.sort = 'score';
    wrongBookFilters.onlyHard = false;
  }
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightKeyword(text, keyword) {
  const source = String(text || '');
  const k = String(keyword || '').trim();
  if (!k) return escapeHtml(source);
  try {
    const re = new RegExp(`(${escapeRegExp(k)})`, 'ig');
    return escapeHtml(source).replace(re, '<span class="wrong-highlight">$1</span>');
  } catch (e) {
    return escapeHtml(source);
  }
}

function getVisibleWrongEntries(book = state.currentBook) {
  const allEntries = getWrongEntries(book, 2000);
  if (window.VocabCore && typeof window.VocabCore.filterWrongEntries === 'function') {
    return window.VocabCore.filterWrongEntries(allEntries, wrongBookFilters);
  }
  const filtered = allEntries
    .filter((item) => wrongEntryMatches(item, wrongBookFilters.keyword))
    .filter((item) => !wrongBookFilters.onlyHard || item.score >= 6);
  return sortWrongEntries(filtered, wrongBookFilters.sort);
}

function generateSessionQueue() {
  const book = state.currentBook; ensureProgress(book);
  const lib = getLibraryFor(book); if (!lib.length) return [];
  const byWord = new Map(); lib.forEach((w, i) => byWord.set(nword(w.word), { ...w, originalIndex: i }));
  const review = []; const t = today();
  Object.keys(state.wordRecords).forEach((k) => {
    const r = state.wordRecords[k]; if (!r || r.bookId !== book || !r.nextReviewDate || r.nextReviewDate > t) return;
    const x = byWord.get(nword(r.word)); if (!x) return; review.push({ ...x, isReview: true, currentLevel: r.level || 0 });
  });
  const reviewSet = new Set(review.map((w) => nword(w.word)));
  const need = Math.max(0, state.dailyGoal - state.todayNewCount);
  const news = [];
  for (let i = state.bookProgress[book].learnedIndex; i < lib.length && news.length < need; i += 1) {
    const w = lib[i]; if (state.wordRecords[rkey(book, w.word)] || reviewSet.has(nword(w.word))) continue;
    news.push({ ...w, isReview: false, currentLevel: 0, originalIndex: i });
  }
  return shuffle([...review, ...news]);
}

function updateWordRecord(wordObj, status) {
  const book = state.currentBook; const t = today(); const key = rkey(book, wordObj.word);
  const r = state.wordRecords[key] || { bookId: book, word: wordObj.word, level: 0, firstSeen: t, lastSeen: t, nextReviewDate: t, correctCount: 0, incorrectCount: 0, fuzzyCount: 0 };
  r.lastSeen = t;
  if (status === 'known') { r.level = Math.min(r.level + 1, REVIEW_INTERVALS.length - 1); r.correctCount += 1; }
  else if (status === 'unknown') { r.level = 0; r.incorrectCount += 1; }
  else { r.level = Math.max(r.level - 1, 0); r.fuzzyCount += 1; }
  r.nextReviewDate = addDays(t, REVIEW_INTERVALS[r.level] || 0);
  state.wordRecords[key] = r;
}

function updateWordRecord(wordObj, status) {
  const book = state.currentBook;
  const t = today();
  const key = rkey(book, wordObj.word);
  const existing = state.wordRecords[key] || {
    bookId: book,
    word: wordObj.word,
    level: 0,
    firstSeen: t,
    lastSeen: t,
    nextReviewDate: t,
    correctCount: 0,
    incorrectCount: 0,
    fuzzyCount: 0,
    lapseCount: 0,
    repetition: 0,
    intervalDays: 0,
    easeFactor: SM2_DEFAULT_EASE
  };

  const r = { ...existing };
  r.bookId = book;
  r.word = wordObj.word;
  r.firstSeen = String(r.firstSeen || t);
  r.lastSeen = t;
  r.correctCount = Math.max(0, Number(r.correctCount) || 0);
  r.incorrectCount = Math.max(0, Number(r.incorrectCount) || 0);
  r.fuzzyCount = Math.max(0, Number(r.fuzzyCount) || 0);
  r.lapseCount = Math.max(0, Number(r.lapseCount) || 0);

  let level = Math.max(0, Number(r.level) || 0);
  let repetition = Math.max(0, Number(r.repetition) || 0);
  let intervalDays = clampNumber(
    r.intervalDays,
    0,
    SM2_MAX_INTERVAL_DAYS,
    Math.max(0, REVIEW_INTERVALS[Math.min(level, REVIEW_INTERVALS.length - 1)] || 0)
  );
  let easeFactor = clampNumber(r.easeFactor, SM2_MIN_EASE, SM2_MAX_EASE, SM2_DEFAULT_EASE);

  if (window.VocabCore && typeof window.VocabCore.computeReviewProgress === 'function') {
    const next = window.VocabCore.computeReviewProgress(
      { level, repetition, intervalDays, easeFactor },
      status,
      {
        sm2MinEase: SM2_MIN_EASE,
        sm2MaxEase: SM2_MAX_EASE,
        sm2DefaultEase: SM2_DEFAULT_EASE,
        sm2MaxIntervalDays: SM2_MAX_INTERVAL_DAYS
      }
    );
    level = next.level;
    repetition = next.repetition;
    intervalDays = next.intervalDays;
    easeFactor = next.easeFactor;
    if (status === 'unknown') {
      r.incorrectCount += 1;
      r.lapseCount += 1;
    } else if (status === 'fuzzy') {
      r.fuzzyCount += 1;
      r.lapseCount += 1;
    } else {
      r.correctCount += 1;
    }

    intervalDays = clampNumber(intervalDays, 1, SM2_MAX_INTERVAL_DAYS, 1);
    r.level = level;
    r.repetition = repetition;
    r.intervalDays = intervalDays;
    r.easeFactor = easeFactor;
    r.lastResult = status;
    r.nextReviewDate = addDays(t, intervalDays);
    state.wordRecords[key] = r;
    return;
  }

  if (status === 'unknown') {
    r.incorrectCount += 1;
    r.lapseCount += 1;
    repetition = 0;
    intervalDays = 1;
    easeFactor = Math.max(SM2_MIN_EASE, easeFactor - 0.2);
    level = Math.max(0, level - 1);
  } else if (status === 'fuzzy') {
    r.fuzzyCount += 1;
    r.lapseCount += 1;
    if (repetition === 0) {
      repetition = 1;
      intervalDays = 1;
    } else if (repetition === 1) {
      repetition = 2;
      intervalDays = 2;
    } else {
      repetition += 1;
      intervalDays = Math.max(2, Math.round(intervalDays * 0.75));
    }
    easeFactor = Math.max(SM2_MIN_EASE, easeFactor - 0.05);
    level = Math.max(0, intervalToLevel(intervalDays) - 1);
  } else {
    r.correctCount += 1;
    if (repetition === 0) intervalDays = 1;
    else if (repetition === 1) intervalDays = 3;
    else intervalDays = Math.max(4, Math.round(intervalDays * easeFactor));
    repetition += 1;
    easeFactor = Math.min(SM2_MAX_EASE, easeFactor + 0.02);
    level = intervalToLevel(intervalDays);
  }

  intervalDays = clampNumber(intervalDays, 1, SM2_MAX_INTERVAL_DAYS, 1);
  r.level = level;
  r.repetition = repetition;
  r.intervalDays = intervalDays;
  r.easeFactor = easeFactor;
  r.lastResult = status;
  r.nextReviewDate = addDays(t, intervalDays);

  state.wordRecords[key] = r;
}

function applyStudy(status) {
  if (!currentWord) return;
  markStudyToday();
  updateWordRecord(currentWord, status);
  const key = rkey(state.currentBook, currentWord.word);
  if (!sessionWordStats[key]) {
    sessionWordStats[key] = {
      word: currentWord.word,
      definition: currentWord.definition || '',
      known: 0,
      fuzzy: 0,
      unknown: 0
    };
  }
  if (status === 'known') sessionWordStats[key].known += 1;
  else if (status === 'fuzzy') sessionWordStats[key].fuzzy += 1;
  else sessionWordStats[key].unknown += 1;
  ensureProgress(state.currentBook);
  if (!currentWord.isReview && Number.isInteger(currentWord.originalIndex)) {
    state.bookProgress[state.currentBook].learnedIndex = Math.max(state.bookProgress[state.currentBook].learnedIndex, currentWord.originalIndex + 1);
    state.todayNewCount += 1;
  } else state.todayReviewCount += 1;
  sessionStudied += 1;
  state.totalLearned += 1;

  if (status === 'known') sessionResult.known += 1;
  else if (status === 'fuzzy') sessionResult.fuzzy += 1;
  else sessionResult.unknown += 1;

  if (!currentWord.isReview && Number.isInteger(currentWord.originalIndex)) sessionResult.newWords += 1;
  else sessionResult.reviewWords += 1;

  saveState();
}

function enqueueRetryWord(status) {
  if (!currentWord) return;
  if (status !== 'unknown' && status !== 'fuzzy') return;

  const currentRetry = Math.max(0, Number(currentWord.retryCount) || 0);
  const maxRetry = status === 'unknown' ? 2 : 1;
  if (currentRetry >= maxRetry) return;

  const gapMin = status === 'unknown' ? 2 : 4;
  const gapMax = status === 'unknown' ? 4 : 6;
  const gap = gapMin + Math.floor(Math.random() * (gapMax - gapMin + 1));
  const insertAt = Math.min(sessionQueue.length, sessionIndex + gap + 1);

  const retryWord = normalizeQueueWord({
    ...currentWord,
    isReview: true,
    retryCount: currentRetry + 1
  });
  if (!retryWord) return;
  sessionQueue.splice(insertAt, 0, retryWord);
}

function hideFeedback() {
  dom.pictureFeedback.classList.add('hidden');
  dom.listeningFeedback.classList.add('hidden');
  dom.spellingFeedback.classList.add('hidden');
}

function showOnly(view) {
  [dom.dashboardView, dom.planView, dom.flashcardView, dom.pictureView, dom.listeningView, dom.spellingView, dom.resultView, dom.wrongView].forEach((v) => {
    if (v === view) v.classList.remove('hidden'); else v.classList.add('hidden');
  });
  setTimeout(() => {
    if (!view) return;
    const target = view.querySelector('.back-btn, .start-btn, button, input, textarea, select');
    if (target && typeof target.focus === 'function') target.focus();
  }, 0);
}

function updateProgress(fill, text) {
  const total = sessionQueue.length;
  const cur = total ? Math.min(sessionIndex + 1, total) : 0;
  fill.style.width = `${total ? (cur / total) * 100 : 0}%`;
  text.textContent = `${cur} / ${total}`;
}

function updateDashboard() {
  const review = pendingReviewCount(state.currentBook);
  const pendingNew = Math.max(0, state.dailyGoal - state.todayNewCount);
  const wrong = pendingWrongCount(state.currentBook);
  dom.currentPlan.textContent = `当前计划：${getBookName(state.currentBook)}`;
  dom.statLearned.textContent = String(state.todayNewCount + state.todayReviewCount);
  dom.statStreak.textContent = String(state.streak);
  dom.statTotal.textContent = String(state.totalLearned);
  dom.dailyGoalSlider.value = String(state.dailyGoal);
  dom.dailyGoalValue.textContent = String(state.dailyGoal);
  if (dom.reminderEnabledChk) dom.reminderEnabledChk.checked = Boolean(state.reminderEnabled);
  if (dom.reminderTimeInput) dom.reminderTimeInput.value = String(state.reminderTime || '20:00');
  dom.bookCet4.classList.toggle('selected', state.currentBook === 'cet4');
  dom.bookCet6.classList.toggle('selected', state.currentBook === 'cet6');
  dom.bookKaoyan.classList.toggle('selected', state.currentBook === 'kaoyan');
  dom.modeFlashcard.classList.toggle('selected', state.learningMode === 'flashcard');
  dom.modePicture.classList.toggle('selected', state.learningMode === 'picture');
  dom.modeListening.classList.toggle('selected', state.learningMode === 'listening');
  dom.modeSpelling.classList.toggle('selected', state.learningMode === 'spelling');
  const saved = getSavedSession();
  if (dom.resumeSessionBtn) {
    if (saved && Array.isArray(saved.queue) && saved.queue.length) {
      const step = Math.max(1, Math.min((saved.index || 0) + 1, saved.queue.length));
      dom.resumeSessionBtn.classList.remove('hidden');
      dom.resumeSessionBtn.textContent = `继续上次学习（${modeLabel(saved.mode)} ${step}/${saved.queue.length}）`;
    } else {
      dom.resumeSessionBtn.classList.add('hidden');
    }
  }
  if (dom.quickReviewBtn) dom.quickReviewBtn.textContent = `只复习（${review}）`;
  if (dom.quickNewBtn) dom.quickNewBtn.textContent = `只学新词（${pendingNew}）`;
  if (dom.quickWrongBtn) {
    dom.quickWrongBtn.textContent = `只练错题（${wrong}）`;
    dom.quickWrongBtn.disabled = wrong === 0;
  }
  if (dom.quickSpellingBtn) dom.quickSpellingBtn.textContent = '拼写速练';
  if (dom.quickWrongSpellingBtn) {
    dom.quickWrongSpellingBtn.textContent = `错题拼写（${wrong}）`;
    dom.quickWrongSpellingBtn.disabled = wrong === 0;
  }
  if (dom.quickWrongBookBtn) dom.quickWrongBookBtn.textContent = `错题本（${wrong}）`;
  renderInsights();
  const canStart = review > 0 || pendingNew > 0;
  const t = canStart ? `开始今日学习（复习${review} + 新词${pendingNew}）` : '今日任务已完成 ✓';
  const tx = dom.startSessionBtn.querySelector('.start-btn-text'); if (tx) tx.textContent = t;
  dom.startSessionBtn.disabled = !canStart;
}

function speak(word, btn) {
  if (!word || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US'; u.rate = 0.86; u.pitch = 1;
  if (btn) {
    btn.classList.add('playing');
    const clear = () => btn.classList.remove('playing');
    u.onend = clear; u.onerror = clear;
  }
  window.speechSynthesis.speak(u);
}

function showDashboard() {
  const leavingLearningView =
    !dom.flashcardView.classList.contains('hidden') ||
    !dom.pictureView.classList.contains('hidden') ||
    !dom.listeningView.classList.contains('hidden') ||
    !dom.spellingView.classList.contains('hidden');
  if (leavingLearningView && sessionQueue.length && sessionIndex < sessionQueue.length) {
    saveActiveSession();
    showSessionToast('已自动保存本次学习进度');
  }
  pendingPlan = null;
  clearTimer();
  answerLocked = false;
  hideFeedback();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  showOnly(dom.dashboardView);
  updateDashboard();
}

async function ensureLibraryBeforeAction() {
  if (vocabLibraryReady) return true;
  showSessionToast('正在加载词库...');
  await ensureVocabLibraryLoaded();
  if (!vocabLibraryReady) {
    alert('词库加载失败，请检查网络后重试。');
    return false;
  }
  return true;
}

function completeSession() {
  sessionResult.endAt = Date.now();
  const finalCount = sessionStudied;
  recordStudyLog();
  clearActiveSession();
  sessionQueue = [];
  sessionIndex = 0;
  sessionStudied = 0;
  currentWord = null;
  saveState();
  showResultPage(finalCount);
}

function formatDuration(ms) {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return rest ? `${min}分${rest}秒` : `${min}分`;
}

function getWeakWordSuggestions(limit = RESULT_WEAK_TOP) {
  const rows = Object.keys(sessionWordStats || {}).map((key) => {
    const s = sessionWordStats[key];
    const r = state.wordRecords[key] || {};
    const unknown = Math.max(0, Number(s.unknown) || 0);
    const fuzzy = Math.max(0, Number(s.fuzzy) || 0);
    const known = Math.max(0, Number(s.known) || 0);
    const level = Math.max(0, Number(r.level) || 0);
    const score = unknown * 3 + fuzzy * 2 - known - level;
    return {
      word: s.word,
      definition: s.definition,
      unknown,
      fuzzy,
      known,
      score,
      nextReviewDate: r.nextReviewDate || today()
    };
  });
  rows.sort((a, b) => b.score - a.score);
  return rows.filter((x) => x.score > 0).slice(0, Math.max(1, Number(limit) || RESULT_WEAK_TOP));
}

function renderResultInsights() {
  if (!dom.resultInsights || !dom.resultWeakList) return;
  const weak = getWeakWordSuggestions(RESULT_WEAK_TOP);
  if (!weak.length) {
    dom.resultInsights.classList.add('hidden');
    dom.resultWeakList.innerHTML = '';
    return;
  }
  const html = weak.map((item) => (
    `<article class="result-insight-item">`
      + `<div class="result-insight-word">${escapeHtml(item.word)}</div>`
      + `<div class="result-insight-meta">错 ${item.unknown} · 模糊 ${item.fuzzy} · 建议复习 ${escapeHtml(item.nextReviewDate)}</div>`
      + `<div class="result-insight-meta">${escapeHtml(item.definition || '')}</div>`
    + `</article>`
  )).join('');
  dom.resultWeakList.innerHTML = html;
  dom.resultInsights.classList.remove('hidden');
}

function showResultPage(totalCount) {
  const total = totalCount || 0;
  const known = sessionResult.known;
  const fuzzy = sessionResult.fuzzy;
  const unknown = sessionResult.unknown;
  const acc = total > 0 ? Math.round((known / total) * 100) : 0;
  const duration = sessionResult.endAt > sessionResult.startAt
    ? sessionResult.endAt - sessionResult.startAt
    : 0;

  dom.resultSubtitle.textContent = `${getBookName(state.currentBook)} · ${modeLabel(state.learningMode)}`;
  dom.resultTotal.textContent = String(total);
  dom.resultKnown.textContent = String(known);
  dom.resultFuzzy.textContent = String(fuzzy);
  dom.resultUnknown.textContent = String(unknown);
  dom.resultAccuracy.textContent = `${acc}%`;
  dom.resultDuration.textContent = formatDuration(duration);
  dom.resultNew.textContent = String(sessionResult.newWords);
  dom.resultReview.textContent = String(sessionResult.reviewWords);
  renderResultInsights();

  showOnly(dom.resultView);
}

function setupSession(view, preparedQueue) {
  sessionQueue = Array.isArray(preparedQueue) ? preparedQueue.map(normalizeQueueWord).filter(Boolean) : generateSessionQueue();
  sessionIndex = 0;
  sessionStudied = 0;
  currentWord = null;
  answerLocked = false;
  clearTimer();
  hideFeedback();
  sessionResult = {
    startAt: Date.now(),
    endAt: 0,
    known: 0,
    fuzzy: 0,
    unknown: 0,
    newWords: 0,
    reviewWords: 0
  };
  sessionWordStats = {};
  if (!sessionQueue.length) {
    alert('🎉 太棒了！今日任务已全部完成，明天再来吧！');
    updateDashboard();
    return false;
  }
  showOnly(view);
  saveActiveSession();
  return true;
}

function selectBook(book) {
  if (!['cet4', 'cet6', 'kaoyan'].includes(book)) return;
  wrongBookPage = 1;
  state.currentBook = book; ensureProgress(book); saveState(); updateDashboard();
}

function selectMode(mode) {
  if (!MODES.has(mode)) return;
  state.learningMode = mode; saveState(); updateDashboard();
}

async function startSession() {
  const ok = await ensureLibraryBeforeAction();
  if (!ok) return;
  openMainPlanPage();
}

function openPlanWithQueue(queue, mode, modeText) {
  const review = queue.filter((w) => w && w.isReview).length;
  const fresh = queue.length - review;

  if (!queue.length) {
    alert('暂无符合条件的学习内容，请调整快捷方式或返回今日计划。');
    updateDashboard();
    return;
  }

  pendingPlan = {
    mode,
    bookId: state.currentBook,
    queue,
    reviewCount: review,
    newCount: fresh
  };

  dom.planSubtitle.textContent = `${today()} · ${modeText}`;
  dom.planBook.textContent = getBookName(state.currentBook);
  dom.planMode.textContent = modeText;
  dom.planReview.textContent = String(review);
  dom.planNew.textContent = String(fresh);
  dom.planTotal.textContent = String(queue.length);
  dom.planStartBtn.disabled = queue.length === 0;

  showOnly(dom.planView);
}

async function openQuickPlan(type, options = {}) {
  const okLib = await ensureLibraryBeforeAction();
  if (!okLib) return;
  const allowResume = options.allowResume !== false;
  if (allowResume) {
    const resumed = tryResumeSession();
    if (resumed) return;
  }

  let mode = state.learningMode;
  let modeText = modeLabel(mode);
  let queue = generateSessionQueue();

  if (type === 'review') {
    queue = queue.filter((w) => w && w.isReview);
    modeText = `${modeLabel(mode)} · 只复习`;
  } else if (type === 'new') {
    queue = queue.filter((w) => w && !w.isReview);
    modeText = `${modeLabel(mode)} · 只学新词`;
  } else if (type === 'wrong') {
    queue = generateWrongQueue();
    modeText = `${modeLabel(mode)} · 只练错题`;
  } else if (type === 'spelling') {
    mode = 'spelling';
    queue = generateSessionQueue();
    modeText = `${modeLabel(mode)} · 快速开始`;
  } else if (type === 'wrongSpelling') {
    mode = 'spelling';
    queue = generateWrongQueue();
    modeText = `${modeLabel(mode)} · 错题专项`;
  }

  if (!queue.length) {
    updateDashboard();
    if (type === 'spelling') alert('当前没有可用于拼写训练的学习内容。');
    else if (type === 'wrong' || type === 'wrongSpelling') alert('当前还没有错题，先学习一轮再来练错题。');
    else alert('暂无符合条件的学习内容，请调整快捷方式后重试。');
    return;
  }

  openPlanWithQueue(queue, mode, modeText);
}

async function openMainPlanPage() {
  const okLib = await ensureLibraryBeforeAction();
  if (!okLib) return;
  const resumed = tryResumeSession();
  if (resumed) return;

  const queue = generateSessionQueue();
  if (!queue.length) {
    alert('暂无可学习内容，今日任务可能已经完成。');
    updateDashboard();
    return;
  }
  openPlanWithQueue(queue, state.learningMode, modeLabel(state.learningMode));
}

function renderWrongBook() {
  if (!dom.wrongList || !dom.wrongEmpty || !dom.wrongSubtitle) return;
  const allEntries = getWrongEntries(state.currentBook, 2000);
  const total = allEntries.length;
  const visibleEntries = getVisibleWrongEntries(state.currentBook);
  const totalVisible = visibleEntries.length;
  const maxPage = Math.max(1, Math.ceil(totalVisible / WRONG_PAGE_SIZE));
  wrongBookPage = Math.max(1, Math.min(wrongBookPage, maxPage));
  const shown = Math.min(totalVisible, wrongBookPage * WRONG_PAGE_SIZE);
  const entries = visibleEntries.slice(0, shown);

  dom.wrongSubtitle.textContent = `${getBookName(state.currentBook)} · 错题 ${shown}/${total} 个`;

  if (!total) {
    dom.wrongList.innerHTML = '';
    dom.wrongEmpty.textContent = '当前还没有错题，继续保持。';
    dom.wrongEmpty.classList.remove('hidden');
    if (dom.wrongPracticeBtn) dom.wrongPracticeBtn.disabled = true;
    if (dom.wrongClearBtn) dom.wrongClearBtn.disabled = true;
    if (dom.wrongClearHardBtn) dom.wrongClearHardBtn.disabled = true;
    if (dom.wrongClearOldBtn) dom.wrongClearOldBtn.disabled = true;
    if (dom.wrongExportBtn) dom.wrongExportBtn.disabled = true;
    if (dom.wrongMoreBtn) dom.wrongMoreBtn.classList.add('hidden');
    return;
  }

  if (!shown) {
    dom.wrongList.innerHTML = '';
    dom.wrongEmpty.textContent = '没有符合筛选条件的错题。';
    dom.wrongEmpty.classList.remove('hidden');
    if (dom.wrongPracticeBtn) dom.wrongPracticeBtn.disabled = true;
    if (dom.wrongClearBtn) dom.wrongClearBtn.disabled = false;
    if (dom.wrongClearHardBtn) dom.wrongClearHardBtn.disabled = false;
    if (dom.wrongClearOldBtn) dom.wrongClearOldBtn.disabled = false;
    if (dom.wrongExportBtn) dom.wrongExportBtn.disabled = true;
    if (dom.wrongMoreBtn) dom.wrongMoreBtn.classList.add('hidden');
    return;
  }

  if (dom.wrongPracticeBtn) dom.wrongPracticeBtn.disabled = false;
  if (dom.wrongClearBtn) dom.wrongClearBtn.disabled = false;
  if (dom.wrongClearHardBtn) dom.wrongClearHardBtn.disabled = false;
  if (dom.wrongClearOldBtn) dom.wrongClearOldBtn.disabled = false;
  if (dom.wrongExportBtn) dom.wrongExportBtn.disabled = false;
  dom.wrongEmpty.classList.add('hidden');

  const html = entries.map((item) => (
    `<article class="wrong-item">`
      + `<div class="wrong-item-head">`
      + `<div class="wrong-main">`
      + `<div class="wrong-word">${highlightKeyword(item.word, wrongBookFilters.keyword)}</div>`
      + `<div class="wrong-meaning">${highlightKeyword(item.definition || '（释义不可用）', wrongBookFilters.keyword)}</div>`
      + `<div class="wrong-meta">错 ${item.incorrect} · 模糊 ${item.fuzzy} · 计划复习 ${escapeHtml(item.nextReviewDate || '今天')} · 强度 ${item.score}</div>`
      + `</div>`
      + `<button class="wrong-remove-btn" type="button" data-wrong-remove="${escapeHtml(item.key)}">移除</button>`
      + `</div>`
    + `</article>`
  )).join('');

  dom.wrongList.innerHTML = html;
  if (dom.wrongMoreBtn) {
    const remain = Math.max(0, totalVisible - shown);
    const hasMore = remain > 0;
    dom.wrongMoreBtn.classList.toggle('hidden', !hasMore);
    dom.wrongMoreBtn.disabled = !hasMore;
    dom.wrongMoreBtn.textContent = hasMore ? `加载更多（剩余 ${remain}）` : '已全部加载';
  }
}

async function showWrongBookPage() {
  const okLib = await ensureLibraryBeforeAction();
  if (!okLib) return;
  clearTimer();
  hideFeedback();
  wrongBookPage = 1;
  syncWrongFilterControls();
  renderWrongBook();
  showOnly(dom.wrongView);
}

function removeWrongRecordByKey(recordKey) {
  const key = String(recordKey || '');
  const r = state.wordRecords[key];
  if (!r) return;
  r.incorrectCount = 0;
  r.fuzzyCount = 0;
  r.lapseCount = 0;
  r.lastResult = '';
  saveState();
  renderWrongBook();
  updateDashboard();
}

function clearWrongRecordsForCurrentBook() {
  const entries = getWrongEntries(state.currentBook, 2000);
  if (!entries.length) {
    renderWrongBook();
    return;
  }
  const ok = window.confirm(`确认清空当前词书的 ${entries.length} 个错题记录吗？`);
  if (!ok) return;
  entries.forEach((item) => {
    const r = state.wordRecords[item.key];
    if (!r) return;
    r.incorrectCount = 0;
    r.fuzzyCount = 0;
    r.lapseCount = 0;
    r.lastResult = '';
  });
  saveState();
  renderWrongBook();
  updateDashboard();
}

function clearWrongEntries(entries, confirmText) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) {
    renderWrongBook();
    return;
  }
  if (!window.confirm(confirmText)) return;
  list.forEach((item) => {
    const r = state.wordRecords[item.key];
    if (!r) return;
    r.incorrectCount = 0;
    r.fuzzyCount = 0;
    r.lapseCount = 0;
    r.lastResult = '';
  });
  saveState();
  renderWrongBook();
  updateDashboard();
}

function clearHardWrongRecordsForCurrentBook() {
  const entries = getWrongEntries(state.currentBook, 2000).filter((item) => Number(item.score) >= 8);
  clearWrongEntries(entries, `确认清理当前词书 ${entries.length} 个高频错题吗？`);
}

function clearOldWrongRecordsForCurrentBook() {
  const cutoff = addDays(today(), -WRONG_CLEAN_DAYS);
  const entries = getWrongEntries(state.currentBook, 2000).filter((item) => {
    if (!item.lastSeen) return false;
    return dayDiff(item.lastSeen, cutoff) >= 0;
  });
  clearWrongEntries(entries, `确认清理 ${WRONG_CLEAN_DAYS} 天前的 ${entries.length} 个错题吗？`);
}

function toCsvCell(value) {
  const text = String(value == null ? '' : value);
  if (!/[,"\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportWrongEntriesForCurrentBook() {
  const entries = getVisibleWrongEntries(state.currentBook);
  if (!entries.length) {
    alert('当前筛选结果没有可导出的错题。');
    return;
  }

  const stamp = today().replace(/-/g, '');
  const base = `wrongbook-${state.currentBook}-${stamp}`;
  const jsonPayload = {
    app: 'vocab-flashcard',
    exportedAt: new Date().toISOString(),
    bookId: state.currentBook,
    filters: { ...wrongBookFilters },
    entries
  };
  triggerDownload(`${base}.json`, JSON.stringify(jsonPayload, null, 2), 'application/json;charset=utf-8');

  const header = ['word', 'definition', 'incorrect', 'fuzzy', 'lapse', 'score', 'lastSeen', 'nextReviewDate'];
  const rows = entries.map((item) => [
    item.word,
    item.definition,
    item.incorrect,
    item.fuzzy,
    item.lapse,
    item.score,
    item.lastSeen || '',
    item.nextReviewDate || ''
  ]);
  const csv = [header, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
  triggerDownload(`${base}.csv`, csv, 'text/csv;charset=utf-8');
}

function startWrongPracticeFromBook() {
  const entries = getVisibleWrongEntries(state.currentBook);
  if (!entries.length) {
    alert('当前筛选结果没有可练习错题。');
    return;
  }

  const keySet = new Set(entries.map((item) => item.key));
  const queue = generateWrongQueue(2000).filter((w) => keySet.has(rkey(state.currentBook, w.word)));
  if (!queue.length) {
    alert('当前筛选结果无法生成练习队列，请调整筛选条件后重试。');
    return;
  }

  openPlanWithQueue(queue, state.learningMode, `${modeLabel(state.learningMode)} · 错题筛选练习`);
}

function modeLabel(mode) {
  if (mode === 'picture') return '图片选义';
  if (mode === 'listening') return '听音选义';
  if (mode === 'spelling') return '拼写模式';
  return '闪卡模式';
}

function restoreSavedSession(saved) {
  if (!saved || !Array.isArray(saved.queue) || !saved.queue.length) return false;

  return restoreSavedSession(saved);
}

function resumeSavedSessionDirect() {
  const saved = getSavedSession();
  if (!saved) {
    updateDashboard();
    return;
  }
  restoreSavedSession(saved);
}

function tryResumeSession() {
  const saved = getSavedSession();
  if (!saved) return false;

  const currentMode = state.learningMode;
  const currentBook = state.currentBook;
  const sameTarget = saved.mode === currentMode && saved.bookId === currentBook;
  const message = sameTarget
    ? `检测到未完成会话（${modeLabel(saved.mode)} ${saved.index + 1}/${saved.queue.length}），是否继续？`
    : `检测到未完成会话（${getBookName(saved.bookId)} / ${modeLabel(saved.mode)} ${saved.index + 1}/${saved.queue.length}），是否继续？`;

  const shouldResume = window.confirm(message);
  if (!shouldResume) {
    clearActiveSession();
    sessionQueue = [];
    sessionIndex = 0;
    sessionStudied = 0;
    currentWord = null;
    return false;
  }

  state.currentBook = saved.bookId;
  state.learningMode = saved.mode;
  sessionQueue = saved.queue;
  sessionIndex = saved.index;
  sessionStudied = saved.studied;
  sessionResult = saved.result && saved.result.startAt ? saved.result : {
    startAt: Date.now(),
    endAt: 0,
    known: 0,
    fuzzy: 0,
    unknown: 0,
    newWords: 0,
    reviewWords: 0
  };
  currentWord = null;
  answerLocked = false;
  clearTimer();
  hideFeedback();
  saveState();

  if (saved.mode === 'picture') {
    showOnly(dom.pictureView);
    loadPictureWord();
    updateProgress(dom.pictureProgressFill, dom.pictureProgressText);
  } else if (saved.mode === 'listening') {
    showOnly(dom.listeningView);
    loadListeningWord();
    updateProgress(dom.listeningProgressFill, dom.listeningProgressText);
  } else if (saved.mode === 'spelling') {
    showOnly(dom.spellingView);
    loadSpellingWord();
    updateProgress(dom.spellingProgressFill, dom.spellingProgressText);
  } else {
    showOnly(dom.flashcardView);
    loadFlashcardWord();
    updateProgress(dom.progressFill, dom.progressText);
  }
  return true;
}

function openPlanPage() {
  const resumed = tryResumeSession();
  if (resumed) return;

  const queue = generateSessionQueue();
  const review = queue.filter((w) => w && w.isReview).length;
  const fresh = queue.length - review;

  if (!queue.length) {
    alert('🎉 太棒了！今日任务已全部完成，明天再来吧！');
    updateDashboard();
    return;
  }

  pendingPlan = {
    mode: state.learningMode,
    bookId: state.currentBook,
    queue,
    reviewCount: review,
    newCount: fresh
  };

  dom.planSubtitle.textContent = `${today()} · ${modeLabel(state.learningMode)}`;
  dom.planBook.textContent = getBookName(state.currentBook);
  dom.planMode.textContent = modeLabel(state.learningMode);
  dom.planReview.textContent = String(review);
  dom.planNew.textContent = String(fresh);
  dom.planTotal.textContent = String(queue.length);
  dom.planStartBtn.disabled = queue.length === 0;

  showOnly(dom.planView);
}

function startPlannedSession() {
  if (!pendingPlan || !Array.isArray(pendingPlan.queue) || !pendingPlan.queue.length) {
    openPlanPage();
    return;
  }

  state.currentBook = pendingPlan.bookId;
  state.learningMode = pendingPlan.mode;
  saveState();

  const queue = pendingPlan.queue;
  pendingPlan = null;

  if (state.learningMode === 'picture') {
    if (!setupSession(dom.pictureView, queue)) return;
    loadPictureWord();
    updateProgress(dom.pictureProgressFill, dom.pictureProgressText);
  } else if (state.learningMode === 'listening') {
    if (!setupSession(dom.listeningView, queue)) return;
    loadListeningWord();
    updateProgress(dom.listeningProgressFill, dom.listeningProgressText);
  } else if (state.learningMode === 'spelling') {
    if (!setupSession(dom.spellingView, queue)) return;
    loadSpellingWord();
    updateProgress(dom.spellingProgressFill, dom.spellingProgressText);
  } else {
    if (!setupSession(dom.flashcardView, queue)) return;
    loadFlashcardWord();
    updateProgress(dom.progressFill, dom.progressText);
  }
}

function showFlashcardMode() {
  if (!setupSession(dom.flashcardView)) return;
  loadFlashcardWord();
  updateProgress(dom.progressFill, dom.progressText);
}

function loadFlashcardWord() {
  if (sessionIndex >= sessionQueue.length) { completeSession(); return; }
  currentWord = sessionQueue[sessionIndex];
  answerLocked = false;
  dom.word.textContent = currentWord.word || '暂无单词';
  dom.phonetic.textContent = currentWord.phonetic || '';
  dom.meaning.textContent = currentWord.definition || '';
  dom.mnemonicText.textContent = currentWord.mnemonic || '暂无助记';
  dom.etymologyText.textContent = currentWord.etymology || '暂无词源';
  dom.exampleText.textContent = currentWord.example || '暂无例句';
  dom.wordCard.classList.remove('flipped');
}

function toggleCard() { dom.wordCard.classList.toggle('flipped'); }

function animateCardOut(dir) {
  return new Promise((resolve) => {
    const c = dir === 'left' ? 'fly-left' : 'fly-right';
    dom.wordCard.classList.add(c);
    setTimeout(() => { dom.wordCard.classList.remove(c, 'flipped'); resolve(); }, 350);
  });
}

function animateCardIn() {
  dom.wordCard.classList.add('entering');
  setTimeout(() => dom.wordCard.classList.remove('entering'), 350);
}

async function answerFlashcard(status) {
  if (answerLocked || !currentWord) return;
  answerLocked = true;
  applyStudy(status);
  enqueueRetryWord(status);
  saveActiveSession();
  await animateCardOut(status === 'unknown' ? 'left' : 'right');
  sessionIndex += 1;
  if (sessionIndex >= sessionQueue.length) { completeSession(); return; }
  saveActiveSession();
  loadFlashcardWord();
  updateProgress(dom.progressFill, dom.progressText);
  animateCardIn();
}

function playFlashcardAudio() { if (currentWord) speak(currentWord.word, dom.playBtn); }

function openImportModal() {
  dom.importText.value = '';
  if (typeof dom.importModal.showModal === 'function') dom.importModal.showModal();
  else dom.importModal.setAttribute('open', 'open');
  setTimeout(() => dom.importText.focus(), 0);
}

function closeImportModal() {
  if (typeof dom.importModal.close === 'function' && dom.importModal.open) dom.importModal.close();
  else dom.importModal.removeAttribute('open');
}

function parseImport(text) {
  const out = [];
  String(text || '').split(/\r?\n/).forEach((line) => {
    const t = line.trim(); if (!t) return;
    const parts = t.split(/[,\t，]/).map((x) => x.trim()).filter(Boolean);
    if (parts.length < 2) return;
    out.push({ word: parts[0], definition: parts.slice(1).join('，'), phonetic: '', mnemonic: '', etymology: '', example: '' });
  });
  return out;
}

function handleImport() {
  const parsed = parseImport(dom.importText.value);
  if (!parsed.length) { alert('未能解析到有效单词，请按“单词, 释义”格式输入。'); return; }
  const book = state.currentBook; if (!Array.isArray(state.customWords[book])) state.customWords[book] = [];
  const existing = new Set(getLibraryFor(book).map((w) => nword(w.word)));
  let count = 0;
  parsed.forEach((w) => {
    const k = nword(w.word); if (!k || existing.has(k)) return;
    existing.add(k);
    state.customWords[book].push({ word: String(w.word).trim(), definition: String(w.definition).trim(), phonetic: '', mnemonic: '', etymology: '', example: '' });
    count += 1;
  });
  saveState();
  closeImportModal();
  updateDashboard();
  alert(count ? `成功导入 ${count} 个单词。` : '导入完成，但没有新增条目（重复词已自动跳过）。');
}

function quizOptions(correct, count = 4) {
  const lib = getLibraryFor(state.currentBook);
  const opts = [correct];
  const pool = shuffle(lib.filter((w) => nword(w.word) !== nword(correct.word) && w.definition !== correct.definition));
  for (let i = 0; i < pool.length && opts.length < count; i += 1) opts.push(pool[i]);
  while (opts.length < count) opts.push(correct);
  return shuffle(opts.slice(0, count));
}

function showPictureMode() {
  if (!setupSession(dom.pictureView)) return;
  loadPictureWord();
  updateProgress(dom.pictureProgressFill, dom.pictureProgressText);
}

function loadPictureWord() {
  if (sessionIndex >= sessionQueue.length) { completeSession(); return; }
  currentWord = sessionQueue[sessionIndex];
  answerLocked = false;
  pictureOptions = quizOptions(currentWord, 4);
  pictureCorrect = pictureOptions.findIndex((x) => nword(x.word) === nword(currentWord.word));
  if (pictureCorrect < 0) pictureCorrect = 0;
  dom.pictureWord.textContent = currentWord.word;
  dom.picturePhonetic.textContent = currentWord.phonetic || '';
  dom.pictureOptions.querySelectorAll('.picture-option').forEach((btn, i) => {
    btn.classList.remove('correct', 'wrong', 'disabled');
    const t = btn.querySelector('.picture-text'); if (t) t.textContent = pictureOptions[i] ? pictureOptions[i].definition : '';
    const e = btn.querySelector('.picture-emoji'); if (e) e.textContent = PICTURE_EMOJIS[(sessionIndex + i) % PICTURE_EMOJIS.length];
  });
}

function playPictureAudio() { if (currentWord) speak(currentWord.word, dom.pictureAudioBtn); }

function pictureFeedback(ok) {
  const icon = dom.pictureFeedback.querySelector('.feedback-icon');
  icon.className = `feedback-icon ${ok ? 'correct' : 'wrong'}`;
  dom.pictureFeedbackWord.textContent = currentWord.word;
  dom.pictureFeedbackMeaning.textContent = currentWord.definition;
  dom.pictureFeedback.classList.remove('hidden');
  clearTimer();
  feedbackTimer = setTimeout(() => {
    dom.pictureFeedback.classList.add('hidden');
    sessionIndex += 1;
    if (sessionIndex >= sessionQueue.length) { completeSession(); return; }
    saveActiveSession();
    loadPictureWord();
    updateProgress(dom.pictureProgressFill, dom.pictureProgressText);
  }, 1200);
}

function answerPicture(index) {
  if (answerLocked || !currentWord) return;
  answerLocked = true;
  const btns = dom.pictureOptions.querySelectorAll('.picture-option');
  btns.forEach((b) => b.classList.add('disabled'));
  const ok = index === pictureCorrect;
  btns[pictureCorrect].classList.add('correct');
  if (!ok && btns[index]) btns[index].classList.add('wrong');
  const status = ok ? 'known' : 'unknown';
  applyStudy(status);
  enqueueRetryWord(status);
  saveActiveSession();
  pictureFeedback(ok);
}

function showListeningMode() {
  if (!setupSession(dom.listeningView)) return;
  loadListeningWord();
  updateProgress(dom.listeningProgressFill, dom.listeningProgressText);
}

function loadListeningWord() {
  if (sessionIndex >= sessionQueue.length) { completeSession(); return; }
  currentWord = sessionQueue[sessionIndex];
  answerLocked = false;
  listeningOptions = quizOptions(currentWord, 4);
  listeningCorrect = listeningOptions.findIndex((x) => nword(x.word) === nword(currentWord.word));
  if (listeningCorrect < 0) listeningCorrect = 0;
  dom.listeningOptions.querySelectorAll('.listening-option').forEach((btn, i) => {
    btn.classList.remove('correct', 'wrong', 'disabled');
    const t = btn.querySelector('.option-text'); if (t) t.textContent = listeningOptions[i] ? listeningOptions[i].definition : '';
  });
  setTimeout(() => { if (!dom.listeningView.classList.contains('hidden')) playListeningAudio(); }, 200);
}

function playListeningAudio() { if (currentWord) speak(currentWord.word, dom.listeningPlayBtn); }

function listeningFeedback(ok) {
  const icon = dom.listeningFeedback.querySelector('.feedback-icon');
  icon.className = `feedback-icon ${ok ? 'correct' : 'wrong'}`;
  dom.listeningFeedbackWord.textContent = currentWord.word;
  dom.listeningFeedbackMeaning.textContent = currentWord.definition;
  dom.listeningFeedback.classList.remove('hidden');
  clearTimer();
  feedbackTimer = setTimeout(() => {
    dom.listeningFeedback.classList.add('hidden');
    sessionIndex += 1;
    if (sessionIndex >= sessionQueue.length) { completeSession(); return; }
    saveActiveSession();
    loadListeningWord();
    updateProgress(dom.listeningProgressFill, dom.listeningProgressText);
  }, 1200);
}

function answerListening(index) {
  if (answerLocked || !currentWord) return;
  answerLocked = true;
  const btns = dom.listeningOptions.querySelectorAll('.listening-option');
  btns.forEach((b) => b.classList.add('disabled'));
  const ok = index === listeningCorrect;
  btns[listeningCorrect].classList.add('correct');
  if (!ok && btns[index]) btns[index].classList.add('wrong');
  const status = ok ? 'known' : 'unknown';
  applyStudy(status);
  enqueueRetryWord(status);
  saveActiveSession();
  listeningFeedback(ok);
}

function spellTarget(word) {
  const x = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  return x || String(word || '').toLowerCase();
}

function showSpellingMode() {
  if (!setupSession(dom.spellingView)) return;
  loadSpellingWord();
  updateProgress(dom.spellingProgressFill, dom.spellingProgressText);
}

function loadSpellingWord() {
  if (sessionIndex >= sessionQueue.length) { completeSession(); return; }
  currentWord = sessionQueue[sessionIndex];
  answerLocked = false;
  spellingInput = '';
  spellingHintCount = 0;
  spellingTarget = spellTarget(currentWord.word);
  dom.spellingDefinition.textContent = currentWord.definition || '';
  dom.spellingHint.textContent = '';
  updateSpellingDisplay();
  setTimeout(() => { if (!dom.spellingView.classList.contains('hidden')) playSpellingAudio(); }, 200);
}

function updateSpellingDisplay() {
  dom.spellingDisplay.innerHTML = '';
  for (let i = 0; i < spellingTarget.length; i += 1) {
    const d = document.createElement('div');
    d.className = 'spelling-char';
    if (i < spellingInput.length) {
      d.textContent = spellingInput[i];
      d.classList.add('filled');
      d.classList.add(spellingInput[i] === spellingTarget[i] ? 'correct' : 'wrong');
    } else if (i === spellingInput.length) d.classList.add('current');
    dom.spellingDisplay.appendChild(d);
  }
}

function playSpellingAudio() { if (currentWord) speak(currentWord.word, dom.spellingAudioBtn); }

function spellingKey(key) {
  if (answerLocked || spellingInput.length >= spellingTarget.length) return;
  spellingInput += String(key).toLowerCase();
  updateSpellingDisplay();
  if (spellingInput.length === spellingTarget.length) checkSpelling();
}

function spellingDelete() {
  if (answerLocked || !spellingInput.length) return;
  spellingInput = spellingInput.slice(0, -1);
  updateSpellingDisplay();
}

function spellingHint() {
  if (answerLocked || spellingInput.length >= spellingTarget.length) return;
  spellingInput += spellingTarget[spellingInput.length];
  spellingHintCount += 1;
  dom.spellingHint.textContent = `已使用提示 ${spellingHintCount} 次`;
  updateSpellingDisplay();
  if (spellingInput.length === spellingTarget.length) checkSpelling();
}

function spellingFeedback(perfect) {
  const icon = dom.spellingFeedback.querySelector('.feedback-icon');
  icon.className = `feedback-icon ${perfect ? 'correct' : 'wrong'}`;
  dom.spellingFeedbackWord.textContent = currentWord.word;
  dom.spellingFeedbackMeaning.textContent = currentWord.definition;
  dom.spellingFeedback.classList.remove('hidden');
  clearTimer();
  feedbackTimer = setTimeout(() => {
    dom.spellingFeedback.classList.add('hidden');
    sessionIndex += 1;
    if (sessionIndex >= sessionQueue.length) { completeSession(); return; }
    saveActiveSession();
    loadSpellingWord();
    updateProgress(dom.spellingProgressFill, dom.spellingProgressText);
  }, 1200);
}

function checkSpelling() {
  if (answerLocked) return;
  answerLocked = true;
  const ok = spellingInput === spellingTarget;
  const status = ok && spellingHintCount === 0 ? 'known' : ok && spellingHintCount <= 2 ? 'fuzzy' : 'unknown';
  applyStudy(status);
  enqueueRetryWord(status);
  saveActiveSession();
  spellingFeedback(ok && spellingHintCount === 0);
}

function modalOpen() {
  const importOpen = Boolean(dom.importModal && (dom.importModal.open || dom.importModal.hasAttribute('open')));
  const syncOpen = Boolean(dom.syncModal && (dom.syncModal.open || dom.syncModal.hasAttribute('open')));
  return importOpen || syncOpen;
}

function onKeydown(e) {
  if (modalOpen()) {
    if (e.key === 'Escape') {
      if (dom.syncModal && (dom.syncModal.open || dom.syncModal.hasAttribute('open'))) closeSyncModal();
      else closeImportModal();
    } else if (e.key === 'Enter' && dom.syncModal && (dom.syncModal.open || dom.syncModal.hasAttribute('open'))) {
      e.preventDefault();
      confirmSyncModal();
    }
    return;
  }

  if (!dom.planView.classList.contains('hidden')) {
    if (e.key === 'Escape') showDashboard();
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startPlannedSession(); }
    return;
  }

  if (!dom.resultView.classList.contains('hidden')) {
    if (e.key === 'Escape') showDashboard();
    else if (e.key === 'Enter') { e.preventDefault(); showDashboard(); openMainPlanPage(); }
    return;
  }

  if (dom.wrongView && !dom.wrongView.classList.contains('hidden')) {
    if (e.key === 'Escape') showDashboard();
    else if (e.key === 'Enter') { e.preventDefault(); startWrongPracticeFromBook(); }
    else if (e.key === '/' && dom.wrongSearchInput) {
      e.preventDefault();
      dom.wrongSearchInput.focus();
    }
    return;
  }

  if (!dom.flashcardView.classList.contains('hidden')) {
    if (e.key === '1') answerFlashcard('unknown');
    else if (e.key === '2') answerFlashcard('fuzzy');
    else if (e.key === '3') answerFlashcard('known');
    else if (e.key === 'Enter') toggleCard();
    else if (e.key === ' ' || e.key.toLowerCase() === 'p') { e.preventDefault(); playFlashcardAudio(); }
    else if (e.key === 'Escape') showDashboard();
    return;
  }

  if (!dom.pictureView.classList.contains('hidden')) {
    if (e.key === '1') answerPicture(0);
    else if (e.key === '2') answerPicture(1);
    else if (e.key === '3') answerPicture(2);
    else if (e.key === '4') answerPicture(3);
    else if (e.key === ' ' || e.key.toLowerCase() === 'p') { e.preventDefault(); playPictureAudio(); }
    else if (e.key === 'Escape') showDashboard();
    return;
  }

  if (!dom.listeningView.classList.contains('hidden')) {
    if (e.key === '1') answerListening(0);
    else if (e.key === '2') answerListening(1);
    else if (e.key === '3') answerListening(2);
    else if (e.key === '4') answerListening(3);
    else if (e.key === ' ' || e.key.toLowerCase() === 'p') { e.preventDefault(); playListeningAudio(); }
    else if (e.key === 'Escape') showDashboard();
    return;
  }

  if (!dom.spellingView.classList.contains('hidden')) {
    if (e.key === 'Escape') showDashboard();
    else if (e.key === 'Backspace') { e.preventDefault(); spellingDelete(); }
    else if (e.key === ' ' || e.key.toLowerCase() === 'p') { e.preventDefault(); playSpellingAudio(); }
    else if (e.key.toLowerCase() === 'h') spellingHint();
    else if (/^[a-zA-Z]$/.test(e.key)) spellingKey(e.key);
  }
}

function bindEvents() {
  dom.bookCet4.addEventListener('click', () => selectBook('cet4'));
  dom.bookCet6.addEventListener('click', () => selectBook('cet6'));
  dom.bookKaoyan.addEventListener('click', () => selectBook('kaoyan'));
  dom.modeFlashcard.addEventListener('click', () => selectMode('flashcard'));
  dom.modePicture.addEventListener('click', () => selectMode('picture'));
  dom.modeListening.addEventListener('click', () => selectMode('listening'));
  dom.modeSpelling.addEventListener('click', () => selectMode('spelling'));
  dom.dailyGoalSlider.addEventListener('input', (e) => {
    const g = Number(e.target.value);
    state.dailyGoal = Number.isFinite(g) ? Math.max(5, Math.min(50, g)) : 20;
    dom.dailyGoalValue.textContent = String(state.dailyGoal);
    saveState();
    updateDashboard();
  });
  dom.startSessionBtn.addEventListener('click', startSession);
  if (dom.planBackBtn) dom.planBackBtn.addEventListener('click', showDashboard);
  if (dom.planStartBtn) dom.planStartBtn.addEventListener('click', startPlannedSession);
  if (dom.exportDataBtn) dom.exportDataBtn.addEventListener('click', exportBackup);
  if (dom.importDataBtn) dom.importDataBtn.addEventListener('click', triggerImportBackup);
  if (dom.importWordsJsonBtn) dom.importWordsJsonBtn.addEventListener('click', triggerImportWordsJson);
  if (dom.syncCodeExportBtn) dom.syncCodeExportBtn.addEventListener('click', () => openSyncModal('export'));
  if (dom.syncCodeImportBtn) dom.syncCodeImportBtn.addEventListener('click', () => openSyncModal('import'));
  if (dom.syncModalCancelBtn) dom.syncModalCancelBtn.addEventListener('click', closeSyncModal);
  if (dom.syncModalConfirmBtn) dom.syncModalConfirmBtn.addEventListener('click', confirmSyncModal);
  if (dom.syncModal) {
    dom.syncModal.addEventListener('click', (e) => {
      if (e.target === dom.syncModal) closeSyncModal();
    });
  }
  if (dom.backupFileInput) dom.backupFileInput.addEventListener('change', handleBackupFileChange);
  if (dom.wordJsonInput) dom.wordJsonInput.addEventListener('change', handleWordJsonFileChange);
  if (dom.reminderEnabledChk) {
    dom.reminderEnabledChk.addEventListener('change', (e) => {
      state.reminderEnabled = Boolean(e.target.checked);
      if (state.reminderEnabled) askNotificationPermissionIfNeeded();
      saveState();
      scheduleReminder();
      updateDashboard();
      announce(state.reminderEnabled ? '已启用每日提醒' : '已关闭每日提醒');
    });
  }
  if (dom.reminderTimeInput) {
    dom.reminderTimeInput.addEventListener('change', (e) => {
      state.reminderTime = String(e.target.value || '20:00');
      saveState();
      scheduleReminder();
      updateDashboard();
      announce(`提醒时间已更新为 ${state.reminderTime}`);
    });
  }
  if (dom.installAppBtn) dom.installAppBtn.addEventListener('click', handleInstallApp);
  if (dom.installDismissBtn) dom.installDismissBtn.addEventListener('click', dismissInstallEntry);
  if (dom.resumeSessionBtn) dom.resumeSessionBtn.addEventListener('click', resumeSavedSessionDirect);
  if (dom.quickReviewBtn) dom.quickReviewBtn.addEventListener('click', () => openQuickPlan('review'));
  if (dom.quickNewBtn) dom.quickNewBtn.addEventListener('click', () => openQuickPlan('new'));
  if (dom.quickWrongBtn) dom.quickWrongBtn.addEventListener('click', () => openQuickPlan('wrong'));
  if (dom.quickSpellingBtn) dom.quickSpellingBtn.addEventListener('click', () => openQuickPlan('spelling'));
  if (dom.quickWrongSpellingBtn) dom.quickWrongSpellingBtn.addEventListener('click', () => openQuickPlan('wrongSpelling'));
  if (dom.quickWrongBookBtn) dom.quickWrongBookBtn.addEventListener('click', showWrongBookPage);

  dom.backBtn.addEventListener('click', showDashboard);
  dom.pictureBackBtn.addEventListener('click', showDashboard);
  dom.listeningBackBtn.addEventListener('click', showDashboard);
  dom.spellingBackBtn.addEventListener('click', showDashboard);
  if (dom.wrongBackBtn) dom.wrongBackBtn.addEventListener('click', showDashboard);
  if (dom.wrongPracticeBtn) dom.wrongPracticeBtn.addEventListener('click', startWrongPracticeFromBook);
  if (dom.wrongClearBtn) dom.wrongClearBtn.addEventListener('click', clearWrongRecordsForCurrentBook);
  if (dom.wrongClearHardBtn) dom.wrongClearHardBtn.addEventListener('click', clearHardWrongRecordsForCurrentBook);
  if (dom.wrongClearOldBtn) dom.wrongClearOldBtn.addEventListener('click', clearOldWrongRecordsForCurrentBook);
  if (dom.wrongExportBtn) dom.wrongExportBtn.addEventListener('click', exportWrongEntriesForCurrentBook);
  if (dom.wrongMoreBtn) {
    dom.wrongMoreBtn.addEventListener('click', () => {
      wrongBookPage += 1;
      renderWrongBook();
    });
  }
  if (dom.wrongSearchInput) {
    dom.wrongSearchInput.addEventListener('input', (e) => {
      const nextKeyword = String(e.target.value || '').trim();
      if (wrongSearchDebounceTimer) {
        clearTimeout(wrongSearchDebounceTimer);
        wrongSearchDebounceTimer = null;
      }
      wrongSearchDebounceTimer = setTimeout(() => {
        wrongBookFilters.keyword = nextKeyword;
        wrongBookPage = 1;
        saveWrongFilters();
        renderWrongBook();
      }, SEARCH_DEBOUNCE_MS);
    });
  }
  if (dom.wrongSortSelect) {
    dom.wrongSortSelect.addEventListener('change', (e) => {
      wrongBookFilters.sort = String(e.target.value || 'score');
      wrongBookPage = 1;
      saveWrongFilters();
      renderWrongBook();
    });
  }
  if (dom.wrongOnlyHardChk) {
    dom.wrongOnlyHardChk.addEventListener('change', (e) => {
      wrongBookFilters.onlyHard = Boolean(e.target.checked);
      wrongBookPage = 1;
      saveWrongFilters();
      renderWrongBook();
    });
  }
  if (dom.wrongList) {
    dom.wrongList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wrong-remove]');
      if (!btn) return;
      removeWrongRecordByKey(btn.getAttribute('data-wrong-remove'));
    });
  }

  dom.wordCard.addEventListener('click', (e) => {
    if (e.target.closest('.play-btn') || e.target.closest('.status-btn')) return;
    toggleCard();
  });
  dom.playBtn.addEventListener('click', (e) => { e.stopPropagation(); playFlashcardAudio(); });
  dom.btnUnknown.addEventListener('click', () => answerFlashcard('unknown'));
  dom.btnFuzzy.addEventListener('click', () => answerFlashcard('fuzzy'));
  dom.btnKnown.addEventListener('click', () => answerFlashcard('known'));

  dom.importBtn.addEventListener('click', openImportModal);
  dom.cancelImport.addEventListener('click', closeImportModal);
  dom.confirmImport.addEventListener('click', handleImport);
  dom.importModal.addEventListener('click', (e) => { if (e.target === dom.importModal) closeImportModal(); });

  dom.pictureAudioBtn.addEventListener('click', playPictureAudio);
  dom.pictureOptions.querySelectorAll('.picture-option').forEach((btn) => {
    btn.addEventListener('click', () => answerPicture(Number(btn.dataset.index)));
  });

  dom.listeningPlayBtn.addEventListener('click', playListeningAudio);
  dom.listeningOptions.querySelectorAll('.listening-option').forEach((btn) => {
    btn.addEventListener('click', () => answerListening(Number(btn.dataset.index)));
  });

  dom.spellingAudioBtn.addEventListener('click', playSpellingAudio);
  dom.keyHint.addEventListener('click', spellingHint);
  dom.keyDelete.addEventListener('click', spellingDelete);
  dom.spellingKeyboard.querySelectorAll('.key-btn[data-key]').forEach((btn) => {
    btn.addEventListener('click', () => spellingKey(btn.dataset.key));
  });

  document.addEventListener('keydown', onKeydown);

  if (dom.resultBackBtn) dom.resultBackBtn.addEventListener('click', showDashboard);
  if (dom.resultNextBtn) dom.resultNextBtn.addEventListener('click', () => {
    showDashboard();
    openMainPlanPage();
  });
}

function isMobileDevice() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

function isSafariBrowser() {
  const ua = navigator.userAgent || '';
  const hasSafari = /safari/i.test(ua);
  const excluded = /crios|fxios|edgios|opr|opera|chrome|android/i.test(ua);
  return hasSafari && !excluded;
}

function isAndroidDevice() {
  return /android/i.test(navigator.userAgent || '');
}

function isAndroidInstallFriendlyBrowser() {
  const ua = navigator.userAgent || '';
  return /chrome|edg|edga|edgios|samsungbrowser/i.test(ua);
}

function isStandaloneDisplay() {
  const mql = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  return mql || Boolean(window.navigator.standalone);
}

function updateInstallEntry() {
  if (!dom.installEntry || !dom.installAppBtn || !dom.installTip) return;

  if (!isMobileDevice() || isStandaloneDisplay()) {
    dom.installEntry.classList.add('hidden');
    return;
  }

  if (isInstallDismissed() && !deferredInstallPrompt) {
    dom.installEntry.classList.add('hidden');
    return;
  }

  dom.installEntry.classList.remove('hidden');
  dom.installAppBtn.disabled = installPromptPending;

  if (deferredInstallPrompt) {
    clearInstallDismiss();
    dom.installAppBtn.textContent = '下载 App';
    dom.installTip.textContent = '点击即可安装到手机桌面。';
    return;
  }

  if (isIOSDevice() && isSafariBrowser()) {
    dom.installAppBtn.textContent = '安装指引';
    dom.installTip.textContent = '打开“分享”，再选“添加到主屏幕”。';
    return;
  }

  if (isAndroidDevice() && !isAndroidInstallFriendlyBrowser()) {
    dom.installAppBtn.textContent = '安装指引';
    dom.installTip.textContent = '请用 Chrome 或 Edge 打开，再选择“安装应用”。';
    return;
  }

  dom.installAppBtn.textContent = '安装指引';
  dom.installTip.textContent = '在浏览器菜单选择“安装应用”或“添加到主屏幕”。';
}

async function handleInstallApp() {
  if (isStandaloneDisplay()) {
    updateInstallEntry();
    return;
  }

  if (installPromptPending) return;

  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    installPromptPending = true;
    updateInstallEntry();
    promptEvent.prompt();
    try {
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') {
        dom.installTip.textContent = '已开始安装，请到手机桌面查看。';
      } else {
        dom.installTip.textContent = '已取消安装，你可以稍后再试。';
      }
    } catch (e) {
      dom.installTip.textContent = '安装弹窗被中断，请稍后重试。';
    } finally {
      installPromptPending = false;
    }
    updateInstallEntry();
    return;
  }

  if (isIOSDevice() && isSafariBrowser()) {
    dom.installTip.textContent = '请在 Safari 中点击“分享”，再选择“添加到主屏幕”。';
    return;
  }

  if (isAndroidDevice() && !isAndroidInstallFriendlyBrowser()) {
    dom.installTip.textContent = '请用 Chrome 或 Edge 打开，再在菜单中选择“安装应用”。';
    return;
  }

  dom.installTip.textContent = '请在浏览器菜单中选择“安装应用”或“添加到主屏幕”。';
}

function registerInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallEntry();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallEntry();
  });

  window.addEventListener('pageshow', updateInstallEntry);
  window.addEventListener('online', updateInstallEntry);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateInstallEntry();
  });

  updateInstallEntry();
}

function showUpdateBanner(message, onUpdateNow) {
  if (!dom.updateBanner || !dom.updateNowBtn || !dom.updateLaterBtn) return;
  const dismissedAt = Number(localStorage.getItem(SW_UPDATE_DISMISS_KEY) || 0);
  if (dismissedAt && (Date.now() - dismissedAt) < 2 * 60 * 60 * 1000) return;

  if (dom.updateBannerText && message) dom.updateBannerText.textContent = message;
  dom.updateBanner.classList.remove('hidden');
  dom.updateNowBtn.onclick = () => {
    dom.updateBanner.classList.add('hidden');
    localStorage.removeItem(SW_UPDATE_DISMISS_KEY);
    if (typeof onUpdateNow === 'function') onUpdateNow();
  };
  dom.updateLaterBtn.onclick = () => {
    localStorage.setItem(SW_UPDATE_DISMISS_KEY, String(Date.now()));
    dom.updateBanner.classList.add('hidden');
  };
}

function watchServiceWorkerUpdates(registration) {
  if (!registration || !('serviceWorker' in navigator)) return;

  const applyUpdate = () => {
    if (!registration.waiting) return;
    showUpdateBanner('发现新版本，点击立即更新。', () => {
      registration.waiting.postMessage('SKIP_WAITING');
    });
  };

  if (registration.waiting) applyUpdate();

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) applyUpdate();
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

function registerSWEnhanced() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    const register = () => {
      navigator.serviceWorker.register('./sw.js').then((registration) => {
        swRegistrationRef = registration;
        watchServiceWorkerUpdates(registration);
      }).catch(() => {});
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(register, { timeout: 2500 });
    } else {
      setTimeout(register, 1200);
    }
  });
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  });
}

// ========================================
// 离线状态检测
// ========================================
function updateOfflineStatus() {
  const isOffline = !navigator.onLine;
  if (dom.offlineIndicator) {
    dom.offlineIndicator.classList.toggle('hidden', !isOffline);
  }
  document.body.classList.toggle('is-offline', isOffline);
}

function registerOfflineDetection() {
  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);
  updateOfflineStatus();
}

// ========================================
// 自定义计划功能
// ========================================
function generatePlanId() {
  return 'plan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function loadCustomPlans() {
  try {
    const raw = localStorage.getItem(CUSTOM_PLANS_KEY);
    customPlans = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(customPlans)) customPlans = [];
  } catch (e) {
    customPlans = [];
  }
}

function saveCustomPlans() {
  localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(customPlans));
}

function showCustomPlansView() {
  renderCustomPlansList();
  showOnlyView(dom.customPlansView);
}

function showOnlyView(view) {
  [dom.dashboardView, dom.planView, dom.flashcardView, dom.pictureView,
  dom.listeningView, dom.spellingView, dom.resultView, dom.customPlansView].forEach((v) => {
    if (v === view) v.classList.remove('hidden');
    else if (v) v.classList.add('hidden');
  });
}

function renderCustomPlansList() {
  if (!dom.customPlansList) return;

  if (!customPlans.length) {
    dom.customPlansList.innerHTML = `
      <div class="empty-plans">
        <div class="empty-plans-icon">📋</div>
        <div class="empty-plans-text">还没有自定义计划<br>点击下方按钮创建你的第一个计划</div>
      </div>`;
    return;
  }

  dom.customPlansList.innerHTML = customPlans.map(plan => `
    <div class="custom-plan-item" data-plan-id="${plan.id}">
      <div class="plan-item-header">
        <div class="plan-item-name">${escapeHtml(plan.name)}</div>
        <div class="plan-item-badge">
          <span class="plan-badge plan-badge-book">${getBookName(plan.bookId)}</span>
          <span class="plan-badge plan-badge-mode">${modeLabel(plan.mode)}</span>
        </div>
      </div>
      <div class="plan-item-meta">
        <span>每日 ${plan.dailyGoal} 词</span>
        ${plan.wordRange ? `<span>范围 ${plan.wordRange.start}-${plan.wordRange.end}</span>` : '<span>全部词汇</span>'}
      </div>
      <div class="plan-item-actions">
        <button class="plan-action-btn plan-action-start" onclick="executeCustomPlan('${plan.id}')">开始学习</button>
        <button class="plan-action-btn plan-action-delete" onclick="deleteCustomPlan('${plan.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openCustomPlanModal(planId = null) {
  editingPlanId = planId;
  const isEdit = !!planId;
  const plan = isEdit ? customPlans.find(p => p.id === planId) : null;

  if (dom.customPlanModal) {
    const title = dom.customPlanModal.querySelector('h2');
    if (title) title.textContent = isEdit ? '📋 编辑学习计划' : '📋 创建学习计划';
  }

  if (dom.planNameInput) dom.planNameInput.value = isEdit ? plan.name : '';
  if (dom.planBookSelect) dom.planBookSelect.value = isEdit ? plan.bookId : 'cet4';
  if (dom.planModeSelect) dom.planModeSelect.value = isEdit ? plan.mode : 'flashcard';
  if (dom.planGoalInput) {
    dom.planGoalInput.value = isEdit ? plan.dailyGoal : 20;
    if (dom.planGoalValue) dom.planGoalValue.textContent = isEdit ? plan.dailyGoal : '20';
  }
  if (dom.planRangeStart) dom.planRangeStart.value = isEdit && plan.wordRange ? plan.wordRange.start : '';
  if (dom.planRangeEnd) dom.planRangeEnd.value = isEdit && plan.wordRange ? plan.wordRange.end : '';

  updatePlanRangeHint();

  if (dom.customPlanModal) {
    if (typeof dom.customPlanModal.showModal === 'function') dom.customPlanModal.showModal();
    else dom.customPlanModal.setAttribute('open', 'open');
  }
}

function closeCustomPlanModal() {
  if (dom.customPlanModal) {
    if (typeof dom.customPlanModal.close === 'function' && dom.customPlanModal.open) dom.customPlanModal.close();
    else dom.customPlanModal.removeAttribute('open');
  }
  editingPlanId = null;
}

function updatePlanRangeHint() {
  if (!dom.planRangeHint || !dom.planBookSelect) return;
  const bookId = dom.planBookSelect.value;
  const lib = getLibraryFor(bookId);
  dom.planRangeHint.textContent = `可选，该词书共 ${lib.length} 词`;
}

function saveCustomPlanFromModal() {
  const name = (dom.planNameInput?.value || '').trim();
  if (!name) {
    alert('请输入计划名称');
    return;
  }

  const bookId = dom.planBookSelect?.value || 'cet4';
  const mode = dom.planModeSelect?.value || 'flashcard';
  const dailyGoal = parseInt(dom.planGoalInput?.value) || 20;
  const rangeStart = parseInt(dom.planRangeStart?.value) || 0;
  const rangeEnd = parseInt(dom.planRangeEnd?.value) || 0;

  const lib = getLibraryFor(bookId);
  let wordRange = null;
  if (rangeStart > 0 && rangeEnd > 0 && rangeStart <= rangeEnd) {
    wordRange = {
      start: Math.max(1, rangeStart),
      end: Math.min(lib.length, rangeEnd)
    };
  }

  const now = new Date().toISOString();

  if (editingPlanId) {
    const idx = customPlans.findIndex(p => p.id === editingPlanId);
    if (idx >= 0) {
      customPlans[idx] = { ...customPlans[idx], name, bookId, mode, dailyGoal, wordRange, updatedAt: now };
    }
  } else {
    customPlans.push({
      id: generatePlanId(),
      name,
      bookId,
      mode,
      dailyGoal,
      wordRange,
      createdAt: now,
      lastUsed: null
    });
  }

  saveCustomPlans();
  closeCustomPlanModal();
  renderCustomPlansList();
}

function deleteCustomPlan(planId) {
  const plan = customPlans.find(p => p.id === planId);
  if (!plan) return;
  const ok = window.confirm(`确定要删除计划「${plan.name}」吗？`);
  if (!ok) return;
  customPlans = customPlans.filter(p => p.id !== planId);
  saveCustomPlans();
  renderCustomPlansList();
}

function executeCustomPlan(planId) {
  const plan = customPlans.find(p => p.id === planId);
  if (!plan) return;

  // Update last used
  plan.lastUsed = new Date().toISOString();
  saveCustomPlans();

  // Apply plan settings
  state.currentBook = plan.bookId;
  state.learningMode = plan.mode;
  state.dailyGoal = plan.dailyGoal;
  ensureProgress(state.currentBook);
  saveState();

  // Generate custom queue
  const queue = generateCustomPlanQueue(plan);
  if (!queue.length) {
    alert('没有符合条件的单词可以学习');
    return;
  }

  pendingPlan = {
    mode: plan.mode,
    bookId: plan.bookId,
    queue,
    reviewCount: queue.filter(w => w && w.isReview).length,
    newCount: queue.filter(w => w && !w.isReview).length
  };

  dom.planSubtitle.textContent = `${today()} · ${modeLabel(plan.mode)}`;
  dom.planBook.textContent = getBookName(plan.bookId);
  dom.planMode.textContent = modeLabel(plan.mode);
  dom.planReview.textContent = String(pendingPlan.reviewCount);
  dom.planNew.textContent = String(pendingPlan.newCount);
  dom.planTotal.textContent = String(queue.length);
  dom.planStartBtn.disabled = queue.length === 0;

  showOnlyView(dom.planView);
}

function generateCustomPlanQueue(plan) {
  const book = plan.bookId;
  ensureProgress(book);
  const lib = getLibraryFor(book);
  if (!lib.length) return [];

  // Apply word range filter
  let filteredLib = lib;
  if (plan.wordRange && plan.wordRange.start && plan.wordRange.end) {
    const start = Math.max(0, plan.wordRange.start - 1);
    const end = Math.min(lib.length, plan.wordRange.end);
    filteredLib = lib.slice(start, end).map((w, i) => ({ ...w, originalIndex: start + i }));
  } else {
    filteredLib = lib.map((w, i) => ({ ...w, originalIndex: i }));
  }

  const byWord = new Map();
  filteredLib.forEach(w => byWord.set(nword(w.word), w));

  // Find review words within range
  const review = [];
  const t = today();
  Object.keys(state.wordRecords).forEach(k => {
    const r = state.wordRecords[k];
    if (!r || r.bookId !== book || !r.nextReviewDate || r.nextReviewDate > t) return;
    const x = byWord.get(nword(r.word));
    if (!x) return;
    review.push({ ...x, isReview: true, currentLevel: r.level || 0 });
  });

  const reviewSet = new Set(review.map(w => nword(w.word)));
  const need = Math.max(0, plan.dailyGoal);
  const news = [];

  for (let i = 0; i < filteredLib.length && news.length < need; i++) {
    const w = filteredLib[i];
    if (state.wordRecords[rkey(book, w.word)] || reviewSet.has(nword(w.word))) continue;
    news.push({ ...w, isReview: false, currentLevel: 0 });
  }

  return shuffle([...review, ...news]);
}

function bindCustomPlanEvents() {
  if (dom.customPlanBtn) {
    dom.customPlanBtn.addEventListener('click', showCustomPlansView);
  }
  if (dom.customPlansBackBtn) {
    dom.customPlansBackBtn.addEventListener('click', showDashboard);
  }
  if (dom.createPlanBtn) {
    dom.createPlanBtn.addEventListener('click', () => openCustomPlanModal());
  }
  if (dom.cancelPlanModal) {
    dom.cancelPlanModal.addEventListener('click', closeCustomPlanModal);
  }
  if (dom.savePlanBtn) {
    dom.savePlanBtn.addEventListener('click', saveCustomPlanFromModal);
  }
  if (dom.planGoalInput && dom.planGoalValue) {
    dom.planGoalInput.addEventListener('input', (e) => {
      dom.planGoalValue.textContent = e.target.value;
    });
  }
  if (dom.planBookSelect) {
    dom.planBookSelect.addEventListener('change', updatePlanRangeHint);
  }
  if (dom.customPlanModal) {
    dom.customPlanModal.addEventListener('click', (e) => {
      if (e.target === dom.customPlanModal) closeCustomPlanModal();
    });
  }
}

function init() {
  loadState();
  hydrateReviewFields();
  loadCustomPlans();
  ensureProgress(state.currentBook);
  saveState();
  normalizeStaticLabels();
  loadWrongFilters();
  bindEvents();
  bindCustomPlanEvents();
  showDashboard();
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  scheduleReminder();
  registerInstallPrompt();
  registerSWEnhanced();
  registerOfflineDetection();
}

document.addEventListener('DOMContentLoaded', init);
