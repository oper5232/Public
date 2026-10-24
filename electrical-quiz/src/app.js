import {promptFigure,renderQuestionFigure} from './question-figures.js';
import {StudyStore} from './store.js';
import {uuid,attemptEvent,practicalAttempt,planImport,validateSession,reduceEvents} from './core.js';
import {practicalQuestion,practicalReference,practicalSource,questionYear,questionExams,sessionFormat} from './practical.js';
import {connectCloud} from './cloud.js';

'use strict';
const BANK=JSON.parse(document.getElementById('questionData').textContent);const MAP=new Map(BANK.map(q=>[q.id,q]));const KEY='electrical_construction_mcq_v1';
const $=(id)=>document.getElementById(id);const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// An installed PWA can briefly execute new JS against cached older markup.
if(!document.getElementById('studyFormat')){
 const section=document.createElement('div');section.className='panel mode-panel';
 section.innerHTML='<h2>학습 모드</h2><label for="studyFormat">문제 유형 선택</label><select id="studyFormat"><option value="mcq">객관식 · 4지선다</option><option value="practical">실기 · 단답 / 빈칸 채우기</option></select><p id="modeDescription" class="tiny"></p><div id="practicalFilter" class="hidden"><label for="practicalType">실기 출제 유형</label><select id="practicalType"><option value="all">단답 + 빈칸 모두</option><option value="short">단답형만</option><option value="blank">빈칸 채우기만</option></select></div>';
 $('home').prepend(section);
}
if(!$('practicalAnswer')){const panel=document.createElement('div');panel.id='practicalAnswer';panel.className='hidden';$('qOptions').after(panel);}
if(!$('qMode')){const badge=document.createElement('span');badge.id='qMode';badge.className='chip';$('qYear').after(badge);}
// Replace the previous quick-start controls when loading cached older markup.
if(!$('unseenOnly')){
 const label=document.createElement('label');label.className='cb';
 label.innerHTML='<input id="unseenOnly" type="checkbox" aria-describedby="unseenAvailable"> 미응시 문제만 출제';
 const previous=$('startUnseen10')?.closest('.action-subgroup');
 if(previous)previous.replaceWith(label);else $('start10').closest('.big-actions').before(label);
}
// Keep the result shortcuts usable when the HTML is from an older PWA cache.
if($('finishUnseen')&&!$('finishUnseen10')){
 const all=$('finishUnseen'),group=document.createElement('div');group.className='big-actions';group.setAttribute('role','group');group.setAttribute('aria-label','미응시 문제 새 시험');all.before(group);
 for(const [id,label] of [['finishUnseen10','미응시 10문제'],['finishUnseen20','미응시 20문제']]){const button=document.createElement('button');button.id=id;button.className=id==='finishUnseen10'?'btn primary':'btn';button.textContent=label;group.append(button);}
 all.textContent='미응시 전체';group.append(all);
}
const store=await new StudyStore(BANK).init().catch(e=>{document.getElementById('syncStatus').textContent='기록 저장소를 열 수 없습니다: '+e.message+' · 브라우저의 사이트 저장소 허용 여부와 여유 공간을 확인하세요.';document.getElementById('studySections').inert=true;throw e;});
let state={history:store.view.history,stars:store.view.stars,session:store.session};
let lastOwner=store.owner, cloud=null, answerBusy=false, identityBusy=false;
const save=()=>store.saveSession(state.session).catch(reportError);
function reportError(e){toast('저장 실패: '+e.message);$('syncStatus').textContent='저장 실패 · '+e.message;}
function refreshLedger(){
 state.history=reduceEvents(store.events,BANK,{format:selectedFormat()}).history;state.stars=store.view.stars;
 if(lastOwner!==store.owner){clearTimeout(draftTimer);draftDirty=false;state.session=store.session;lastOwner=store.owner;useFormat(sessionFormat(state.session));show('home');}
 if(state.session){for(const e of store.events)if(e.kind==='attempt'&&e.sessionId===state.session.id&&state.session.ids.includes(e.qid))state.session.answers[e.qid]=e.choice;}
 if(!$('home').classList.contains('hidden'))renderHome();
 if(!$('quiz').classList.contains('hidden'))renderQuiz();
 if(!$('results').classList.contains('hidden'))renderResults();
 $('resumeRemote').disabled=!store.view.latestSession;$('resumeRemote').textContent='최근 저장 시험 불러오기'+(store.view.latestSession?' · '+(sessionFormat(store.view.latestSession)==='practical'?'실기':'객관식'):'');
 $('mergeGuest').disabled=store.owner==='guest';
 $('clearHistory').disabled=store.owner!=='guest';
}
store.onchange=refreshLedger;
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(window._toastId);window._toastId=setTimeout(()=>$('toast').classList.remove('show'),2400)}
function show(page){const homeTools=$('homeTools')||document.querySelector('.account-panel');homeTools?.classList.toggle('hidden',page!=='home');['home','quiz','results'].forEach(id=>$(id).classList.toggle('hidden',id!==page));window.scrollTo({top:0,behavior:'instant'});if(page==='home')renderHome();if(page==='quiz')renderQuiz();if(page==='results')renderResults()}
function fisher(a){let x=[...a];for(let i=x.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function pool(){let y=$('yearSelect').value,t=$('topicSelect').value,k=$('practicalType').value;return BANK.filter(q=>(y==='all'||questionExams(q,selectedFormat()).includes(y))&&(t==='all'||q.category===t)&&(selectedFormat()!=='practical'||k==='all'||practicalQuestion(q).kind===k))}
function neverAttempted(q){return !(Number(state.history[q.id]?.attempts)>0)}
function renderHome(){const p=pool(),allUnseen=BANK.filter(neverAttempted).length,scopeUnseen=p.filter(neverAttempted).length;$('totalCount').textContent=BANK.length;if($('practicalSummary')){$('practicalSummary').textContent=`전체 ${BANK.length}문항 · 단답 ${BANK.filter(q=>practicalQuestion(q).kind==='short').length}개 / 빈칸 ${BANK.filter(q=>practicalQuestion(q).kind==='blank').length}개. 같은 내용을 묻는 여러 회차는 동일 ID와 기록을 공유합니다.`;}$('attemptedCount').textContent=BANK.length-allUnseen;$('unseenCount').textContent=allUnseen;let h=Object.values(state.history);$('overallAttempts').textContent=h.reduce((s,x)=>s+(Number(x.attempts)||0),0);$('weakCount').textContent=h.filter(x=>x.lastCorrect===false).length;$('available').textContent=`현재 필터: ${p.length}문항 · 10/20문제보다 적으면 가능한 문항만 출제됩니다.`;$('unseenAvailable').textContent=`현재 필터에서 한 번도 풀지 않은 문제: ${scopeUnseen}문항 (전체 ${allUnseen}문항)`;const eligible=$('unseenOnly').checked?scopeUnseen:p.length;['start10','start20','startAll'].forEach(id=>$(id).disabled=eligible===0);if($('unseenOnly').checked&&scopeUnseen===0)$('available').textContent='현재 필터의 미응시 문제가 없습니다. 체크를 해제하면 다시 풀 수 있습니다.';$('resume').style.display=state.session&&state.session.ids?.length?'inline-block':'none';renderDashboard()}
function initSelects(){let selected=$('yearSelect').value;let years=[...new Set(BANK.flatMap(q=>questionExams(q,selectedFormat())))].sort((a,b)=>b.localeCompare(a,'ko'));$('yearSelect').innerHTML='<option value="all">전체 회차</option>';for(let y of years){const o=document.createElement('option');o.value=y;o.textContent=y;$('yearSelect').appendChild(o)}$('yearSelect').value=years.includes(selected)?selected:'all';if($('topicSelect').options.length===1){let topics=[...new Set(BANK.map(q=>q.category))].sort((a,b)=>a.localeCompare(b,'ko'));for(let t of topics){const o=document.createElement('option');o.value=t;o.textContent=t;$('topicSelect').appendChild(o)}}}

async function startQuiz(type,n){await flushDraft();let p=pool();if(type==='missed')p=p.filter(q=>state.history[q.id]?.lastCorrect===false);if(type==='stars')p=p.filter(q=>state.stars.includes(q.id));if(type==='unseen')p=p.filter(neverAttempted);if(!p.length){toast(type==='missed'?'최근 오답 문항이 없습니다.':type==='stars'?'★ 표시한 문항이 없습니다.':type==='unseen'?'한 번도 풀지 않은 문제가 없습니다.':'해당 범위의 문항이 없습니다.');return}if(type==='missed'){const mode=$('reviewOrder').value;p.sort((a,b)=>mode==='accuracy'?(state.history[a.id].accuracy-state.history[b.id].accuracy):String(state.history[b.id].lastAt).localeCompare(String(state.history[a.id].lastAt)));}else if($('randomOrder').checked)p=fisher(p);if(n&&p.length>n)p=p.slice(0,n);let orders={};p.forEach(q=>orders[q.id]=fisher([0,1,2,3]));state.session={id:(selectedFormat()==='practical'?'practical_':'')+uuid(),format:selectedFormat(),drafts:{},revealed:{},ids:p.map(q=>q.id),orders,answers:{},pos:0,started:new Date().toISOString(),mode:type,examFilter:$('yearSelect').value};await store.checkpoint(state.session);show('quiz')}
function active(){return state.session&&state.session.ids?.length?state.session:null}
function displayYear(q,format){const chosen=active()?.examFilter||$('yearSelect').value;return questionExams(q,format).includes(chosen)?chosen:questionYear(q,format)}
function current(){let s=active();return s?MAP.get(s.ids[s.pos]):null}
const diagrams={
 delta:`<svg viewBox="0 0 560 195" role="img" aria-label="왼쪽 델타 결선 3대, 오른쪽 개방델타 결선 2대의 비교 개념도"><g stroke="#70b5f5" fill="none" stroke-width="6" stroke-linejoin="round"><path d="M140 20L65 165L215 165Z"/><path d="M420 20L345 165L495 165"/></g><path d="M345 165L495 165" stroke="#d5a86e" stroke-width="4" stroke-dasharray="8 7"/><g fill="#dfeaff" font-size="15" text-anchor="middle"><text x="140" y="187">Δ-Δ: 3대 (3S)</text><text x="420" y="187">V-V: 2대 (√3 S)</text></g><g fill="#a6def7" font-size="13"><text x="140" y="73" text-anchor="middle">전체 운전</text><text x="420" y="80" text-anchor="middle">1대 고장</text></g></svg>`,
 ups:`<svg viewBox="0 0 560 170" role="img" aria-label="UPS의 정류기, DC필터, 인버터, 부하 흐름 개념도"><defs><marker id="a1" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#78b7ff"/></marker></defs><g fill="#203b5d" stroke="#6a99c6" stroke-width="1.5"><rect x="15" y="25" width="100" height="52" rx="9"/><rect x="158" y="25" width="100" height="52" rx="9"/><rect x="302" y="25" width="100" height="52" rx="9"/><rect x="445" y="25" width="100" height="52" rx="9"/><rect x="175" y="110" width="100" height="38" rx="9"/></g><g fill="#eaf3ff" font-size="14" text-anchor="middle"><text x="65" y="56">정류기</text><text x="208" y="56">DC필터</text><text x="352" y="56">인버터</text><text x="495" y="56">AC 부하</text><text x="225" y="134">축전지</text></g><g stroke="#78b7ff" stroke-width="2.5" fill="none" marker-end="url(#a1)"><path d="M116 51H157"/><path d="M259 51H301"/><path d="M403 51H444"/><path d="M225 110V78"/></g></svg>`,
 bh:`<svg viewBox="0 0 550 220" role="img" aria-label="가로축 H와 세로축 B인 히스테리시스 곡선 개념도"><defs><marker id="a2" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7" fill="#c0d9fa"/></marker></defs><path d="M50 105H515M280 195V10" stroke="#aec7e5" stroke-width="2" marker-end="url(#a2)"/><path d="M100 155C115 196 260 193 360 125C450 53 464 17 405 22C355 27 250 71 196 89C96 118 75 129 100 155Z" stroke="#76bfff" stroke-width="4" fill="none"/><g fill="#d6e8fb" font-size="16"><text x="519" y="119">H</text><text x="292" y="15">B</text></g><text x="390" y="210" fill="#adc9e8" font-size="12">수평 H / 수직 B</text></svg>`,
 span:`<svg viewBox="0 0 560 155" role="img" aria-label="두 지지물 사이 경간의 수평거리 표시"><path d="M30 135H535" stroke="#657a95" stroke-width="2"/><path d="M85 25V135M475 25V135" stroke="#9fb6ce" stroke-width="12"/><path d="M90 40Q280 118 470 40" stroke="#6fb6fa" stroke-width="3" fill="none"/><path d="M90 15H470" stroke="#51d3a6" stroke-width="2"/><path d="M90 8V22M470 8V22" stroke="#51d3a6" stroke-width="2"/><text x="280" y="13" fill="#a6ffe0" font-size="13" text-anchor="middle">지지물 간 수평거리 = 경간</text><text x="90" y="151" fill="#c2d3e7" font-size="11" text-anchor="middle">지지물 A</text><text x="470" y="151" fill="#c2d3e7" font-size="11" text-anchor="middle">지지물 B</text></svg>`,
 spot:`<svg viewBox="0 0 540 185" role="img" aria-label="두 수전전원이 각각 네트워크 변압기를 거쳐 공동 부하에 공급하는 수전 개념도"><g fill="#1c3d5a" stroke="#83b6dd" stroke-width="1.5"><rect x="58" y="18" width="130" height="42" rx="8"/><rect x="350" y="18" width="130" height="42" rx="8"/><rect x="72" y="88" width="105" height="38" rx="7"/><rect x="364" y="88" width="105" height="38" rx="7"/><rect x="206" y="146" width="130" height="32" rx="7"/></g><g fill="#e4f2ff" text-anchor="middle" font-size="14"><text x="123" y="45">수전 전원 A</text><text x="415" y="45">수전 전원 B</text><text x="125" y="113">변압기 A</text><text x="416" y="113">변압기 B</text><text x="271" y="168">공통 부하</text></g><g stroke="#7ab5f4" fill="none" stroke-width="2.5"><path d="M123 61V87M415 61V87M125 127V138H270V146M416 127V138H270"/></g></svg>`,
 gpt:`<svg viewBox="0 0 540 175" role="img" aria-label="GPT 오픈델타의 CLR 저항 위치를 단순화한 개념도"><path d="M80 40L175 120L268 40" fill="none" stroke="#6fbaf7" stroke-width="5"/><path d="M268 40H340" stroke="#8baecf" stroke-width="3"/><path d="M340 40l7 7 -14 10 14 10 -14 10 14 10 -7 7" stroke="#f0ca86" fill="none" stroke-width="3"/><path d="M340 94H415V122" stroke="#89b9db" fill="none" stroke-width="3"/><path d="M395 122H435M401 129H429M408 136H422" stroke="#89b9db" stroke-width="2.5"/><g fill="#d9efff" font-size="15"><text x="95" y="28">GPT(오픈Δ)</text><text x="363" y="66">CLR</text><text x="390" y="158">접지</text></g></svg>`,
 spd:`<svg viewBox="0 0 520 165" role="img" aria-label="SPD가 전로에서 접지단자로 연결되는 형태의 개념도"><path d="M50 35H465" stroke="#79c6fc" stroke-width="5"/><path d="M260 35V63" stroke="#74a6e0" stroke-width="4"/><rect x="218" y="63" width="84" height="48" rx="7" fill="#23405d" stroke="#82b9f0" stroke-width="2"/><text x="260" y="93" text-anchor="middle" font-size="16" fill="#e8f4ff">SPD</text><path d="M260 111V137M240 137H280M247 143H273M253 149H267" stroke="#64d5a7" stroke-width="3"/><text x="305" y="139" fill="#b7f6df" font-size="12">접지·보호도체</text></svg>`,
 lps:`<svg viewBox="0 0 520 170" role="img" aria-label="건축물 외곽에 분산 배치된 피뢰 인하도선 개념도"><rect x="105" y="35" width="310" height="103" fill="#1b344e" stroke="#6e9dc8" stroke-width="2"/><path d="M85 35H435" stroke="#7bbbe6" stroke-width="4"/><g stroke="#5ddaab" stroke-width="4"><path d="M125 35V146M260 35V146M395 35V146"/></g><g fill="#d8f5ea" font-size="12" text-anchor="middle"><text x="125" y="163">인하도선</text><text x="260" y="163">인하도선</text><text x="395" y="163">인하도선</text></g><path d="M125 20H260M260 20H395" stroke="#f3d28e" stroke-width="2" stroke-dasharray="5 5"/></svg>`,
 relay:`<svg viewBox="0 0 520 165" role="img" aria-label="정한시 수평선과 반한시 감소곡선의 비교 개념도"><path d="M58 20V135H485" stroke="#a7c2db" stroke-width="2" fill="none"/><path d="M85 63H462" stroke="#e6bb79" stroke-width="3" stroke-dasharray="8 6"/><path d="M85 40C140 55 170 90 240 111S375 122 460 125" stroke="#71c5f7" stroke-width="4" fill="none"/><g fill="#e5f0ff" font-size="13"><text x="10" y="22">동작시간</text><text x="438" y="153">전류 →</text><text x="333" y="56" fill="#f2d399">정한시</text><text x="305" y="114" fill="#9bdcfe">반한시</text></g></svg>`,
 sa:`<svg viewBox="0 0 540 125" role="img" aria-label="차단기 다음의 서지흡수기와 보호대상기기를 나열한 개념도"><rect x="18" y="36" width="130" height="54" rx="7" fill="#233d5a" stroke="#81a6d4"/><rect x="205" y="36" width="115" height="54" rx="7" fill="#233d5a" stroke="#81a6d4"/><rect x="378" y="36" width="145" height="54" rx="7" fill="#233d5a" stroke="#81a6d4"/><path d="M149 63H204M321 63H377" stroke="#87c1f0" stroke-width="3"/><g fill="#e7f3fe" font-size="14" text-anchor="middle"><text x="83" y="68">차단기(CB)</text><text x="263" y="68">SA</text><text x="450" y="68">보호대상 기기</text></g></svg>`,
 leak:`<svg viewBox="0 0 540 165" role="img" aria-label="피뢰기 전압을 분압기로 측정하고 누설전류를 영상변류기로 측정하는 개념도"><rect x="218" y="33" width="110" height="60" rx="7" stroke="#89bcea" fill="#243c58" stroke-width="2"/><text x="273" y="68" fill="#fff" text-anchor="middle" font-size="16">피뢰기</text><path d="M273 12V33M273 93V145" stroke="#82bfed" stroke-width="4"/><circle cx="273" cy="113" r="17" stroke="#57d1aa" stroke-width="4" fill="none"/><path d="M150 12H273M150 12V80" stroke="#a3bde0" stroke-width="2"/><rect x="97" y="80" width="105" height="40" fill="#1c3e54" stroke="#82b9d4" rx="8"/><g fill="#e5f2ff" font-size="12" text-anchor="middle"><text x="150" y="105">용량성 분압기</text><text x="347" y="113">영상변류기(ZCT)</text></g><path d="M291 113H328" stroke="#52cea2" stroke-width="2"/></svg>`
,
 guy:`<svg viewBox="0 0 560 200" role="img" aria-label="전주 지지선, 지표면, 도로 횡단 높이의 개념도"><path d="M25 160H530" stroke="#c3d0df" stroke-width="3"/><path d="M180 20V160" stroke="#9bb7d0" stroke-width="13"/><path d="M182 35L475 161" stroke="#f0cb87" stroke-width="4"/><path d="M475 160V173" stroke="#b3d0d6" stroke-width="9"/><path d="M260 160V70M254 160H266M254 70H266" stroke="#70d4ad" stroke-width="2" stroke-dasharray="5 4"/><g fill="#e4f2fc" font-size="14"><text x="124" y="17">지지물</text><text x="330" y="64">지지선(연선)</text><text x="271" y="116" fill="#70d4ad">높이 기준은 도로 유형·조건에 따라 구분</text><text x="215" y="185">지표면</text></g></svg>`,
 duct:`<svg viewBox="0 0 560 164" role="img" aria-label="덕트 지지점 사이의 거리 개념도"><rect x="55" y="64" width="455" height="40" rx="4" fill="#244264" stroke="#7aa4d1" stroke-width="2"/><g stroke="#86b7e5" stroke-width="5"><path d="M110 55V110M465 55V110"/></g><path d="M110 32H465" stroke="#6bddb3" stroke-width="3"/><path d="M110 25V39M465 25V39" stroke="#6bddb3" stroke-width="2"/><text x="288" y="24" fill="#94eec9" font-size="16" text-anchor="middle">지지점 간 거리</text><g fill="#d6e8fa" font-size="13" text-anchor="middle"><text x="110" y="132">지지점</text><text x="465" y="132">지지점</text><text x="285" y="91">덕트</text></g></svg>`,
 insulator:`<svg viewBox="0 0 560 160" role="img" aria-label="현수애자와 연결 금구의 직렬 배열 개념도"><path d="M25 79H107M441 79H535" stroke="#9ac5ed" stroke-width="4"/><rect x="105" y="57" width="60" height="45" fill="#294969" stroke="#91b7d8" rx="7"/><g fill="#cfd7e2" stroke="#7ba6d3" stroke-width="2"><ellipse cx="200" cy="79" rx="19" ry="26"/><ellipse cx="237" cy="79" rx="19" ry="26"/><ellipse cx="274" cy="79" rx="19" ry="26"/><ellipse cx="311" cy="79" rx="19" ry="26"/></g><rect x="349" y="57" width="92" height="45" rx="7" fill="#365270" stroke="#91b7d8"/><g fill="#e3f0ff" font-size="12" text-anchor="middle"><text x="134" y="124">금구</text><text x="255" y="124">현수애자련</text><text x="395" y="124">인류클램프 등</text><text x="280" y="30">실제 부품 배치는 문제에 제시된 순서로 확인</text></g></svg>`,
 firestop:`<svg viewBox="0 0 560 176" role="img" aria-label="벽체 관통 배선과 내화 밀폐 구간 개념도"><rect x="242" y="16" width="85" height="138" fill="#455369"/><rect x="249" y="16" width="71" height="138" fill="#5b6b7d"/><path d="M35 75H525" stroke="#91c9ff" stroke-width="21"/><path d="M249 75H320" stroke="#ffd280" stroke-width="28"/><path d="M242 75H327" stroke="#263c56" stroke-width="17"/><path d="M245 40V110M324 40V110" stroke="#fdcc84" stroke-width="5" stroke-dasharray="6 4"/><g fill="#eef5ff" font-size="13"><text x="250" y="12">방화구획 벽체</text><text x="344" y="60">케이블 또는 전선관</text><text x="335" y="139" fill="#ffdda9">관통부 내화 밀폐</text></g></svg>`,
 capacitor:`<svg viewBox="0 0 560 168" role="img" aria-label="전력용 콘덴서의 과전압 계전기와 부족전압 계전기 차단기 개방 개념도"><path d="M28 45H170M210 45H350M390 45H530" stroke="#86bceb" stroke-width="3"/><rect x="171" y="27" width="40" height="35" rx="4" stroke="#a5c9e9" fill="#263d54"/><rect x="350" y="27" width="40" height="35" rx="4" stroke="#a5c9e9" fill="#263d54"/><text x="190" y="49" fill="#fff" font-size="14" text-anchor="middle">CB</text><path d="M456 45V82M440 82H472M440 92H472M456 92V128" stroke="#6bd5a6" stroke-width="3"/><path d="M440 128H472M446 134H466M451 140H461" stroke="#6bd5a6" stroke-width="2"/><g fill="#f3e5c9" font-size="13"><text x="68" y="29">전원</text><text x="148" y="91">59: 과전압</text><text x="148" y="110">27: 부족전압</text><text x="392" y="155">진상 콘덴서</text></g><path d="M175 68L160 83" stroke="#e9bc82" stroke-width="2"/></svg>`
};
function diagramHtml(id){if(promptFigure(id))return renderQuestionFigure(id);return diagrams[id]?`<figure class="diagram">${diagrams[id]}<figcaption>학습용 개념도 · 실제 기출 원본 도면이나 공식 KS 기호를 재현한 것은 아닙니다.</figcaption></figure>`:''}
function renderQuiz(){let s=active();if(!s){show('home');return}let q=current();if(!q){show('home');return}let ans=s.answers[q.id],used=ans!==undefined;let got=Object.keys(s.answers).length;$('qYear').textContent=displayYear(q,sessionFormat(s));$('qPosition').textContent=`${s.pos+1} / ${s.ids.length} · 응시 ${got}`;$('qProgress').style.width=(got/s.ids.length*100)+'%';$('qCategory').innerHTML=esc(q.category)+(q.caution&&!['reference-checked','source-photo-checked','source-notes-checked'].includes(q.verification.status)?'<span class="tagwarning">기준 확인</span>':'');let hist=state.history[q.id]||{};$('qAttempts').innerHTML=`<span class="attemptpill">누적 풀이 <strong class="counter">${Number(hist.attempts)||0}회</strong> · 정답 ${Number(hist.correct)||0}회 · 오답 ${Number(hist.wrong)||0}회 · 정답률 ${Math.round(hist.accuracy||0)}%${hist.repeatWrong?' · 반복 오답':''}</span>`;$('starButton').textContent=state.stars.includes(q.id)?'★ 저장됨':'☆ 저장';$('qText').textContent=sessionFormat(s)==='practical'?practicalQuestion(q).prompt:q.question;$('qMode').textContent=sessionFormat(s)==='practical'?'실기 · '+(practicalQuestion(q).kind==='blank'?'빈칸':'단답'):'객관식';$('qDiagram').innerHTML=sessionFormat(s)==='practical'&&!used&&!s.revealed?.[q.id]&&!promptFigure(q.diagram)?'':diagramHtml(q.diagram);const checked=q.verification.status==='reference-checked',teaching=q.verification.status==='teaching-reference-checked',photo=q.verification.status==='source-photo-checked',photoNotes=q.verification.status==='source-notes-checked';$('qVerification').textContent=(sessionFormat(s)==='practical'&&!checked&&!teaching&&!photo&&!photoNotes?'출처: 제공 학습노트 · 공식 기준 검증 전':`검증: ${checked?'공개 KEC 기준 대조':photo?'제공 문제·답안 사진 대조':photoNotes?'제공 그림·학습노트 대조':teaching?'공개 교재 해설 대조':q.verification.status==='user-corrected'?'사용자 정정 반영':q.verification.status==='needs-review'?'기준 확인 필요':'원자료 대조 전'}`)+(q.verification.notes.length&&(sessionFormat(s)!=='practical'||checked||teaching||photo||photoNotes)?' · '+q.verification.notes.join(' / '):'');const appearance=q.appearances?.find(a=>a.exam===displayYear(q,sessionFormat(s)));if(appearance?.note)$('qVerification').textContent+=' · '+appearance.note;let practical=sessionFormat(s)==='practical';$('qOptions').classList.toggle('hidden',practical);$('practicalAnswer').classList.toggle('hidden',!practical);if(practical)renderPractical(q,s);let order=s.orders[q.id]||[0,1,2,3];$('qOptions').innerHTML=practical?'':order.map((ix,i)=>{let selected=ans===ix;let cl=used?(ix===q.correct?' correct':selected?' wrong':''):'';return `<button type="button" class="option${cl}" data-index="${ix}" ${used?'disabled':''} aria-label="선택지 ${i+1}"><span class="num">${i+1}</span><span>${esc(q.options[ix])}</span></button>`}).join('');$('qOptions').querySelectorAll('button').forEach(b=>b.onclick=()=>answer(q.id,Number(b.dataset.index)));
$('qExplanation').innerHTML=used?`<div class="explain${ans!==q.correct?' err':''}"><strong>${ans===q.correct?'✓ 정답':'✕ 오답'} · 정답: ${esc(practical?practicalReference(q):q.options[q.correct])}</strong><p>${esc(q.explain)}</p>${q.caution&&!checked?'<p>※ 제공 자료의 조건·답안입니다. 현행 설계 기준 전체를 검증한 자료는 아닙니다.</p>':''}</div>`:'';$('qPrev').disabled=s.pos===0;$('qNext').textContent=s.pos===s.ids.length-1?'결과 보기 →':'다음 →';$('qHelp').textContent=practical?(used?'실기 판정이 저장됐습니다. 다시 열어도 중복 집계되지 않습니다.':'답안 작성 → 모범답안 확인 → 정답·오답 판정 순서로 진행하세요.'):(used?'선택은 저장됐습니다. 문항 이동 또는 결과 보기를 선택하세요.':'선택지를 누르면 즉시 채점과 해설이 표시됩니다.');renderGrid()}
async function answer(id,index){
 const session=active(),q=MAP.get(id);if(identityBusy||answerBusy||!session||!q||session.answers[id]!==undefined)return;
 answerBusy=true;
 try{const event=attemptEvent(session,q,index);state.session=await store.commitAnswer(session,event);renderQuiz();}
 catch(e){reportError(e);}finally{answerBusy=false;}
}
function renderGrid(){let s=active();$('qGrid').innerHTML=s.ids.map((id,i)=>{let a=s.answers[id],cl=a===undefined?'empty':a===MAP.get(id).correct?'done':'fail';return `<button type="button" class="${cl}${s.pos===i?' current':''}" data-pos="${i}" title="${i+1}번 ${a===undefined?'미응시':a===MAP.get(id).correct?'정답':'오답'}">${i+1}</button>`}).join('');$('qGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{navigateTo(Number(b.dataset.pos))})}
function resultsData(){let s=active();if(!s)return null;let correct=0,wrong=0,skip=0;for(let id of s.ids){let a=s.answers[id];if(a===undefined)skip++;else if(a===MAP.get(id).correct)correct++;else wrong++}return {correct,wrong,skip}}
function renderResults(){let s=active();if(!s){show('home');return}let r=resultsData();$('resultRate').textContent=Math.round(r.correct/s.ids.length*100)+'%';$('resultCorrect').textContent=r.correct;$('resultWrong').textContent=r.wrong;$('resultSkipped').textContent=r.skip;$('resultSub').textContent=`${sessionFormat(s)==='practical'?'실기 · 직접 판정':'객관식'} · 선택 범위 ${s.ids.length}문항 · 응시 ${r.correct+r.wrong}문항 · 정답률은 전체 출제 문항 기준`; $('finishMissed').disabled=r.wrong===0;$('finishContinue').disabled=r.skip===0;let unseen=pool().filter(neverAttempted).length;$('finishUnseenCount').textContent=`현재 필터에서 ${unseen}문항 미응시 · 선택한 수보다 적으면 남은 문항만 출제합니다.`;['finishUnseen10','finishUnseen20','finishUnseen'].forEach(id=>$(id).disabled=unseen===0);renderResultList()}
function renderResultList(){let s=active();let f=$('resultFilter').value;let arr=s.ids.map((id,i)=>({q:MAP.get(id),i,ans:s.answers[id]})).filter(x=>f==='all'||(f==='wrong'&&x.ans!==undefined&&x.ans!==x.q.correct)||(f==='skipped'&&x.ans===undefined)||(f==='correct'&&x.ans===x.q.correct));$('resultList').innerHTML=arr.length?arr.map(({q,i,ans})=>`<article class="resultrow"><div class="meta">${i+1}번 · ${esc(displayYear(q,sessionFormat(s)))} · ${esc(q.category)} · 누적 ${Number(state.history[q.id]?.attempts)||0}회 (정답 ${Number(state.history[q.id]?.correct)||0}회 / 오답 ${Number(state.history[q.id]?.wrong)||0}회)</div><p class="qline">${esc(sessionFormat(s)==='practical'?practicalQuestion(q).prompt:q.question)}</p><p class="${ans===undefined?'meta':ans===q.correct?'solution':'mywrong'}">내 답: ${sessionFormat(s)==='practical'?esc((s.drafts?.[q.id]||[]).join(' / ')||'(작성한 답안 없음)')+' · '+(ans===undefined?'미채점':ans===q.correct?'정답 판정':'오답 판정'):ans===undefined?'미응시':esc(q.options[ans])}</p><p class="solution">모범답안: ${esc(sessionFormat(s)==='practical'?practicalReference(q):q.options[q.correct])}</p><p>${esc(q.explain)}</p><button class="btn" style="min-height:33px;padding:4px 11px;font-size:12px" data-jump="${i}">문제로 이동</button></article>`).join(''):'<p class="sub">해당 문항이 없습니다.</p>';$('resultList').querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{navigateTo(Number(b.dataset.jump))})}
async function startSessionIds(ids){await flushDraft();if(!ids.length){toast('재시험 대상 문항이 없습니다.');return}let p=ids.map(id=>MAP.get(id)).filter(Boolean);p=fisher(p);let orders={};p.forEach(q=>orders[q.id]=fisher([0,1,2,3]));state.session={id:(selectedFormat()==='practical'?'practical_':'')+uuid(),format:selectedFormat(),drafts:{},revealed:{},ids:p.map(q=>q.id),orders,answers:{},pos:0,started:new Date().toISOString(),mode:'retry',examFilter:$('yearSelect').value};await store.checkpoint(state.session);show('quiz')}
function downloadJSON(obj,name){const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function backupJSON(){downloadJSON(store.export(),'전기공사기사_학습기록_v3.json');toast('JSON 백업을 저장했습니다.');}
async function previewImport(raw){
 const plan=await planImport(raw,BANK,store.events);const owner=store.owner;
 $('importPreview').classList.remove('hidden');
 $('previewText').textContent=`문항 ${plan.questions}개 · 새 이벤트 ${plan.events.length}개 · 중복 제외 ${plan.duplicates}개 · 누적 풀이 ${plan.before} → ${plan.after}회 · 미등록 ID ${plan.unknown.length}개${plan.unknown.length?' ('+plan.unknown.join(', ')+')':''}${plan.legacy?'\n이전 기록은 문항별 누적 정답·오답의 최댓값을 보존하고 이후 앱에서 푼 이벤트에 더합니다. 클라우드에서 이미 푼 횟수를 포함한 구버전 백업은 중복을 자동 판별할 수 없으므로 증가량을 확인하세요. 이후에는 v3 백업을 사용하세요.':''}`;
 $('confirmImport').disabled=plan.events.length===0;
 return new Promise(resolve=>{
  $('cancelImport').onclick=()=>{$('importPreview').classList.add('hidden');resolve(false);};
  $('confirmImport').onclick=async()=>{
   if(owner!==store.owner){toast('계정이 변경됐습니다. 다시 가져오세요.');$('importPreview').classList.add('hidden');resolve(false);return;}
   $('confirmImport').disabled=true;
   try{downloadJSON(store.export(),'가져오기전_학습기록_백업.json');await store.add(plan.events);$('importPreview').classList.add('hidden');show('home');toast('기존 기록을 보존하고 가져왔습니다.');resolve(true);}
   catch(e){reportError(e);$('confirmImport').disabled=false;}
  };
 });
}
async function restoreJSON(file){if(!file)return;try{if(file.size>25000000)throw Error('25MB 이하 JSON을 선택하세요.');await previewImport(JSON.parse(await file.text()));}catch(e){toast('기록 가져오기 실패: '+e.message);}finally{$('importFile').value='';}}
function csvExport(){let rows=[['ID','회차','영역','문제','모드','누적풀이','누적정답','누적오답','최근정답','즐겨찾기']];for(let q of BANK){let h=state.history[q.id]||{};rows.push([q.id,questionExams(q,selectedFormat()).join(' / '),q.category,selectedFormat()==='practical'?practicalQuestion(q).prompt:q.question,selectedFormat()==='practical'?'실기':'객관식',h.attempts||0,h.correct||0,h.wrong||0,h.lastCorrect===undefined?'미응시':h.lastCorrect?'정답':'오답',state.stars.includes(q.id)?'Y':'N'])}let content='\uFEFF'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\r\n');let url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));let a=document.createElement('a');a.href=url;a.download='전기공사기사_학습기록.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('CSV 파일을 저장했습니다.')}
$('topHome').onclick=homeFromQuiz;$('topReview').onclick=async()=>{await flushDraft();show('home');startQuiz('missed')};$('yearSelect').onchange=renderHome;$('topicSelect').onchange=renderHome;$('start10').onclick=()=>startQuiz($('unseenOnly').checked?'unseen':'normal',10);$('start20').onclick=()=>startQuiz($('unseenOnly').checked?'unseen':'normal',20);$('startAll').onclick=()=>startQuiz($('unseenOnly').checked?'unseen':'normal');$('unseenOnly').onchange=renderHome;$('startMissed').onclick=()=>startQuiz('missed');$('startStars').onclick=()=>startQuiz('stars');$('resume').onclick=()=>{useFormat(sessionFormat(active()));show('quiz')};$('starButton').onclick=async()=>{let id=current()?.id;if(!id||identityBusy)return;try{await store.add([{id:'star_'+uuid(),kind:'star',qid:id,value:!state.stars.includes(id),at:new Date().toISOString()}]);renderQuiz();}catch(e){reportError(e)}};$('qPrev').onclick=()=>{let s=active();if(s.pos>0)navigateTo(s.pos-1)};$('qNext').onclick=()=>{let s=active();navigateTo(Math.min(s.pos+1,s.ids.length-1),s.pos===s.ids.length-1?'results':'quiz')};$('goResult').onclick=()=>navigateTo(active().pos,'results');$('resultFilter').onchange=renderResultList;$('finishMissed').onclick=()=>{let s=active();startSessionIds(s.ids.filter(id=>s.answers[id]!==undefined&&s.answers[id]!==MAP.get(id).correct))};$('finishContinue').onclick=async()=>{let s=active(),idx=s.ids.findIndex(id=>s.answers[id]===undefined);if(idx>=0){s.pos=idx;await store.checkpoint(state.session);show('quiz')}};$('finishUnseen10').onclick=()=>startQuiz('unseen',10);$('finishUnseen20').onclick=()=>startQuiz('unseen',20);$('finishUnseen').onclick=()=>startQuiz('unseen');$('finishHome').onclick=homeFromQuiz;$('exportHistory').onclick=csvExport;$('exportJSON').onclick=backupJSON;$('importJSON').onclick=()=>$('importFile').click();$('importFile').onchange=e=>restoreJSON(e.target.files?.[0]);$('clearHistory').onclick=async()=>{if(store.owner!=='guest')return;if(confirm('먼저 JSON 백업을 내려받은 뒤 이 기기의 게스트 기록을 비우시겠습니까? 기존 HTML 저장소는 유지됩니다.')){backupJSON();try{await store.resetGuest();state.session=null;renderHome();toast('게스트 기록을 초기화했습니다.');}catch(e){reportError(e)}}};window.addEventListener('keydown',(e)=>{if($('quiz').classList.contains('hidden')||e.altKey||e.ctrlKey||e.metaKey||['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName))return;let s=active(),q=current();if(!s||!q)return;if(sessionFormat(s)==='mcq'&&/[1-4]/.test(e.key)&&e.key.length===1&&s.answers[q.id]===undefined){let n=Number(e.key)-1;answer(q.id,s.orders[q.id][n])}else if(e.key==='ArrowRight')$('qNext').click();else if(e.key==='ArrowLeft')$('qPrev').click()});
function selectedFormat(){return $('studyFormat').value}
function useFormat(format){$('studyFormat').value=format;initSelects();state.history=reduceEvents(store.events,BANK,{format}).history;$('practicalFilter').classList.toggle('hidden',format!=='practical');$('modeDescription').textContent=format==='practical'?'답을 직접 작성하고 모범답안과 비교해 정답·오답을 기록합니다. 실기 기록은 객관식과 구분됩니다.':'선택지를 눌러 즉시 채점합니다. 기존 객관식 기록을 그대로 사용합니다.';}
let draftTimer=null,draftWrite=Promise.resolve(),draftDirty=false;
function queueDraft(id,index,value){
 const s=active();if(!s||sessionFormat(s)!=='practical'||s.revealed?.[id]||s.answers[id]!==undefined)return;
 const parts=[...(s.drafts?.[id]||practicalQuestion(MAP.get(id)).fields.map(()=>''))];parts[index]=value;
 s.drafts={...s.drafts,[id]:parts};draftDirty=true;
 const snapshot=structuredClone(s),owner=store.owner;
 draftWrite=draftWrite.catch(()=>{}).then(()=>{if(store.owner===owner)return store.saveSession(snapshot)}).catch(reportError);
 clearTimeout(draftTimer);draftTimer=setTimeout(()=>flushDraft().catch(reportError),2500);
 const status=$('draftStatus');if(status)status.textContent='입력 중 · 이 기기에 자동 저장';
}
async function flushDraft(){
 clearTimeout(draftTimer);await draftWrite;
 if(!draftDirty||!active())return;
 const s=structuredClone(active());draftDirty=false;
 try{await store.checkpoint(s);if($('draftStatus'))$('draftStatus').textContent='답안 저장됨 · 온라인일 때 자동 동기화';}
 catch(e){draftDirty=true;throw e;}
}
async function practicalReveal(){
 if(answerBusy||identityBusy)return;const s=active(),q=current();if(!s||s.answers[q.id]!==undefined)return;
 answerBusy=true;
 try{await flushDraft();s.revealed={...s.revealed,[q.id]:true};await store.checkpoint(s);renderQuiz();}
 catch(e){reportError(e)}finally{answerBusy=false}
}
async function practicalGrade(correct){
 const s=active(),q=current();if(answerBusy||identityBusy||!s||s.answers[q.id]!==undefined)return;
 answerBusy=true;
 try{await flushDraft();const event=practicalAttempt(s,q,correct);if(event)state.session=await store.commitAnswer(s,event);renderQuiz();}
 catch(e){reportError(e)}finally{answerBusy=false}
}
function renderPractical(q,s){
 const panel=$('practicalAnswer'),p=practicalQuestion(q),used=s.answers[q.id]!==undefined,revealed=used||!!s.revealed?.[q.id];
 const key=`${s.id}:${q.id}:${revealed}:${used}`;
 if(panel.dataset.view===key)return;panel.dataset.view=key;
 const drafts=s.drafts?.[q.id]||[];
 panel.innerHTML=`<p class="tiny">제공 노트 기반 · ${p.kind==='blank'?'빈칸 채우기':'단답형'} · 모범답안 확인 후 직접 판정</p>${p.notes?.length?'<p class="tiny">'+p.notes.map(esc).join('<br>')+'</p>': ''}<div class="written-fields">${p.fields.map((f,i)=>`<div class="written-field"><label for="written-${i}">${esc(f.label)}</label>${p.kind==='blank'?`<input id="written-${i}" data-part="${i}" type="text" maxlength="2000" autocomplete="off" spellcheck="false" placeholder="빈칸에 들어갈 답" value="${esc(drafts[i]||'')}" ${revealed?'readonly':''}>`:`<textarea id="written-${i}" data-part="${i}" maxlength="2000" rows="5" autocomplete="off" spellcheck="false" placeholder="기억나는 답을 직접 작성하세요." ${revealed?'readonly':''}>${esc(drafts[i]||'')}</textarea>`}</div>`).join('')}</div><p id="draftStatus" class="tiny" role="status">${revealed?'모범답안 확인 후에는 작성 답안을 변경할 수 없습니다.':'입력한 답안은 자동 저장됩니다. 정오답 판정 전에는 미응시로 유지됩니다.'}</p>${!revealed?'<button id="revealWritten" class="btn primary">모범답안 확인</button>':`<div class="written-reference"><h3>모범답안</h3>${p.fields.map(f=>`<p><strong>${esc(f.label)}</strong><br>${esc(f.answer)}</p>`).join('')}<p>${esc(q.explain)}</p><details><summary>제공 노트 발췌 보기</summary><p>${esc(practicalSource(q))}</p></details></div>${!used?'<p class="tiny">표현이 달라도 핵심 내용·수치·단위가 맞는지 비교한 뒤 판정하세요. 모르는 문제는 오답으로 기록해 복습할 수 있습니다.</p><div class="self-grade"><button id="writtenCorrect" class="btn primary">맞았어요 · 정답 기록</button><button id="writtenWrong" class="btn">틀렸어요 · 오답 기록</button></div>':''}`}`;
 panel.querySelectorAll('[data-part]').forEach(input=>input.oninput=()=>queueDraft(q.id,Number(input.dataset.part),input.value));
 if($('revealWritten'))$('revealWritten').onclick=practicalReveal;
 if($('writtenCorrect'))$('writtenCorrect').onclick=()=>practicalGrade(true);
 if($('writtenWrong'))$('writtenWrong').onclick=()=>practicalGrade(false);
}
async function navigateTo(pos,page='quiz'){try{await flushDraft();let s=active();if(!s)return;s.pos=pos;await store.saveSession(s);show(page);}catch(e){reportError(e)}}
async function homeFromQuiz(){try{await flushDraft();show('home')}catch(e){reportError(e)}}

$('studyFormat').onchange=()=>{useFormat(selectedFormat());renderHome()};$('practicalType').onchange=renderHome;
initSelects();useFormat(sessionFormat(state.session));renderHome();
window.addEventListener('pagehide',()=>{flushDraft().catch(reportError)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushDraft().catch(reportError)});
$('loginGoogle').onclick=()=>cloud?.login();$('loginRedirect').onclick=()=>cloud?.login(true);$('logoutGoogle').onclick=()=>cloud?.logout();$('retrySync').onclick=()=>cloud?.retry();
$('resumeRemote').onclick=async()=>{try{await flushDraft();const session=structuredClone(store.view.latestSession);validateSession(session,new Set(BANK.map(q=>q.id)));state.session=session;useFormat(sessionFormat(session));await store.saveSession(session);refreshLedger();show('quiz');}catch(e){reportError(e)}};
$('mergeGuest').onclick=async()=>{if(store.owner==='guest')return;try{await previewImport({format:'electrical-construction-quiz-events',version:3,events:await store.guestEvents()});}catch(e){reportError(e)}};
$('themeButton').onclick=()=>{const theme=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=theme;try{localStorage.setItem('study-theme',theme);}catch{}};
let savedTheme=null;try{savedTheme=localStorage.getItem('study-theme');}catch{}
const theme=savedTheme||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=theme;
window.addEventListener('unhandledrejection',e=>{e.preventDefault();reportError(e.reason||Error('알 수 없는 오류'));});
if(store.legacyError)toast(store.legacyError);
try{cloud=await connectCloud(store,{
 status:text=>{$('syncStatus').textContent=text;},
 configured:enabled=>{$('loginGoogle').disabled=!enabled;$('loginRedirect').disabled=!enabled;},
 user:user=>{$('accountName').textContent=user?user.displayName||user.email:'게스트 · 이 기기';$('loginGoogle').classList.toggle('hidden',!!user);$('loginRedirect').classList.toggle('hidden',!!user);$('logoutGoogle').classList.toggle('hidden',!user);refreshLedger();},
 busy:value=>{identityBusy=value;$('studySections').inert=value;}
});}catch(e){$('syncStatus').textContent='인증 초기화 실패 · '+e.message;}
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
  const button=$('updateApp');
  const ready=()=>{if(reg.waiting)button.classList.remove('hidden');};
  const watch=worker=>worker?.addEventListener('statechange',()=>setTimeout(ready,0));
  ready();watch(reg.installing);reg.addEventListener('updatefound',()=>watch(reg.installing));
  button.onclick=async()=>{
   if(button.disabled)return;
   button.disabled=true;button.textContent='새 버전 적용 중…';
   try{
    await flushDraft();await store.saveSession(state.session);
    if(!reg.waiting){
     await reg.update();
     const worker=reg.installing;
     if(worker&&worker.state!=='installed')await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{worker.removeEventListener('statechange',changed);reject(Error('업데이트 준비 시간이 초과됐습니다. 연결을 확인하고 다시 시도하세요.'));},30000);
      function changed(){if(worker.state==='installed'){clearTimeout(timer);worker.removeEventListener('statechange',changed);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);worker.removeEventListener('statechange',changed);reject(Error('새 버전 설치가 중단됐습니다. 다시 시도하세요.'));}}
      worker.addEventListener('statechange',changed);changed();
     });
    }
    window.__applyAppUpdate=true;
    if(reg.waiting)reg.waiting.postMessage('ACTIVATE_UPDATE');
    else location.reload();
   }catch(e){window.__applyAppUpdate=false;button.disabled=false;button.textContent='새 버전 적용';toast('업데이트 실패: '+e.message);}
  };
 }).catch(e=>{$('installHelp').textContent='오프라인 캐시 설정 실패: '+e.message;});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(window.__applyAppUpdate&&!window.__appReloading){window.__appReloading=true;location.reload();}});
}
let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installApp').classList.remove('hidden');});
$('installApp').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('installApp').classList.add('hidden');}};
refreshLedger();


