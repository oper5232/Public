'use strict';
// Shared browser/Node filter rules. Missing data is never inferred from company names.
(function (root) {
  const sizes = ['대기업', '중견기업', '중소기업', '기타'];
  const employment = ['정규직', '계약직', '인턴', '파견직', '아르바이트', '기타'];
  const scopes = ['title', 'company', 'duties', 'requirements'];
  const defaults = () => ({sizes: [], employment: [], roles: '', include: '', exclude: '',
    regions: '', scopes: [...scopes], keywordMode: 'any', includeUnknown: true,
    hideClosed: false, sort: 'original'});
  const terms = value => String(value || '').split(/[,，\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  function normalize(raw) {
    const f = defaults(), source = raw && typeof raw === 'object' ? raw : {};
    for (const [key, options] of [['sizes', sizes], ['employment', employment], ['scopes', scopes]]) {
      if (Array.isArray(source[key])) f[key] = [...new Set(source[key].filter(v => options.includes(v)))];
    }
    if (!f.scopes.length) f.scopes = [...scopes];
    for (const key of ['roles', 'include', 'exclude', 'regions']) {
      if (typeof source[key] === 'string') f[key] = source[key].slice(0, 1000);
    }
    for (const key of ['includeUnknown', 'hideClosed']) {
      if (typeof source[key] === 'boolean') f[key] = source[key];
    }
    f.keywordMode = source.keywordMode === 'all' ? 'all' : 'any';
    f.sort = source.sort === 'deadline' ? 'deadline' : 'original';
    return f;
  }
  function metadata(c) {
    const s = c.snapshot || {}, rawSize = c.company_size || s.company_size || '';
    const size = sizes.includes(rawSize) ? rawSize : '미확인';
    const rawEmployment = typeof s.employment === 'string' ? s.employment : '';
    const knownEmployment = rawEmployment && !['미확인', '미기재'].includes(rawEmployment.trim());
    const currentEmployment = rawEmployment.replace(/정규직\s*전환[^,;/]*/g, '');
    const types = employment.filter(t => t !== '기타' &&
      new RegExp('(^|[^가-힣])' + t + '($|[^가-힣])').test(currentEmployment));
    if (!types.length) types.push(knownEmployment ? '기타' : '미확인');
    return {size, types};
  }
  function date(value) {
    if (typeof value !== 'string') return null;
    const day = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const parsed = new Date(day + 'T00:00:00Z');
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day ? null : day;
  }
  const todaySeoul = () => new Intl.DateTimeFormat('sv-SE', {timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  function matches(c, raw, quick = '', today = todaySeoul()) {
    const f = normalize(raw), s = c.snapshot || {}, m = metadata(c);
    if (f.sizes.length && !(f.sizes.includes(m.size) || (m.size === '미확인' && f.includeUnknown))) return false;
    if (f.employment.length && !(m.types.some(t => f.employment.includes(t)) ||
        (m.types.includes('미확인') && f.includeUnknown))) return false;
    const roleText = [c.title, c.family, s.duties].filter(v => typeof v === 'string').join(' ').toLowerCase();
    if (terms(f.roles).length && !terms(f.roles).some(t => roleText.includes(t))) return false;
    const regionText = typeof s.location === 'string' ? s.location.toLowerCase() : '';
    const regionUnknown = !regionText || ['미확인', '미기재'].includes(regionText);
    if (terms(f.regions).length && !(terms(f.regions).some(t => regionText.includes(t)) ||
        (regionUnknown && f.includeUnknown))) return false;
    const values = {title: c.title, company: c.company, duties: s.duties, requirements: s.requirements};
    const text = f.scopes.map(k => typeof values[k] === 'string' ? values[k] : '').join(' ').toLowerCase();
    for (const group of [terms(f.include), terms(quick)]) {
      if (group.length && !(f.keywordMode === 'all' ? group.every(t => text.includes(t)) : group.some(t => text.includes(t)))) return false;
    }
    if (terms(f.exclude).some(t => text.includes(t))) return false;
    const deadline = date(s.deadline);
    if (f.hideClosed && deadline && deadline < today) return false;
    return true;
  }
  function filter(items, raw, quick = '', today = todaySeoul()) {
    const f = normalize(raw), result = items.filter(c => matches(c, f, quick, today));
    if (f.sort === 'deadline') result.sort((a, b) => {
      const ad = date((a.snapshot || {}).deadline) || '9999-99-99';
      const bd = date((b.snapshot || {}).deadline) || '9999-99-99';
      return ad.localeCompare(bd) || String(a.id).localeCompare(String(b.id));
    });
    return result;
  }
  function summarize(raw) {
    const f = normalize(raw), parts = [];
    if (f.sizes.length) parts.push(f.sizes.join('·'));
    if (f.employment.length) parts.push(f.employment.join('·'));
    if (f.roles.trim()) parts.push('분야: ' + f.roles);
    if (f.include.trim()) parts.push('포함: ' + f.include);
    if (f.exclude.trim()) parts.push('제외: ' + f.exclude);
    if (f.regions.trim()) parts.push('지역: ' + f.regions);
    if (f.hideClosed) parts.push('마감 공고 숨김');
    if (!f.includeUnknown) parts.push('선택 항목의 미확인 정보 제외');
    return parts.join(' / ') || '조건 제한 없음';
  }
  const api = {sizes, employment, scopes, defaults, normalize, metadata, matches, filter, summarize, todaySeoul};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JobFilters = api;
})(globalThis);
