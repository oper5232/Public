import data from './book4-data.json';
import {book4Figures} from './book4-figures.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function book4PromptHtml(id){
 const item=data[id];if(!item?.tables?.length)return '';
 return `<section class="source-tables" aria-label="문제에 주어진 표">${item.tables.map(t=>`<div class="source-table-scroll" tabindex="0" role="region" aria-label="${esc(t.title)}"><table><caption>${esc(t.title)}</caption><thead><tr>${t.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}</section>`;
}
export function book4AnswerHtml(id){
 const item=data[id];if(!item)return '';
 const fig=book4Figures[item.answerFigure];
 return (item.referenceText?`<p class="book4-reference">${esc(item.referenceText)}</p>`:'')+(fig?`<section class="book4-answer" aria-label="모범 회로"><h3>모범 회로</h3><figure class="diagram source-figure" data-figure="${item.answerFigure}">${fig.svg}<figcaption>${esc(fig.caption)}</figcaption></figure></section>`:'');
}
// All figures are static, locally bundled SVGs. Zooming never loads an external
// image or an unrevealed answer, and never modifies the study session.
export function installFigureZoom(){
 if(document.getElementById('figureViewer'))return;
 const modal=document.createElement('dialog');modal.id='figureViewer';modal.setAttribute('aria-label','도면 확대');
 modal.innerHTML='<div class="figure-toolbar"><button type="button" data-zoom-step="-1" aria-label="도면 축소">−</button><output id="figureZoomValue" aria-live="polite">100%</output><button type="button" data-zoom-step="1" aria-label="도면 확대">＋</button><button type="button" data-figure-close>닫기</button></div><p class="tiny">확대한 도면은 가로·세로로 스크롤하여 볼 수 있습니다.</p><div class="figure-viewport" tabindex="0"><div class="figure-canvas"></div></div>';
 document.body.append(modal);let scale=1,returnFocus;
 const canvas=modal.querySelector('.figure-canvas'),viewport=modal.querySelector('.figure-viewport');
 function size(){canvas.style.width=`${scale*100}%`;modal.querySelector('output').value=`${Math.round(scale*100)}%`;}
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-open-figure]');if(!button)return;
  const fig=button.closest('figure'),original=fig?.querySelector('svg');if(!original)return;
  returnFocus=button;const copy=original.cloneNode(true);copy.removeAttribute('width');copy.removeAttribute('height');canvas.replaceChildren(copy);scale=1;size();
  if(typeof modal.showModal==='function')modal.showModal();else{modal.classList.add('figure-fallback');modal.setAttribute('open','');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');}
  viewport.scrollLeft=viewport.scrollTop=0;modal.querySelector('[data-figure-close]').focus();
 });
 modal.addEventListener('click',event=>{
  const step=event.target.closest('[data-zoom-step]');if(step){scale=Math.max(1,Math.min(4,scale+Number(step.dataset.zoomStep)*.5));size();}
  if(event.target.closest('[data-figure-close]')){if(typeof modal.close==='function')modal.close();else{modal.removeAttribute('open');canvas.replaceChildren();returnFocus?.focus();}}
 });
 modal.addEventListener('close',()=>{canvas.replaceChildren();returnFocus?.focus()});
 modal.addEventListener('keydown',event=>{
  if(!modal.classList.contains('figure-fallback')||!modal.hasAttribute('open'))return;
  if(event.key==='Escape'){event.preventDefault();modal.querySelector('[data-figure-close]').click();}
  if(event.key==='Tab'){
   const targets=[...modal.querySelectorAll('button,[tabindex="0"]')],first=targets[0],last=targets[targets.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
}
export function addFigureZoomButtons(){
 document.querySelectorAll('figure.source-figure').forEach(fig=>{
  if(!fig.querySelector('[data-open-figure]')){const b=document.createElement('button');b.type='button';b.className='btn figure-zoom';b.dataset.openFigure='';b.textContent='도면 확대';fig.append(b);}
 });
}
