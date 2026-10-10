'use strict';
const main = document.getElementById('main');
let config, routeGeneration = 0, currentRoute = location.hash || '#list', toastTimer;
const dirty = new Set();
const charLength = value => Array.from(value).length;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field = (label, value) => `<div class="field"><dt>${esc(label)}</dt><dd>${esc(value || '미확인')}</dd></div>`;
const stateClass = s => ({'승인':'approved','제외':'excluded','보류':'held'}[s] || '');
const stateTag = s => `<span class="state ${stateClass(s)}">${esc(s || '미확인')}</span>`;
const empty = (title, text) => `<div class="empty"><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;
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
function jobCard(c) {
  const s = c.snapshot || {}, validID = /^[0-9a-f-]{36}$/i.test(c.id), url = validID ? `#candidate/${c.id}` : '';
  return `<article class="job-card"><div class="card-top"><span class="company">${esc(c.company || '회사 미확인')}</span>${stateTag(c.status)}</div>
    <h2>${validID ? `<a href="${url}">${esc(c.title)}</a>` : esc(c.title)}</h2>
    <div class="job-meta"><span>${esc(s.location || '근무지 미확인')}</span><span>${esc(s.employment || '고용형태 미확인')}</span></div>
    <div class="job-meta">마감 ${esc(s.deadline || '미확인')} · ${esc(c.capture_level || '확보수준 미확인')}</div>
    <div class="card-note">${esc(c.family || '직무 미분류')}${c.synthetic ? ' · 합성 테스트' : ''}</div>
    <div class="card-bottom">${validID ? `<a class="button small" href="${url}">상세 보기</a>` : '<span class="over">후보ID 확인 필요</span>'}
      ${c.status === '승인' && validID ? `<a class="button small primary" href="#questions/${c.id}">자소서 작성 →</a>` : ''}</div></article>`;
}
async function renderList(state, generation) {
  activeNav(state);
  const labels = {'검토대기':['공고 검토','다음 기회를 살펴보고, 진행할 공고를 선택하세요.'],
    '승인':['승인 공고','승인한 공고의 문항을 확인하고 답변 초안을 작성하세요.'],
    '보류':['보류 공고','추가 확인이 필요한 공고를 다시 살펴보세요.'],
    '제외':['제외 공고','제외한 공고도 기록으로 남아 있습니다.']};
  const [title, subtitle] = labels[state] || labels['검토대기'];
  const data = await api('/api/candidates?status=' + encodeURIComponent(state));
  if (generation !== routeGeneration) return;
  let items = data.items, cursor = data.next_cursor;
  main.innerHTML = `<div class="page-head"><div><div class="eyebrow">MY OPPORTUNITIES</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><button class="button small ghost" id="refresh">새로고침</button></div>
    <div class="tabs" aria-label="상태별 공고">${config.states.map(s => `<a href="#list/${s}" class="${s === state ? 'active' : ''}" ${s === state ? 'aria-current="page"' : ''}>${s}</a>`).join('')}</div>
    <div class="toolbar"><span class="count" id="list-count"></span><label for="search">공고 찾기 <input id="search" type="search" placeholder="회사 또는 공고명" autocomplete="off"></label></div>
    ${state === '검토대기' ? '<div class="notice">승인 전에는 점수·기업조사·자소서 초안을 생성하지 않습니다.</div>' : ''}
    <div id="cards" class="cards"></div><button id="more" class="button load-more">더 불러오기</button>`;
  const draw = () => {
    const term = document.getElementById('search').value.toLowerCase().trim();
    const filtered = items.filter(c => `${c.company} ${c.title}`.toLowerCase().includes(term));
    document.getElementById('cards').innerHTML = filtered.length ? filtered.map(jobCard).join('') : empty('표시할 공고가 없습니다', term ? '검색어를 바꾸거나 다음 페이지를 불러오세요.' : '이 상태의 공고가 아직 없습니다.');
    document.getElementById('list-count').textContent = `불러온 ${items.length}건 · 표시 ${filtered.length}건`;
    document.getElementById('more').hidden = !cursor;
  };
  draw(); document.getElementById('search').addEventListener('input', draw);
  document.getElementById('refresh').addEventListener('click', renderRoute);
  document.getElementById('more').addEventListener('click', async e => {
    const button = e.currentTarget; button.disabled = true;
    try {
      const next = await api(`/api/candidates?status=${encodeURIComponent(state)}&cursor=${encodeURIComponent(cursor)}`);
      if (generation !== routeGeneration) return;
      items.push(...next.items); cursor = next.next_cursor; draw();
    } catch (error) { notify(error.message); }
    finally { button.disabled = false; }
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
      <dl class="fields">${field('근무지',s.location)}${field('고용형태',s.employment)}${field('경력·필수요건',s.requirements)}${field('마감일',s.deadline)}${field('원문 확보',c.capture_level)}${field('수집판정',c.decision)}${field('수집 출처',s.source)}${field('기본직무',c.family)}${field('시스템상태',c.system_status)}</dl>
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
async function renderQuestions(cid, generation) {
  const data = await api(`/api/candidates/${encodeURIComponent(cid)}/questions`);
  if (generation !== routeGeneration) return;
  activeNav('승인');
  main.innerHTML = `<a class="back" href="#candidate/${cid}">← 공고 상세</a>
    <div class="page-head"><div><div class="eyebrow">COVER LETTER DESK</div><h1>자기소개서 작성</h1><p class="subtitle">${esc(data.candidate.company)} · ${esc(data.candidate.title)}</p></div><span class="badge live">승인 공고</span></div>
    <div class="notice info">문항별 답변초안과 작성상태를 저장합니다. 화면을 닫기 전에 저장해주세요. 작성상태 ‘완료’는 지원서 제출을 의미하지 않습니다.</div>
    ${data.items.length ? data.items.map(questionHTML).join('') : empty('연결된 자소서 문항이 없습니다','Notion 자소서 문항 DB에 문항을 등록하고, 이 공고의 후보ID를 입력하세요.')}
    <div class="actions"><button class="button ghost" id="questions-refresh">문항 다시 불러오기</button><a class="button" href="#list/승인">승인 공고 목록</a></div>`;
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
}
async function renderRoute() {
  const generation = ++routeGeneration; dirty.clear();
  main.innerHTML = '<div class="loading" role="status">공고와 문항을 불러오고 있습니다…</div>';
  try {
    const parts = decodeURIComponent((location.hash || '#list').slice(1)).split('/');
    if (parts[0] === 'list') await renderList(config.states.includes(parts[1]) ? parts[1] : '검토대기', generation);
    else if (parts.length === 2 && /^[0-9a-f-]{36}$/i.test(parts[1]) && parts[0] === 'candidate') await renderCandidate(parts[1], generation);
    else if (parts.length === 2 && /^[0-9a-f-]{36}$/i.test(parts[1]) && parts[0] === 'questions') await renderQuestions(parts[1], generation);
    else throw new Error('화면 주소를 확인하세요.');
  } catch (error) {
    if (generation !== routeGeneration) return;
    main.innerHTML = `<div class="error-page"><div class="eyebrow">CHECK REQUIRED</div><h1>${error.status === 403 ? '승인 확인이 필요합니다' : '화면을 불러오지 못했습니다'}</h1><p>${esc(error.message)}</p><a class="button primary" href="#list/승인">승인 공고 목록</a><button class="button" id="retry">다시 시도</button></div>`;
    document.getElementById('retry').addEventListener('click', renderRoute);
  }
}
window.addEventListener('beforeunload', e => { if (dirty.size) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('hashchange', () => {
  if (dirty.size && !window.confirm('저장하지 않은 답변이 있습니다. 변경사항을 버리고 이동할까요?')) {
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
