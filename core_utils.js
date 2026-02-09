(function (global) {
  'use strict';

  const DEFAULTS = {
    sm2MinEase: 1.3,
    sm2MaxEase: 2.9,
    sm2DefaultEase: 2.5,
    sm2MaxIntervalDays: 120
  };

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function intervalToLevel(days) {
    const d = Math.max(0, Number(days) || 0);
    if (d >= 60) return 5;
    if (d >= 21) return 4;
    if (d >= 7) return 3;
    if (d >= 3) return 2;
    if (d >= 1) return 1;
    return 0;
  }

  function normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function wrongEntryMatches(entry, keyword) {
    const k = normalizeSearchText(keyword);
    if (!k) return true;
    const word = normalizeSearchText(entry && entry.word);
    const def = normalizeSearchText(entry && entry.definition);
    return word.includes(k) || def.includes(k);
  }

  function sortWrongEntries(list, sortKey) {
    const x = Array.isArray(list) ? [...list] : [];
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
    x.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    return x;
  }

  function filterWrongEntries(entries, filters) {
    const f = filters && typeof filters === 'object' ? filters : {};
    const keyword = String(f.keyword || '').trim();
    const sort = String(f.sort || 'score');
    const onlyHard = Boolean(f.onlyHard);
    const list = Array.isArray(entries) ? entries : [];

    const filtered = list
      .filter((item) => wrongEntryMatches(item, keyword))
      .filter((item) => !onlyHard || (Number(item.score) || 0) >= 6);
    return sortWrongEntries(filtered, sort);
  }

  function computeReviewProgress(prev, status, options) {
    const opt = { ...DEFAULTS, ...(options || {}) };
    const resultStatus = status === 'known' || status === 'fuzzy' || status === 'unknown' ? status : 'unknown';

    const levelRaw = Math.max(0, Number(prev && prev.level) || 0);
    const repetitionRaw = Math.max(0, Number(prev && prev.repetition) || 0);
    const intervalRaw = clampNumber(prev && prev.intervalDays, 0, opt.sm2MaxIntervalDays, levelRaw > 0 ? levelRaw : 0);
    const easeRaw = clampNumber(prev && prev.easeFactor, opt.sm2MinEase, opt.sm2MaxEase, opt.sm2DefaultEase);

    let level = levelRaw;
    let repetition = repetitionRaw;
    let intervalDays = intervalRaw;
    let easeFactor = easeRaw;

    if (resultStatus === 'unknown') {
      repetition = 0;
      intervalDays = 1;
      easeFactor = Math.max(opt.sm2MinEase, easeFactor - 0.2);
      level = Math.max(0, level - 1);
    } else if (resultStatus === 'fuzzy') {
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
      easeFactor = Math.max(opt.sm2MinEase, easeFactor - 0.05);
      level = Math.max(0, intervalToLevel(intervalDays) - 1);
    } else {
      if (repetition === 0) intervalDays = 1;
      else if (repetition === 1) intervalDays = 3;
      else intervalDays = Math.max(4, Math.round(intervalDays * easeFactor));
      repetition += 1;
      easeFactor = Math.min(opt.sm2MaxEase, easeFactor + 0.02);
      level = intervalToLevel(intervalDays);
    }

    intervalDays = clampNumber(intervalDays, 1, opt.sm2MaxIntervalDays, 1);
    return {
      level,
      repetition,
      intervalDays,
      easeFactor
    };
  }

  function buildWrongQueue(params) {
    const p = params && typeof params === 'object' ? params : {};
    const bookId = String(p.bookId || '');
    const limit = Math.max(1, Number(p.limit) || 20);
    const library = Array.isArray(p.library) ? p.library : [];
    const records = p.records && typeof p.records === 'object' ? p.records : {};

    const byWord = new Map();
    library.forEach((w, i) => {
      if (!w || !w.word) return;
      byWord.set(normalizeSearchText(w.word), { ...w, originalIndex: i });
    });

    const ranked = [];
    Object.keys(records).forEach((k) => {
      const r = records[k];
      if (!r || r.bookId !== bookId || !r.word) return;
      const libWord = byWord.get(normalizeSearchText(r.word));
      if (!libWord) return;

      const incorrect = Math.max(0, Number(r.incorrectCount) || 0);
      const fuzzy = Math.max(0, Number(r.fuzzyCount) || 0);
      const correct = Math.max(0, Number(r.correctCount) || 0);
      if (incorrect <= 0 && fuzzy < 2) return;

      const level = Math.max(0, Number(r.level) || 0);
      const lapse = Math.max(0, Number(r.lapseCount) || 0);
      const lastPenalty = r.lastResult === 'unknown' ? 2 : r.lastResult === 'fuzzy' ? 1 : 0;
      const wrongScore = incorrect * 2 + fuzzy + lapse + lastPenalty - Math.floor(correct / 2) - level;
      ranked.push({
        ...libWord,
        isReview: true,
        currentLevel: level,
        wrongScore
      });
    });

    ranked.sort((a, b) => (Number(b.wrongScore) || 0) - (Number(a.wrongScore) || 0));
    return ranked.slice(0, limit).map((w) => {
      const out = { ...w };
      delete out.wrongScore;
      return out;
    });
  }

  global.VocabCore = {
    clampNumber,
    intervalToLevel,
    normalizeSearchText,
    wrongEntryMatches,
    sortWrongEntries,
    filterWrongEntries,
    computeReviewProgress,
    buildWrongQueue
  };
})(typeof window !== 'undefined' ? window : globalThis);
