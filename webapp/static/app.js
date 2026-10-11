'use strict';
const main = document.getElementById('main');
let config, routeGeneration = 0, currentRoute = location.hash || '#list', toastTimer;
const dirty = new Set();
let stopProgressWatch = () => {};
const charLength = value => Array.from(value).length;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field = (label, value) => `<div class="field"><dt>${esc(label)}</dt><dd>${esc(value || '미확인')}</dd></div>`;
const stateClass = s => ({'승인':'approved','제외':'excluded','보류':'held'}[s] || '');
const stateTag = s => `<span class="state ${stateClass(s)}">${esc(s || '미확인')}</span>`;
const empty = (title, text) => `<div class="empty"><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;
const FILTER_KEY = 'career.search-settings.v1';
const defaultFilterState = () => ({version:1, activeId:'all', presets:[{id:'all', name:'전체 공고', filters:JobFilters.defaults()}]});
function readFilterState() {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTER_KEY));
    if (!raw || raw.version !== 1 || !Array.isArray(raw.presets)) return defaultFilterState();
    const ids = new Set(), presets = raw.presets.filter(p => {
      if (!p || typeof p.id !== 'string' || !/^[\w-]{1,50}$/.test(p.id) || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim()) return false;
      ids.add(p.id); return true;
    }).slice(0,20).map(p => ({id:p.id, name:p.name.trim().slice(0,40), filters:JobFilters.normalize(p.filters)}));
    if (!presets.length) return defaultFilterState();
    return {version:1, presets, activeId:presets.some(p => p.id === raw.activeId) ? raw.activeId : presets[0].id};
  } catch { return defaultFilterState(); }
}
let filterState = readFilterState(), quickSearch = '';
const activePreset = () => filterState.presets.find(p => p.id === filterState.activeId) || filterState.presets[0];
function saveFilterState(next) {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify(next)); filterState = next; return true; }
  catch { notify('브라우저에 설정을 저장하지 못했습니다. 저장 공간과 개인정보 보호 설정을 확인하세요.'); return false; }
}
function renderSettings() {
  activeNav('settings');
  const preset = activePreset(), f = preset.filters;
  const checks = (name, options, selected) => options.map(v => `<label><input type="checkbox" name="${name}" value="${esc(v)}" ${selected.includes(v) ? 'checked' : ''}>${esc(v)}</label>`).join('');
  main.innerHTML = `<div class="page-head"><div><div class="eyebrow">SEARCH PREFERENCES</div><h1>검색 설정</h1><p class="subtitle">나에게 맞는 조건을 저장하고, 찾는 직무에 따라 전환하세요.</p></div><a class="button small ghost" href="#list">공고 목록</a></div>
    <section class="panel"><div class="preset-bar"><label for="preset-select">저장한 조건</label><select id="preset-select">${filterState.presets.map(p => `<option value="${esc(p.id)}" ${p.id === preset.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select><button class="button small danger" id="delete-preset" ${filterState.presets.length === 1 ? 'disabled' : ''}>조건 삭제</button></div></section>
    <form id="settings-form"><section class="panel"><div class="panel-heading"><h2>공고 선택 조건</h2><span class="badge">복수 선택</span></div>
      <label class="form-label" for="preset-name">검색 조건 이름</label><input id="preset-name" name="presetName" required maxlength="40" value="${esc(preset.name)}" placeholder="예: 전기보전 · 정규직">
      <fieldset class="filter-group"><legend>기업 규모</legend><div class="check-grid">${checks('sizes', JobFilters.sizes, f.sizes)}</div><p class="muted">선택하지 않으면 모든 규모를 표시합니다. 회사명만으로 기업 규모를 추정하지 않습니다.</p></fieldset>
      <fieldset class="filter-group"><legend>고용 형태</legend><div class="check-grid">${checks('employment', JobFilters.employment, f.employment)}</div></fieldset>
      <label class="form-label" for="roles">모집 분야</label><input id="roles" name="roles" value="${esc(f.roles)}" maxlength="1000" placeholder="전기설비, 전기보전, 설비기술"><p class="search-hint">제목·기본직무·담당업무에 하나라도 포함하면 표시합니다.</p>
      <label class="form-label" for="regions">근무 지역</label><input id="regions" name="regions" value="${esc(f.regions)}" maxlength="1000" placeholder="울산, 이천, 여수"><p class="search-hint">빈 값이면 지역 제한이 없습니다. 키워드는 쉼표로 구분합니다.</p></section>
    <section class="panel"><div class="panel-heading"><h2>키워드 검색</h2></div>
      <label class="form-label" for="include">포함 키워드</label><input id="include" name="include" value="${esc(f.include)}" maxlength="1000" placeholder="변압기, 수변전">
      <label class="form-label" for="exclude">제외 키워드</label><input id="exclude" name="exclude" value="${esc(f.exclude)}" maxlength="1000" placeholder="영업, 파견"><p class="search-hint">제외 키워드 중 하나라도 포함되면 숨깁니다. 회사명도 검색 범위로 선택할 수 있습니다.</p>
      <fieldset class="filter-group"><legend>검색 범위</legend><div class="check-grid">${[['title','공고 제목'],['company','회사명'],['duties','담당업무'],['requirements','자격요건']].map(([key,label]) => `<label><input type="checkbox" name="scopes" value="${key}" ${f.scopes.includes(key) ? 'checked' : ''}>${label}</label>`).join('')}</div></fieldset>
      <label class="form-label" for="keyword-mode">포함 키워드·목록 검색어 일치 방식</label><select id="keyword-mode" name="keywordMode"><option value="any" ${f.keywordMode === 'any' ? 'selected' : ''}>하나라도 포함</option><option value="all" ${f.keywordMode === 'all' ? 'selected' : ''}>모두 포함</option></select></section>
    <section class="panel"><h2>표시 방식</h2><div class="check-stack"><label><input type="checkbox" name="includeUnknown" ${f.includeUnknown ? 'checked' : ''}>선택한 기업 규모·고용 형태·지역이 미확인인 공고도 포함</label><label><input type="checkbox" name="hideClosed" ${f.hideClosed ? 'checked' : ''}>마감된 공고 숨김</label></div>
      <label class="form-label" for="sort">정렬</label><select id="sort" name="sort"><option value="original" ${f.sort === 'original' ? 'selected' : ''}>기존 조회 순서</option><option value="deadline" ${f.sort === 'deadline' ? 'selected' : ''}>마감일 가까운 순</option></select>
      <div class="notice">기업 규모가 없는 공고는 미확인으로 처리합니다. 마감일이 없으면 마감된 것으로 간주하지 않습니다. 날짜는 한국 시간 기준입니다.</div>
      <div class="actions"><button class="button primary" type="submit">설정 저장·적용</button><button class="button" type="button" id="save-new-preset">새 조건으로 저장</button><button class="button ghost" type="button" id="reset-settings">조건 초기화</button></div>
      <p class="save-message" id="settings-message" role="status">설정은 이 브라우저에 저장됩니다. 기존 공고와 승인 상태는 변경하지 않습니다.</p></section></form>`;
  const form = document.getElementById('settings-form');
  const message = document.getElementById('settings-message');
  form.addEventListener('input', () => { dirty.add('settings'); message.textContent = '변경한 설정을 아직 저장하지 않았습니다.'; });
  form.addEventListener('change', () => dirty.add('settings'));
  function readForm() {
    const values = new FormData(form);
    if (!values.getAll('scopes').length) throw new Error('검색 범위를 하나 이상 선택하세요.');
    return JobFilters.normalize({sizes:values.getAll('sizes'), employment:values.getAll('employment'),
      scopes:values.getAll('scopes'), roles:values.get('roles'), regions:values.get('regions'),
      include:values.get('include'), exclude:values.get('exclude'), keywordMode:values.get('keywordMode'),
      includeUnknown:values.has('includeUnknown'), hideClosed:values.has('hideClosed'), sort:values.get('sort')});
  }
  function save(asNew) {
    if (!form.reportValidity()) return;
    try {
      const name = form.elements.presetName.value.trim();
      if (!name) throw new Error('검색 조건 이름을 입력하세요.');
      if (asNew && filterState.presets.length >= 20) throw new Error('검색 조건은 최대 20개까지 저장할 수 있습니다.');
      if (filterState.presets.some(p => p.name === name && (asNew || p.id !== preset.id))) throw new Error('다른 이름으로 저장하세요. 같은 이름의 검색 조건이 있습니다.');
      const next = {id:asNew ? crypto.randomUUID() : preset.id, name, filters:readForm()};
      const presets = asNew ? [...filterState.presets, next] : filterState.presets.map(p => p.id === preset.id ? next : p);
      if (!saveFilterState({version:1, activeId:next.id, presets})) return;
      dirty.delete('settings'); quickSearch = ''; notify('검색 조건을 저장하고 적용했습니다.'); renderSettings();
    } catch (error) { message.textContent = error.message; message.classList.add('error'); }
  }
  form.addEventListener('submit', e => { e.preventDefault(); save(false); });
  document.getElementById('save-new-preset').addEventListener('click', () => save(true));
  document.getElementById('reset-settings').addEventListener('click', () => {
    form.querySelectorAll('input[type=checkbox]').forEach(e => e.checked = ['scopes','includeUnknown'].includes(e.name));
    for (const name of ['roles','regions','include','exclude']) form.elements[name].value = '';
    form.elements.keywordMode.value = 'any'; form.elements.sort.value = 'original';
    dirty.add('settings'); message.textContent = '조건을 초기화했습니다. 설정 저장·적용을 눌러 반영하세요.';
  });
  document.getElementById('preset-select').addEventListener('change', e => {
    if (dirty.size && !window.confirm('저장하지 않은 설정을 버리고 다른 조건을 불러올까요?')) { e.target.value = preset.id; return; }
    if (saveFilterState({...filterState, activeId:e.target.value})) { dirty.clear(); quickSearch = ''; renderSettings(); }
  });
  document.getElementById('delete-preset').addEventListener('click', () => {
    if (filterState.presets.length < 2 || !window.confirm('이 검색 조건을 삭제할까요?')) return;
    const presets = filterState.presets.filter(p => p.id !== preset.id);
    if (saveFilterState({version:1, presets, activeId:presets[0].id})) { dirty.clear(); quickSearch = ''; renderSettings(); }
  });
}
function safeURL(value) {
  try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; }
  catch { return ''; }
}
function notify(message) {
  const el = document.getElementById('toast'); el.textContent = message; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 4000);
}
async function api(path, method = 'GET', body) {
  const response = await fetch(path, {method, headers: method === 'GET' ? {} : {
    'Content-Type':'application/json', 'X-CSRF-Token':config.csrf},
    body: body === undefined ? undefined : JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) { const e = new Error(data.error || '요청에 실패했습니다.'); e.status = response.status; throw e; }
  return data;
}
function activeNav(state) {
  document.querySelectorAll('nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.state === state);
    if (a.dataset.state === state) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
}
function progressHTML(p, cid, onPage = false) {
  const label = !p.total ? '문항 미등록' : p.all_completed ? '전체 작성 완료' : `작성 완료 ${p.completed}/${p.total}문항 · ${p.percent}%`;
  const href = `#questions/${cid}${p.next_id ? '/' + encodeURIComponent(p.next_id) : ''}`;
  return `<div class="writing-progress"><strong>${label}</strong>
    <progress max="100" value="${p.percent}" aria-label="자소서 작성 완료율">${p.percent}%</progress>
    <p>전체 ${p.total}문항 · 완료 ${p.completed} · 작성중 ${p.writing} · 입력대기 ${p.pending}</p>
    ${p.invalid_completed ? '<p class="over">완료 상태지만 답변이 빈 문항이 있습니다. 답변을 입력하고 저장해주세요.</p>' : ''}
    ${onPage ? '<small>저장된 답변 기준입니다. 전체 작성 완료는 지원서 제출 완료와 다릅니다.</small>' : ''}
    ${onPage ? (p.next_id ? '<button type="button" class="button small" id="continue-writing">미완료 문항 이어쓰기 →</button>' : '') : `<a class="button small primary" href="${href}">${!p.total ? '문항 확인' : p.all_completed ? '답변 검토' : '이어쓰기 →'}</a>`}</div>`;
}
function watchProgress(container, generation) {
  stopProgressWatch();
  let alive = true, running = false;
  const queue = [];
  async function drain() {
    if (running) return;
    running = true;
    try {
      while (alive && generation === routeGeneration && queue.length) {
        const el = queue.shift(), cid = el.dataset.progress;
        try {
          const p = await api(`/api/candidates/${cid}/progress`);
          if (alive && generation === routeGeneration) el.innerHTML = progressHTML(p, cid);
        } catch (error) {
          if (alive && generation === routeGeneration) {
            el.innerHTML = `<p class="over">${esc(error.message)}</p><button class="button small" type="button">진행률 다시 확인</button>`;
            el.querySelector('button').addEventListener('click', e => {
              e.target.disabled = true; queue.push(el); drain();
            });
          }
        }
      }
    } finally { running = false; }
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      observer.unobserve(entry.target); queue.push(entry.target);
    }
    drain();
  });
  container.querySelectorAll('[data-progress]').forEach(el => observer.observe(el));
  stopProgressWatch = () => { alive = false; observer.disconnect(); queue.length = 0; };
}
function jobCard(c) {
  const s = c.snapshot || {}, validID = /^[0-9a-f-]{36}$/i.test(c.id), url = validID ? `#candidate/${c.id}` : '';
  return `<article class="job-card"><div class="card-top"><span class="company">${esc(c.company || '회사 미확인')}</span>${stateTag(c.status)}</div>
    <h2>${validID ? `<a href="${url}">${esc(c.title)}</a>` : esc(c.title)}</h2>
    <div class="job-meta"><span>${esc(s.location || '근무지 미확인')}</span><span>${esc(s.employment || '고용형태 미확인')}</span><span>기업 규모 ${esc(JobFilters.metadata(c).size)}</span></div>
    <div class="job-meta">마감 ${esc(s.deadline || '미확인')} · ${esc(c.capture_level || '확보수준 미확인')}</div>
    <div class="card-note">${esc(c.family || '직무 미분류')}${c.synthetic ? ' · 합성 테스트' : ''}</div>
    ${c.status === '승인' && validID ? `<div data-progress="${c.id}"><p class="muted">작성 진행률 확인 중…</p><a class="button small primary" href="#questions/${c.id}">자소서 작성 →</a></div>` : ''}
    <div class="card-bottom">${validID ? `<a class="button small" href="${url}">상세 보기</a>` : '<span class="over">후보ID 확인 필요</span>'}
      </div></article>`;
}
async function renderList(state, generation) {
  activeNav(state);
  const labels = {'검토대기':['공고 검토','다음 기회를 살펴보고, 진행할 공고를 선택하세요.'],
    '승인':['승인 공고','승인한 공고의 문항을 확인하고 답변 초안을 작성하세요.'],
    '보류':['보류 공고','추가 확인이 필요한 공고를 다시 살펴보세요.'],
    '제외':['제외 공고','제외한 공고도 기록으로 남아 있습니다.']};
  const [title, subtitle] = labels[state] || labels['검토대기'];
  const items = [], cursors = new Set(); let cursor = null;
  do {
    const data = await api('/api/candidates?status=' + encodeURIComponent(state) +
      (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    if (generation !== routeGeneration) return;
    items.push(...data.items); cursor = data.next_cursor;
    if (cursor && (cursors.has(cursor) || cursors.size >= 400)) throw new Error('공고 전체 조회를 완료하지 못했습니다. 잠시 후 다시 조회하세요.');
    if (cursor) cursors.add(cursor);
    main.innerHTML = `<div class="loading" role="status">전체 공고를 확인하고 있습니다… ${items.length}건 조회</div>`;
  } while (cursor);
  const preset = activePreset();
  main.innerHTML = `<div class="page-head"><div><div class="eyebrow">MY OPPORTUNITIES</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="page-tools"><a class="button small ghost" href="#settings">검색 설정</a><button class="button small ghost" id="refresh">새로고침</button></div></div>
    <div class="tabs" aria-label="상태별 공고">${config.states.map(s => `<a href="#list/${s}" class="${s === state ? 'active' : ''}" ${s === state ? 'aria-current="page"' : ''}>${s}</a>`).join('')}</div>
    <section class="filter-summary"><label for="active-preset">저장한 검색 조건</label><select id="active-preset">${filterState.presets.map(p => `<option value="${esc(p.id)}" ${p.id === preset.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select><a href="#settings">조건 편집</a><p>${esc(JobFilters.summarize(preset.filters))}</p></section>
    <div class="toolbar"><span class="count" id="list-count"></span><label for="search">포함 검색 <input id="search" type="search" placeholder="예: 전기보전, 변압기" value="${esc(quickSearch)}" autocomplete="off"></label></div>
    <p class="search-hint">쉼표로 단어를 구분합니다. 설정한 검색 범위에서 ${preset.filters.keywordMode === 'all' ? '모든 단어' : '하나 이상의 단어'}를 포함하는 공고를 찾습니다.</p>
    ${state === '검토대기' ? '<div class="notice">승인 전에는 점수·기업조사·자소서 초안을 생성하지 않습니다.</div>' : ''}
    <div id="cards" class="cards"></div>`;
  const draw = () => {
    quickSearch = document.getElementById('search').value;
    const filtered = JobFilters.filter(items, activePreset().filters, quickSearch);
    document.getElementById('cards').innerHTML = filtered.length ? filtered.map(jobCard).join('') : empty('조건에 맞는 공고가 없습니다', '검색어를 지우거나 검색 설정의 조건과 미확인 정보 포함 여부를 확인하세요.');
    document.getElementById('list-count').textContent = `전체 ${items.length}건 · 조건 일치 ${filtered.length}건`;
    watchProgress(document.getElementById('cards'), generation);
  };
  draw(); document.getElementById('search').addEventListener('input', draw);
  document.getElementById('refresh').addEventListener('click', renderRoute);
  document.getElementById('active-preset').addEventListener('change', e => {
    if (saveFilterState({...filterState, activeId:e.target.value})) { quickSearch = ''; renderRoute(); }
    else e.target.value = preset.id;
  });
}
async function renderCandidate(cid, generation) {
  const c = await api('/api/candidates/' + encodeURIComponent(cid));
  if (generation !== routeGeneration) return;
  activeNav(c.status);
  const s = c.snapshot || {}, url = safeURL(c.url);
  main.innerHTML = `<a class="back" href="#list/${esc(c.status || '검토대기')}">← 공고 목록</a>
    <div class="page-head"><div><div class="eyebrow">JOB CARD DETAIL</div><h1>${esc(c.title)}</h1><p class="subtitle">${esc(c.company || '회사 미확인')}${c.synthetic ? ' · 합성 테스트 공고' : ''}</p></div>${stateTag(c.status)}</div>
    <section class="panel"><div class="panel-heading"><h2>공고 정보</h2>${url ? `<a class="button small ghost" href="${esc(url)}" target="_blank" rel="noopener noreferrer">원문 열기 ↗</a>` : '<span class="muted">원문 URL 미확인</span>'}</div>
      <dl class="fields">${field('기업 규모',JobFilters.metadata(c).size)}${field('근무지',s.location)}${field('고용형태',s.employment)}${field('경력·필수요건',s.requirements)}${field('마감일',s.deadline)}${field('원문 확보',c.capture_level)}${field('수집판정',c.decision)}${field('수집 출처',s.source)}${field('기본직무',c.family)}${field('시스템상태',c.system_status)}</dl>
      <div class="text-block"><h3>담당업무</h3><p>${esc(s.duties || '미확인')}</p></div>
      <div class="text-block"><h3>수집 판정 근거</h3><p>${esc(c.reason || '미확인')}</p></div>
      <div class="notice">누락정보: ${esc(c.missing || '기록된 누락정보 없음')}</div></section>
    <section class="panel"><div class="panel-heading"><h2>내 검토 상태</h2>${stateTag(c.status)}</div>
      <p class="muted">승인은 이 공고의 자소서 작성을 허용합니다. 실제 지원·제출은 직접 진행합니다.</p>
      <div class="actions">${config.states.map(state => `<button class="button ${state === '승인' ? 'primary' : state === '제외' ? 'danger' : ''}" data-decision="${state}" ${c.status === state ? 'disabled' : ''}>${state === '승인' ? '승인' : state === '검토대기' ? '검토대기로 변경' : state}</button>`).join('')}
      ${c.status === '승인' ? `<a class="button primary push" href="#questions/${cid}">자소서 작성 →</a>` : ''}</div>
      <p id="decision-message" class="save-message" role="status"></p>
      <div class="notice info">${c.status === '승인' ? '현재 승인 상태입니다. 상태를 보류·제외·검토대기로 바꾸면 자소서 접근과 저장이 차단됩니다.' : '승인 후 자소서 문항 화면으로 이동할 수 있습니다.'}</div>
      <p class="muted">승인 상태 저장은 Jobs 승격·분석 완료를 의미하지 않습니다.</p></section>`;
  main.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', async () => {
    const message = document.getElementById('decision-message');
    main.querySelectorAll('[data-decision]').forEach(b => b.disabled = true);
    try {
      await api(`/api/candidates/${cid}/status`, 'PATCH', {status:button.dataset.decision, version:c.version});
      if (generation !== routeGeneration) return;
      notify('검토 상태를 저장했습니다.'); await renderRoute();
    } catch (error) {
      if (generation !== routeGeneration) return;
      message.textContent = error.message; message.classList.add('error');
      main.querySelectorAll('[data-decision]').forEach(b => b.disabled = b.dataset.decision === c.status);
    }
  }));
}
function questionHTML(q) {
  return `<article class="question" data-question="${esc(q.id)}"><div class="q-head"><div><div class="q-number">QUESTION ${esc(q.number ?? '—')}</div><h2>${esc(q.title || '문항')}</h2></div><span class="state saved-state">${esc(q.status || '입력대기')}</span></div>
    <p class="question-content">${esc(q.content || '문항내용이 비어 있습니다. Notion에서 문항을 등록하세요.')}</p>
    <form><fieldset class="method-row"><legend>작성방식</legend>${config.methods.map(m => `<label><input type="radio" name="method-${esc(q.id)}" value="${m}" ${(q.method || '직접 작성') === m ? 'checked' : ''}>${m === 'AI초안' ? 'AI 초안' : m}</label>`).join('')}</fieldset>
      <label class="form-label" for="answer-${esc(q.id)}">답변초안</label><textarea id="answer-${esc(q.id)}" placeholder="이 문항에 대한 나의 경험을 작성하세요." maxlength="20000">${esc(q.answer)}</textarea>
      <div class="answer-foot"><span class="char-count"></span><span>공백 포함 · ${q.limit == null ? '제한 미등록' : `최대 ${esc(q.limit)}자`}</span></div>
      <div class="actions"><label for="status-${esc(q.id)}">작성상태</label><select id="status-${esc(q.id)}">${config.writing_states.map(s => `<option value="${s}" ${(q.status || '입력대기') === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <button type="button" class="button generate" ${!config.ai_ready ? 'disabled' : ''}>AI 초안 생성</button><button type="submit" class="button primary push">답변 저장</button></div>
      <p class="save-message" role="status">저장된 답변을 불러왔습니다.</p>
      <p class="ai-note">${config.ai_ready ? '확인된 경력 근거로 초안을 생성합니다. 생성 결과는 작성중으로 저장되며, 직접 검토해야 합니다.' : 'AI 생성은 키·모델·확인된 경력 설정 후 사용할 수 있습니다. 직접 작성과 저장은 지금 가능합니다.'}</p></form></article>`;
}
async function renderQuestions(cid, generation, targetID) {
  const data = await api(`/api/candidates/${encodeURIComponent(cid)}/questions`);
  if (generation !== routeGeneration) return;
  activeNav('승인');
  main.innerHTML = `<a class="back" href="#candidate/${cid}">← 공고 상세</a>
    <div class="page-head"><div><div class="eyebrow">COVER LETTER DESK</div><h1>자기소개서 작성</h1><p class="subtitle">${esc(data.candidate.company)} · ${esc(data.candidate.title)}</p></div><span class="badge live">승인 공고</span></div>
    <div class="notice info">문항별 답변초안과 작성상태를 저장합니다. 화면을 닫기 전에 저장해주세요. 작성상태 ‘완료’는 지원서 제출을 의미하지 않습니다.</div>
    <section class="panel" id="writing-summary" aria-live="polite"></section>
    ${data.items.length ? data.items.map(questionHTML).join('') : empty('연결된 자소서 문항이 없습니다','Notion 자소서 문항 DB에 문항을 등록하고, 이 공고의 후보ID를 입력하세요.')}
    <div class="actions"><button class="button ghost" id="questions-refresh">문항 다시 불러오기</button><a class="button" href="#list/승인">승인 공고 목록</a></div>`;
  function focusQuestion(id) {
    const article = Array.from(main.querySelectorAll('[data-question]')).find(el => el.dataset.question === id);
    if (article) { article.scrollIntoView({block:'start'}); article.querySelector('textarea').focus({preventScroll:true}); }
  }
  function updateSummary() {
    const p = WritingProgress.summarize(data.items);
    document.getElementById('writing-summary').innerHTML = progressHTML(p, cid, true);
    document.getElementById('continue-writing')?.addEventListener('click', () => focusQuestion(p.next_id));
  }
  updateSummary();
  data.items.forEach(original => {
    let q = original;
    const article = main.querySelector(`[data-question="${q.id}"]`), form = article.querySelector('form');
    const answer = article.querySelector('textarea'), state = article.querySelector('select');
    const message = article.querySelector('.save-message');
    const selectedMethod = () => article.querySelector('input[type=radio]:checked')?.value;
    const updateCount = () => {
      const count = article.querySelector('.char-count'); count.textContent = `${charLength(answer.value).toLocaleString()}자`;
      count.classList.toggle('over', q.limit != null && charLength(answer.value) > q.limit);
    };
    const edited = () => {
      dirty.add(q.id); message.classList.remove('error'); message.textContent = '변경사항을 아직 저장하지 않았습니다.';
      if (answer.value.trim() && state.value === '입력대기') state.value = '작성중';
      updateCount();
    };
    form.addEventListener('input', edited); form.addEventListener('change', edited); updateCount();
    async function save(generate = false) {
      if (generate && answer.value.trim()) { message.textContent = '입력한 답변이 있습니다. AI가 자동으로 덮어쓰지 않습니다.'; message.classList.add('error'); return; }
      if (!generate && q.limit != null && charLength(answer.value) > q.limit) { message.textContent = '글자수제한을 초과했습니다.'; message.classList.add('error'); return; }
      form.querySelectorAll('button,input,select,textarea').forEach(e => e.disabled = true);
      message.classList.remove('error'); message.textContent = generate ? '확인된 경력으로 초안을 생성하고 있습니다…' : '답변을 저장하고 있습니다…';
      try {
        const next = await api(`/api/candidates/${cid}/questions/${q.id}${generate ? '/draft' : ''}`, generate ? 'POST' : 'PATCH',
          generate ? {version:q.version} : {version:q.version, answer:answer.value, method:selectedMethod(), status:state.value});
        if (generation !== routeGeneration) return;
        q = next; answer.value = q.answer; state.value = q.status;
        data.items[data.items.findIndex(item => item.id === q.id)] = q; updateSummary();
        form.querySelectorAll('input[type=radio]').forEach(e => e.checked = e.value === q.method);
        article.querySelector('.saved-state').textContent = q.status;
        dirty.delete(q.id); updateCount(); message.textContent = generate ? 'AI 초안을 저장했습니다. 내용을 검토해주세요.' : '답변초안과 작성상태를 저장했습니다.';
      } catch (error) {
        if (generation !== routeGeneration) return;
        message.textContent = error.message; message.classList.add('error');
        if (error.status === 403) message.textContent += ' 입력한 답변을 복사한 뒤 공고 상세에서 승인 상태를 확인하세요.';
      } finally {
        form.querySelectorAll('button,input,select,textarea').forEach(e => e.disabled = false);
        article.querySelector('.generate').disabled = !config.ai_ready;
      }
    }
    form.addEventListener('submit', e => { e.preventDefault(); save(); });
    article.querySelector('.generate').addEventListener('click', () => save(true));
  });
  document.getElementById('questions-refresh').addEventListener('click', () => {
    if (dirty.size && !window.confirm('저장하지 않은 답변이 있습니다. 변경사항을 버리고 다시 불러올까요?')) return;
    dirty.clear(); renderRoute();
  });
  if (targetID) focusQuestion(targetID);
}
async function renderRoute() {
  stopProgressWatch();
  const generation = ++routeGeneration; dirty.clear();
  main.innerHTML = '<div class="loading" role="status">공고와 문항을 불러오고 있습니다…</div>';
  try {
    const parts = decodeURIComponent((location.hash || '#list').slice(1)).split('/');
    if (parts[0] === 'list') await renderList(config.states.includes(parts[1]) ? parts[1] : '검토대기', generation);
    else if (parts[0] === 'settings' && parts.length === 1) renderSettings();
    else if (parts.length === 2 && /^[0-9a-f-]{36}$/i.test(parts[1]) && parts[0] === 'candidate') await renderCandidate(parts[1], generation);
    else if ((parts.length === 2 || parts.length === 3) && /^[0-9a-f-]{36}$/i.test(parts[1]) && parts[0] === 'questions' && (!parts[2] || /^[0-9a-f-]{36}$/i.test(parts[2]))) await renderQuestions(parts[1], generation, parts[2]);
    else throw new Error('화면 주소를 확인하세요.');
  } catch (error) {
    if (generation !== routeGeneration) return;
    main.innerHTML = `<div class="error-page"><div class="eyebrow">CHECK REQUIRED</div><h1>${error.status === 403 ? '승인 확인이 필요합니다' : '화면을 불러오지 못했습니다'}</h1><p>${esc(error.message)}</p><a class="button primary" href="#list/승인">승인 공고 목록</a><button class="button" id="retry">다시 시도</button></div>`;
    document.getElementById('retry').addEventListener('click', renderRoute);
  }
}
window.addEventListener('beforeunload', e => { if (dirty.size) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('hashchange', () => {
  if (dirty.size && !window.confirm('저장하지 않은 변경사항이 있습니다. 변경사항을 버리고 이동할까요?')) {
    history.replaceState(null, '', currentRoute); return;
  }
  currentRoute = location.hash; renderRoute();
});
document.getElementById('clock').textContent = new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'}).format(new Date());
api('/api/config').then(c => {
  config = c; const mode = document.getElementById('mode');
  mode.textContent = c.mode === 'demo' ? 'DEMO · 합성 데이터' : 'Notion 연결'; mode.classList.add(c.mode === 'demo' ? 'demo' : 'live');
  renderRoute();
}).catch(error => { main.textContent = error.message; });