function renderDashboard(){
 const histories=Object.values(state.history);const total=histories.reduce((n,h)=>n+h.attempts,0),correct=histories.reduce((n,h)=>n+h.correct,0);
 $('overallRate').textContent=total?Math.round(correct/total*100)+'%':'—';
 const last=histories.map(h=>h.lastAt).filter(Boolean).sort().at(-1);$('lastStudy').textContent=last?new Date(last).toLocaleString('ko-KR'):'아직 학습 기록이 없습니다.';
 const chart=(keys,get,label)=>keys.map(key=>{const qs=BANK.filter(q=>{const values=get(q);return Array.isArray(values)?values.includes(key):values===key}),hs=qs.map(q=>state.history[q.id]).filter(Boolean),attempts=hs.reduce((n,h)=>n+h.attempts,0),done=hs.filter(h=>h.attempts>0).length,correct=hs.reduce((n,h)=>n+h.correct,0),value=label==='progress'?done/qs.length*100:attempts?correct/attempts*100:0;
 return `<div class="chart-row"><div class="row between"><span>${esc(key)}</span><span>${label==='progress'?done+'/'+qs.length:attempts?Math.round(value)+'% · '+attempts+'회':'미응시'}</span></div><meter min="0" max="100" value="${value}" aria-label="${esc(key)} ${label==='progress'?'진행률':'정답률'}">${Math.round(value)}%</meter></div>`;}).join('');
 $('yearProgress').innerHTML=chart([...new Set(BANK.flatMap(q=>questionExams(q,selectedFormat())))],q=>questionExams(q,selectedFormat()),'progress');
 $('categoryRates').innerHTML=chart([...new Set(BANK.map(q=>q.category))],q=>q.category,'accuracy');
}
