(function () {
  const summary = document.getElementById('summary');
  const details = document.getElementById('details');

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function run() {
    const core = window.VocabCore;
    assert(core, 'VocabCore not loaded');

    const logs = [];

    const known1 = core.computeReviewProgress({ level: 0, repetition: 0, intervalDays: 0, easeFactor: 2.5 }, 'known');
    assert(known1.repetition === 1, 'SM-2 known step 1 repetition mismatch');
    assert(known1.intervalDays === 1, 'SM-2 known step 1 interval mismatch');
    logs.push('SM-2 known step 1 passed');

    const known2 = core.computeReviewProgress({ level: known1.level, repetition: known1.repetition, intervalDays: known1.intervalDays, easeFactor: known1.easeFactor }, 'known');
    assert(known2.repetition === 2, 'SM-2 known step 2 repetition mismatch');
    assert(known2.intervalDays === 3, 'SM-2 known step 2 interval mismatch');
    logs.push('SM-2 known step 2 passed');

    const fuzzy = core.computeReviewProgress({ level: 3, repetition: 3, intervalDays: 8, easeFactor: 2.5 }, 'fuzzy');
    assert(fuzzy.intervalDays >= 2, 'SM-2 fuzzy interval must be >= 2');
    assert(fuzzy.easeFactor < 2.5, 'SM-2 fuzzy should reduce ease');
    logs.push('SM-2 fuzzy step passed');

    const unknown = core.computeReviewProgress({ level: 4, repetition: 5, intervalDays: 20, easeFactor: 2.3 }, 'unknown');
    assert(unknown.repetition === 0, 'SM-2 unknown should reset repetition');
    assert(unknown.intervalDays === 1, 'SM-2 unknown should reset interval to 1');
    assert(unknown.easeFactor < 2.3, 'SM-2 unknown should reduce ease');
    logs.push('SM-2 unknown step passed');

    const queue = core.buildWrongQueue({
      bookId: 'cet4',
      limit: 2,
      library: [
        { word: 'abandon', definition: '放弃' },
        { word: 'accurate', definition: '准确的' },
        { word: 'brief', definition: '简短的' }
      ],
      records: {
        'cet4::abandon': { bookId: 'cet4', word: 'abandon', incorrectCount: 3, fuzzyCount: 0, correctCount: 0, level: 0, lapseCount: 2, lastResult: 'unknown' },
        'cet4::accurate': { bookId: 'cet4', word: 'accurate', incorrectCount: 1, fuzzyCount: 2, correctCount: 0, level: 1, lapseCount: 0, lastResult: 'fuzzy' },
        'cet4::brief': { bookId: 'cet4', word: 'brief', incorrectCount: 0, fuzzyCount: 1, correctCount: 0, level: 0, lapseCount: 0, lastResult: '' }
      }
    });
    assert(queue.length === 2, 'Wrong queue limit should be respected');
    assert(queue[0].word === 'abandon', 'Wrong queue ranking should prioritize hardest item');
    logs.push('Wrong queue ranking passed');

    const filtered = core.filterWrongEntries(
      [
        { word: 'abandon', definition: '放弃', score: 9, nextReviewDate: '2026-02-10', lastSeen: '2026-02-09' },
        { word: 'accurate', definition: '准确', score: 5, nextReviewDate: '2026-02-08', lastSeen: '2026-02-07' },
        { word: 'brief', definition: '简短', score: 7, nextReviewDate: '2026-02-11', lastSeen: '2026-02-06' }
      ],
      { keyword: 'ac', onlyHard: false, sort: 'alpha' }
    );
    assert(filtered.length === 1 && filtered[0].word === 'accurate', 'Filter by keyword failed');
    logs.push('Wrong filter keyword passed');

    const hardOnly = core.filterWrongEntries(
      [
        { word: 'a', definition: '', score: 4, nextReviewDate: '', lastSeen: '' },
        { word: 'b', definition: '', score: 7, nextReviewDate: '', lastSeen: '' }
      ],
      { keyword: '', onlyHard: true, sort: 'score' }
    );
    assert(hardOnly.length === 1 && hardOnly[0].word === 'b', 'Filter hard-only failed');
    logs.push('Wrong filter hard-only passed');

    summary.textContent = `Passed ${logs.length} regression checks`;
    summary.className = 'ok';
    details.textContent = logs.map((x, i) => `${i + 1}. ${x}`).join('\n');
  }

  try {
    run();
  } catch (error) {
    summary.textContent = `Failed: ${error.message}`;
    summary.className = 'fail';
    details.textContent = String(error && error.stack ? error.stack : error);
  }
})();
