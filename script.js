const STORAGE_KEY = 'vocab_flashcard_data_v2';
const LEGACY_STORAGE_KEY = 'vocab_flashcard_data';
const ACTIVE_SESSION_KEY = 'vocab_flashcard_active_session_v1';
const BACKUP_VERSION = 1;
const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];
const MODES = new Set(['flashcard', 'picture', 'listening', 'spelling']);
const PICTURE_EMOJIS = ['🧩', '🎯', '📚', '🧠', '🔍', '🌟', '🧭', '📝', '🎨', '🪄'];

const DEFAULT_STATE = {
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
  todayReviewCount: 0
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
  currentPlan: document.getElementById('currentPlan'),
  bookCet4: document.getElementById('bookCet4'),
  bookCet6: document.getElementById('bookCet6'),
  bookKaoyan: document.getElementById('bookKaoyan'),
  dailyGoalSlider: document.getElementById('dailyGoalSlider'),
  dailyGoalValue: document.getElementById('dailyGoalValue'),
  statLearned: document.getElementById('statLearned'),
  statStreak: document.getElementById('statStreak'),
  statTotal: document.getElementById('statTotal'),
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
  backupFileInput: document.getElementById('backupFileInput'),
  installEntry: document.getElementById('installEntry'),
  installTip: document.getElementById('installTip'),
  installAppBtn: document.getElementById('installAppBtn'),
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
  resultNextBtn: document.getElementById('resultNextBtn')
};

function nword(v) { return String(v || '').trim().toLowerCase(); }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseDay(s) { const [y, m, d] = String(s || '').split('-').map(Number); return y && m && d ? new Date(y, m - 1, d) : null; }
function dayDiff(a, b) { const da = parseDay(a); const db = parseDay(b); return da && db ? Math.round((db - da) / 86400000) : 0; }
function addDays(s, x) { const d = parseDay(s) || new Date(); d.setDate(d.getDate() + x); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function shuffle(arr) { const x = [...arr]; for (let i = x.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
function rkey(book, word) { return `${book}::${nword(word)}`; }
function ensureProgress(book) { if (!state.bookProgress[book]) state.bookProgress[book] = { learnedIndex: 0 }; }
function clearTimer() { if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null; } }

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
    nextState = normalizeState(data.state);
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

function normalizeState(raw) {
  const s = JSON.parse(JSON.stringify(DEFAULT_STATE));
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
  return s;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    return;
  }
  try {
    state = normalizeState(JSON.parse(raw));
  } catch (e) {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
  if (state.lastStudyDate !== today()) {
    state.todayNewCount = 0; state.todayReviewCount = 0;
    if (state.lastStudyDate && dayDiff(state.lastStudyDate, today()) > 1) state.streak = 0;
  }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
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

function applyStudy(status) {
  if (!currentWord) return;
  markStudyToday();
  updateWordRecord(currentWord, status);
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
  [dom.dashboardView, dom.planView, dom.flashcardView, dom.pictureView, dom.listeningView, dom.spellingView, dom.resultView].forEach((v) => {
    if (v === view) v.classList.remove('hidden'); else v.classList.add('hidden');
  });
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
  dom.currentPlan.textContent = `当前计划：${getBookName(state.currentBook)}`;
  dom.statLearned.textContent = String(state.todayNewCount + state.todayReviewCount);
  dom.statStreak.textContent = String(state.streak);
  dom.statTotal.textContent = String(state.totalLearned);
  dom.dailyGoalSlider.value = String(state.dailyGoal);
  dom.dailyGoalValue.textContent = String(state.dailyGoal);
  dom.bookCet4.classList.toggle('selected', state.currentBook === 'cet4');
  dom.bookCet6.classList.toggle('selected', state.currentBook === 'cet6');
  dom.bookKaoyan.classList.toggle('selected', state.currentBook === 'kaoyan');
  dom.modeFlashcard.classList.toggle('selected', state.learningMode === 'flashcard');
  dom.modePicture.classList.toggle('selected', state.learningMode === 'picture');
  dom.modeListening.classList.toggle('selected', state.learningMode === 'listening');
  dom.modeSpelling.classList.toggle('selected', state.learningMode === 'spelling');
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
  if (leavingLearningView && sessionQueue.length && sessionIndex < sessionQueue.length) saveActiveSession();
  pendingPlan = null;
  clearTimer();
  answerLocked = false;
  hideFeedback();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  showOnly(dom.dashboardView);
  updateDashboard();
}

function completeSession() {
  sessionResult.endAt = Date.now();
  const finalCount = sessionStudied;
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
  state.currentBook = book; ensureProgress(book); saveState(); updateDashboard();
}

function selectMode(mode) {
  if (!MODES.has(mode)) return;
  state.learningMode = mode; saveState(); updateDashboard();
}

function startSession() {
  openPlanPage();
}

function modeLabel(mode) {
  if (mode === 'picture') return '图片选义';
  if (mode === 'listening') return '听音选义';
  if (mode === 'spelling') return '拼写模式';
  return '闪卡模式';
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

function modalOpen() { return Boolean(dom.importModal.open || dom.importModal.hasAttribute('open')); }

function onKeydown(e) {
  if (modalOpen()) { if (e.key === 'Escape') closeImportModal(); return; }

  if (!dom.planView.classList.contains('hidden')) {
    if (e.key === 'Escape') showDashboard();
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startPlannedSession(); }
    return;
  }

  if (!dom.resultView.classList.contains('hidden')) {
    if (e.key === 'Escape') showDashboard();
    else if (e.key === 'Enter') { e.preventDefault(); showDashboard(); openPlanPage(); }
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
  if (dom.backupFileInput) dom.backupFileInput.addEventListener('change', handleBackupFileChange);
  if (dom.installAppBtn) dom.installAppBtn.addEventListener('click', handleInstallApp);

  dom.backBtn.addEventListener('click', showDashboard);
  dom.pictureBackBtn.addEventListener('click', showDashboard);
  dom.listeningBackBtn.addEventListener('click', showDashboard);
  dom.spellingBackBtn.addEventListener('click', showDashboard);

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
    openPlanPage();
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

  dom.installEntry.classList.remove('hidden');
  dom.installAppBtn.disabled = false;

  if (deferredInstallPrompt) {
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

  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
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
    }
    updateInstallEntry();
    return;
  }

  if (isIOSDevice() && isSafariBrowser()) {
    alert('请在 Safari 点击“分享”，然后选择“添加到主屏幕”。');
    return;
  }

  if (isAndroidDevice() && !isAndroidInstallFriendlyBrowser()) {
    alert('请用 Chrome 或 Edge 打开当前页面，再在菜单中选择“安装应用”。');
    return;
  }

  alert('请在浏览器菜单选择“安装应用”或“添加到主屏幕”。');
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
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateInstallEntry();
  });

  updateInstallEntry();
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

function init() {
  loadState();
  ensureProgress(state.currentBook);
  saveState();
  bindEvents();
  showDashboard();
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  registerInstallPrompt();
  registerSW();
}

document.addEventListener('DOMContentLoaded', init);
