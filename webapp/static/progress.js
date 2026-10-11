'use strict';
const WritingProgress = {
  summarize(items) {
    const done = q => q.status === '완료' && Boolean(q.answer.trim());
    const completed = items.filter(done).length;
    const invalid = items.filter(q => q.status === '완료' && !q.answer.trim()).length;
    const writing = items.filter(q => q.status === '작성중').length + invalid;
    return {total:items.length, completed, writing, pending:items.length-completed-writing,
      invalid_completed:invalid, percent:items.length ? Math.floor(completed*100/items.length) : 0,
      all_completed:items.length > 0 && completed === items.length,
      next_id:items.find(q => !done(q))?.id || null};
  }
};
if (typeof module !== 'undefined') module.exports = WritingProgress;
