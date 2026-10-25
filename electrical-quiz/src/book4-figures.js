// Manually transcribed learning diagrams from Book 4.xlsx. No handwritten answers
// or full textbook page photos are included in question images.
const text=(x,y,s,size=20)=>{
 const circled='①②③④⑤⑥⑦⑧⑨',index=circled.indexOf(s);
 if(s.length===1&&index>=0)return `<circle cx="${x+size*.35}" cy="${y-size*.32}" r="${size*.52}"/><text x="${x+size*.35}" y="${y-size*.04}" text-anchor="middle" font-size="${size*.77}" fill="#15202b" stroke="none">${index+1}</text>`;
 return `<text x="${x}" y="${y}" font-size="${size}" fill="#15202b" stroke="none">${s.replace(/[①-⑨]/g,c=>'('+(circled.indexOf(c)+1)+')')}</text>`;
};
const line=d=>`<path d="${d}"/>`;
const dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="3.5" fill="#15202b"/>`;
const rect=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const ground=(x,y)=>line(`M${x} ${y}v15m-15 0h30m-24 6h18m-13 6h8`);
const svg=(body,h=420,w=740,label='제공 자료의 학습용 도면')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><rect width="100%" height="100%" fill="white"/><g stroke="#15202b" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round" font-family="sans-serif">${body}</g></svg>`;
const caption='Book 4.xlsx의 인쇄 기호·조건을 바탕으로 다시 그린 학습용 도면입니다. 원본 사진과 크기·배치는 다를 수 있습니다.';
const entry=(body,h,w,label,note)=>({svg:svg(body,h,w,label),caption:note||caption});
const coil=(x,y)=>line(`M${x} ${y}v12q-25 5 0 10q-25 5 0 10q-25 5 0 10v12`);
const terminal=(x,y,s)=>`<circle cx="${x}" cy="${y}" r="4"/>`+text(x+8,y+5,s,18);
function vCircuit(answer){
 let b=text(25,25,'3상 4선식 공급선 / 변압기 T1·T2',21);
 for(const [y,s] of [[55,'a'],[85,'b'],[115,'N']])b+=line(`M55 ${y}H675`)+text(690,y+6,s);
 for(const [x,s] of [[220,'T1'],[490,'T2']]){
  b+=rect(x-70,175,150,165)+text(x-18,205,s);
  b+=line(`M${x-45} 220V240q7 -18 15 0q7 -18 15 0q7 -18 15 0q7 -18 15 0q7 -18 15 0q7 -18 15 0V220M${x-45} 315V290q7 18 15 0q7 18 15 0q7 18 15 0q7 18 15 0q7 18 15 0q7 18 15 0V315M${x-45} 260h90m-90 10h90`);
  b+=terminal(x-45,220,'U')+terminal(x+45,220,'V')+terminal(x-45,315,'u')+terminal(x+45,315,'v');
 }
 for(const [y,s] of [[385,'L1'],[415,'L2'],[445,'L3']])b+=line(`M75 ${y}H670`)+text(680,y+6,s);
 if(answer){
  b+=line('M175 220V55M265 220V115M445 220V85M535 220V115M175 315V385M265 315V355H445V315M355 355V415M535 315V445')+
    [dot(175,55),dot(265,115),dot(445,85),dot(535,115),dot(175,385),dot(355,355),dot(355,415),dot(535,445)].join('')+ground(355,355);
 }
 return b;
}
const truthStates=[[1,0,0],[0,1,0],[0,0,1],[1,1,0],[0,1,1],[1,0,1],[1,1,1],[0,0,0]];
function logicDiagram(answer){
 let b=text(25,30,answer?'모범 회로: 각 출력은 3입력 AND':'진리표를 보고 각 AND의 세 입력을 완성',20);
 const rails=[80,145,210,275,340,405];
 rails.forEach((x,i)=>b+=text(x-18,65,['X1','¬X1','X2','¬X2','X3','¬X3'][i],16)+line(`M${x} 85V600`));
 for(let i=0;i<8;i++){
  const y=110+i*64;b+=`<path d="M560 ${y-22}h30a22 22 0 0 1 0 44h-30Z"/>`+line(`M612 ${y}h55`)+text(677,y+7,'L'+(i+1));
  for(let j=0;j<3;j++){
   const yy=y-12+j*12;
   if(answer){const x=rails[j*2+(truthStates[i][j]?0:1)];b+=line(`M${x} ${yy}H560`)+dot(x,yy)}
   else b+=line(`M520 ${yy}H560`);
  }
 }
 return b;
}
function contact(x,y,name,nc=false){
 return line(`M${x} ${y-24}v16m-10 0h20m-20 15h20m-10 0v25`)+(nc?line(`M${x-13} ${y+12}l26 -26`):'')+text(x+15,y+5,name,16);
}
function ladder(answer){
 let b=text(20,28,answer?'모범 분기: a=상시열림, b=상시닫힘':'유접점 최소 접점 회로를 완성하시오',20)+line('M40 65H700M40 435H700');
 const xs=[70,155,240,325,410,495,580,665], outputs=['L4','L7','L6','L1','L8','L3','L5','L2'];
 for(let i=0;i<8;i++)b+=`<circle cx="${xs[i]}" cy="392" r="23"/>`+text(xs[i]-14,398,outputs[i],17)+line(`M${xs[i]} 415V435`);
 if(!answer){
  b+=line('M197 65V86M537 65V86')+contact(197,110,'X1(a)')+contact(537,110,'X1(b)',true)+rect(40,155,660,185);
  xs.forEach(x=>b+=line(`M${x} 340V369`));b+=text(235,245,'접점·분기 작성 영역');return b;
 }
 // Output order follows the printed minimum-contact answer, not binary order.
 for(const [x,nc] of [[197,false],[537,true]])b+=line(`M${x} 65V86`)+contact(x,110,'X1',nc);
 b+=line('M197 142V165H112M197 165H282M537 142V165H452M537 165H622');
 for(const [x,nc] of [[112,false],[282,true],[452,true],[622,false]])b+=line(`M${x} 165V186`)+contact(x,210,'X2',nc)+line(`M${x} 242V265H${x-42}M${x} 265H${x+43}`);
 const lastNC=[true,false,false,true,true,false,false,true];
 for(let i=0;i<8;i++)b+=line(`M${xs[i]} 265V286`)+contact(xs[i],310,'X3',lastNC[i])+line(`M${xs[i]} 342V369`);
 return b+text(220,480,'접점 수: 2 + 4 + 8 = 14개 (코일 제외)',18);
}
const hcontact=(x,y,name,nc=false)=>line(`M${x-30} ${y}h20m0 -10v20m20 -20v20m0 -10h20`)+(nc?line(`M${x-14} ${y+13}l28 -26`):'')+text(x-18,y-20,name,18);
function interlock(){
 let b=text(20,32,'유접점 회로 (a=NO, b=NC)',21)+line('M45 70V390M695 70V390M45 120H90')+hcontact(120,120,'PB1(b)',true)+line('M150 120H205V310M205 120H240M300 120H365M205 190H240M300 190H365V120M365 120H400M460 120H590M205 260H240M300 260H365M205 310H240M300 310H365V260M365 260H400M460 260H590');
 b+=hcontact(270,120,'PB2(a)')+hcontact(270,190,'F(a)')+hcontact(430,120,'R(b)',true)+hcontact(270,260,'PB3(a)')+hcontact(270,310,'R(a)')+hcontact(430,260,'F(b)',true);
 for(const [y,s] of [[120,'F'],[260,'R']])b+=`<circle cx="620" cy="${y}" r="30"/>`+text(612,y+7,s)+line(`M650 ${y}H695`);
 return b+[dot(205,120),dot(205,190),dot(205,260),dot(365,120),dot(365,260)].join('');
}
function gateAnswer(){
 let b=text(18,28,'모범 무접점 연결 (∨=OR, ∧=AND, ¬=NOT)',19);
 // OR + AND + AND on each row; one shared stop NOT and two interlock NOTs.
 for(const [y,input,out] of [[110,'PB2','F'],[345,'PB3','R']]){
  b+=text(15,y,input,18)+line(`M65 ${y-5}H130`)+rect(130,y-30,65,55)+text(147,y+4,'OR',18)+line(`M195 ${y-5}H275`)+rect(275,y-30,75,70)+text(288,y+9,'AND',18)+line(`M350 ${y-5}H455`)+rect(455,y-30,75,70)+text(468,y+9,'AND',18)+line(`M530 ${y-5}H660`)+text(675,y+2,out);
  b+=line(`M620 ${y-5}V${out==='F'?50:410}H105V${y+12}H130`)+dot(620,y-5);
 }
 b+=text(15,230,'PB1',18)+line('M65 225H135')+rect(135,200,70,50)+text(145,232,'NOT',18)+line('M205 225H245M245 225V135H275M245 225V370H275')+dot(245,225);
 b+=rect(365,180,70,45)+text(376,209,'NOT',18)+text(371,158,'R',18)+line('M400 180V165H690V340H620M435 202H445V135H455');
 b+=rect(365,265,70,45)+text(376,294,'NOT',18)+text(371,330,'F',18)+line('M400 265V240H710V105H660M435 287H445V370H455');
 return b+text(20,430,'PB1=1: 정지 누름. 상대 출력의 반전 신호로 인터록.',17)+text(20,460,'선 교차는 접속점(●)이 있는 곳에서만 접속합니다.',17);
}
function reception(answer){
 let b=text(30,32,'22.9kV-Y / 1,000kVA 이하',22)+text(335,68,'인입구')+line('M370 80V110M370 490V525')+text(350,553,'부하');
 if(!answer)return b+rect(70,110,600,380)+text(190,260,'기기·분기·접지를 작성하시오',22);
 b+=line('M370 110V143M370 160V225M370 260V320M370 355V390M370 450V490M370 185H155V215M155 247V285')+
  line('M370 143l20 -25M155 215l20 -22')+text(398,140,'자동고장구분개폐기',17)+text(103,219,'DS',18)+rect(141,247,28,38)+text(90,275,'LA',18)+ground(155,285)+rect(355,225,30,35)+text(407,247,'PF 10kA 이상',18)+rect(332,320,76,35)+text(349,345,'MOF',18)+line('M408 337H520')+rect(520,320,130,35)+text(533,345,'전력량계',18)+`<circle cx="370" cy="405" r="28"/><circle cx="370" cy="439" r="28"/>`+text(416,430,'수전용 변압기',18)+dot(370,185);
 return b;
}
function cableEnd(){
 let b=text(25,32,'6,600V CV 3×38mm² 케이블 단말처리',21);
 for(const x of [190,360,530]){
  b+=rect(x-9,65,18,60)+line(`M${x-18} 125V170H${x+18}V125M${x-28} 170H${x+28}L${x+20} 195H${x-20}Z`)+rect(x-18,200,36,55)+rect(x-18,255,36,70)+line(`M${x} 325Q${x} 415 360 475`);
  for(let j=0;j<5;j++)b+=line(`M${x-18} ${263+j*11}l36 15`);
 }
 b+=line('M360 475V530M570 90H540M585 263H548M120 285H172M115 335H179M580 335H548')+text(580,96,'①')+text(593,270,'②')+text(80,292,'③')+text(78,342,'④')+text(589,342,'⑤');return b;
}
function earthing(){
 let b=text(20,30,'B:주접지단자  M:노출도전부  P·C:계통외도전부',18)+rect(100,270,390,35)+text(500,296,'B')+rect(520,150,40,95)+text(531,200,'P')+rect(620,80,35,265)+text(628,230,'C')+rect(80,395,490,15)+text(585,410,'T');
 for(const [x,y] of [[125,175],[245,90],[390,140]])b+=rect(x-20,y-20,45,30)+text(x-7,y+3,'M')+line(`M${x} ${y+10}V270`)+text(x+6,(y+270)/2,'①');
 b+=line('M440 270V230H520M330 305V395M415 140H620')+text(466,224,'②')+text(342,354,'③')+text(516,130,'④');return b;
}
function pipes(){
 let b=text(22,28,'금속관 내 전선 배치 (각 상·극을 확인)',21);
 for(let i=0;i<3;i++){
  const y=75+i*130;b+=text(20,y+28,['①','②','③'][i],26);
  const groups=i===0?['L1 · L2','L1 · L2']:i===1?['L1 · L1','L2 · L2']:['L1 · L1','L2 · L2','L3 · L3'];
  groups.forEach((s,j)=>{const x=90+j*210;b+=rect(x,y,180,55)+text(x+25,y+35,s,22)});
 }
 return b;
}
const tray=()=>line('M50 70V220H690V70')+Array.from({length:6},(_,i)=>`<circle cx="${110+i*102}" cy="162" r="47"/>`+text(96+i*102,170,'?',24)).join('')+text(30,275,'3상3선식 · 2회선 · 단심케이블 · 수평 배열',22);
function guys(){
 return text(20,28,'각 지지선의 명칭을 쓰시오',21)+line('M20 290H720M60 95V300M230 95V300M60 160H230M130 160Q115 235 75 290M175 160Q190 230 220 290M305 90V300M305 120L470 165L535 290M470 165L440 290M590 80V300M590 105L680 265M590 190L650 220M650 220L680 265M680 265L700 290')+dot(130,160)+dot(175,160)+text(130,345,'①',28)+text(395,345,'②',28)+text(630,345,'③',28);
}
function poleInsulator(){
 let b=rect(353,55,45,330)+text(335,425,'전주',18)+line('M30 130H90M90 130H130M130 130H180M240 130H295M318 130H353M398 130H445M470 130H520M580 130H680M353 170H398M90 130Q285 385 655 160');
 for(const [x,reverse] of [[180,false],[520,true]]){
  for(let j=0;j<4;j++)b+=`<path d="M${x+j*15} 110l12 -12v64l-12 -12Z"/>`;
 }
 b+=`<ellipse cx="305" cy="130" rx="14" ry="8"/><ellipse cx="455" cy="130" rx="14" ry="8"/>`+text(52,110,'압축형 인류클램프',15)+text(570,110,'데드엔드클램프',15)+line('M210 185V164M305 75V119M420 235L390 170M596 185L578 132')+text(196,215,'①',25)+text(292,65,'②',25)+text(423,260,'③',25)+text(595,215,'④',25);return b;
}
function workflow(){
 let b=text(100,27,'가공배전 전선 접속작업 흐름도',21);
 const box=(y,s)=>rect(180,y,330,42)+text(202,y+28,s,18);
 b+=box(48,'전선공사 시공기준 확인')+line('M345 90V115')+box(115,'①')+line('M345 157V195')+`<path d="M345 195L510 240L345 285L180 240Z"/>`+text(205,244,'전선펴기길이 ＜ 전선조장',16)+line('M510 240H650V180H630V165M630 120V100H345V115')+rect(550,120,160,45)+text(607,151,'③',24)+text(520,232,'N',19)+line('M345 285V315')+text(357,305,'Y',19)+box(315,'②');
 const rest=['애자설치 및 바인드 시공','전선 접속','충전부 절연 처리','작업장 정리정돈','완료'];
 rest.forEach((s,i)=>{const y=390+i*75;b+=line(`M345 ${i===0?357:y-33}V${y}`)+box(y,s)});return b;
}
function towers(){
 let b=text(20,30,'철탑 형태: ①~⑤의 명칭',22);
 // Distinct silhouettes reproduce the supplied classification drawing.
 b+=line('M85 250L120 70L155 250ZM100 170L140 130M100 130L140 170M94 205L146 170M94 170L146 205M70 100L120 85L170 100M68 145L120 130L172 145M65 190L120 175L175 190M70 100V115M170 100V115M68 145V160M172 145V160M65 190V205M175 190V205')+rect(104,250,32,35)+text(106,325,'①',26);
 b+=line('M265 250V115L295 75L325 115V250ZM265 115H325M265 145L325 180M265 180L325 145M265 180L325 215M265 215L325 180M250 115H340M250 115V130M340 115V130')+rect(267,250,56,35)+text(282,325,'②',26);
 b+=rect(430,90,30,165)+rect(535,90,30,165)+line('M430 90H565M430 125H565M430 90L460 125M460 90L490 125M490 90L520 125M520 90L550 125M445 255V280M550 255V280M460 185H535M460 135H535')+text(485,325,'③',26);
 b+=line('M135 560L160 465L85 400L160 430L235 400L185 465L210 560ZM105 417H218M160 430V465M135 560L195 510M148 510L210 560M135 400V380M185 400V380M85 400V420M235 400V420')+rect(153,560,40,30)+text(160,630,'④',26);
 b+=line('M420 560L445 465L410 405L460 385L510 405L480 465L505 560ZM445 465H480M425 535L490 490M438 490L500 535M410 405H510M410 405V425M510 405V425M460 405V438')+`<path d="M460 565L485 590L460 615L435 590Z"/>`+text(448,650,'⑤',26);return b;
}
function hv(){
 let b=text(35,28,'22.9kV-Y 3상4선식 / 수전 단선도',22)+line('M365 55V95M365 130V155M365 195V355M365 395V435M365 435H170V475M365 435H555V475M365 135H130V175M365 265H510');
 b+=rect(350,95,30,35)+text(400,115,'PF①',20)+rect(325,155,80,40)+text(339,182,'MOF')+line('M405 175H530')+rect(530,155,90,40)+text(545,182,'D.M.')+rect(114,175,32,42)+text(65,200,'LA')+ground(130,217);
 b+=`<ellipse cx="365" cy="265" rx="23" ry="9"/>`+text(270,255,'CT',19)+text(253,285,'75/5',18)+rect(510,240,150,50)+text(526,269,'OCR / A',18)+rect(350,355,30,40)+text(410,377,'VCB 24kV 600A',17);
 for(const [x,s] of [[170,'300kVA'],[555,'1,500kVA']])b+=line(`M${x} 475l20 -25M${x} 475V505`)+`<circle cx="${x}" cy="529" r="26"/><circle cx="${x}" cy="561" r="26"/>`+line(`M${x} 587V615`)+text(x-45,649,s,20)+text(x-65,677,'22.9kV/380V',16);
 return b;
}
function spot(){
 let b=text(24,28,'2~4회선의 배전선 / 그림은 3회선으로 단순화',20);
 [80,120,160].forEach((y,i)=>b+=line(`M50 ${y}H700`)+text(15,y+7,String(i+1),18));
 for(const [x,name] of [[210,'A고객'],[510,'B고객']]){
  [x-70,x,x+70].forEach((xx,j)=>{const yy=80+j*40;b+=line(`M${xx} ${yy}V215`)+dot(xx,yy)+rect(xx-27,215,54,45)+text(xx-21,244,'NWT',16)+line(`M${xx} 260V285`)+rect(xx-23,285,46,32)+text(xx-15,308,'CB',17)+line(`M${xx} 317V348`)+rect(xx-13,348,26,20)+line(`M${xx} 368V405`)});
  b+=line(`M${x-90} 405H${x+90}`)+text(x-40,450,name,22);
 }
 return b+text(45,500,'NWT: 네트워크 변압기 / CB: 프로텍터 차단기',18)+text(45,530,'CB 아래 직사각형: 프로텍터 퓨즈',18);
}
export const book4Figures={
 book4VBlank:entry(vCircuit(false),490,740,'역V결선 미완성 도면'),
 book4VAnswer:entry(vCircuit(true),490,740,'역V결선 모범 연결'),
 book4CableEnd:entry(cableEnd(),560,740,'케이블 단말처리 번호①~⑤'),
 book4LogicBlank:entry(logicDiagram(false),650,740,'진리표 논리회로의 빈 입력단'),
 book4LogicAnswer:entry(logicDiagram(true),650,740,'진리표 논리회로 모범 연결'),
 book4LadderBlank:entry(ladder(false),470,740,'유접점 회로의 빈 작성 영역'),
 book4LadderAnswer:entry(ladder(true),510,740,'14접점의 공통 분기 모범 회로'),
 book4ReceptionBlank:entry(reception(false),580,740,'간이수전설비 빈 결선 영역'),
 book4ReceptionAnswer:entry(reception(true),580,740,'간이수전설비 모범 단선 결선'),
 book4Earthing:entry(earthing(),445,740,'접지시스템의 번호별 도체'),
 book4ParallelPipes:entry(pipes(),455,740,'금속관 내 전선 배치 세 방법'),
 book4Tray:entry(tray(),315,740,'여섯 단심케이블의 수평 배열'),
 book4Guys:entry(guys(),390,740,'지지선 세 종류'),
 book4PoleInsulator:entry(poleInsulator(),455,740,'장주 애자 설치 부품 번호'),
 book4Workflow:entry(workflow(),765,740,'전선 접속작업의 빈칸 흐름도'),
 book4Towers:entry(towers(),690,740,'철탑 다섯 형태'),
 book4PBD:entry(rect(100,90,370,55)+'<rect x="100" y="90" width="370" height="55" fill="#15202b"/>'+text(500,130,'PBD',26),225,740,'PBD 기호'),
 book4Expansion:entry('<rect x="100" y="90" width="70" height="55" fill="#15202b"/><rect x="540" y="90" width="70" height="55" fill="#15202b"/>'+rect(170,90,370,55)+line('M170 118Q193 64 216 118T262 118T308 118T354 118T400 118T446 118T492 118T538 118'),225,740,'신축부가 있는 덕트 기호'),
 book4Bell:entry(rect(285,65,80,80)+'<circle cx="325" cy="160" r="15"/>',225,650,'사각형 아래 원 기호'),
 book4Emergency:entry(rect(215,75,220,95)+'<circle cx="270" cy="122" r="40"/><circle cx="380" cy="122" r="40"/>'+[dot(255,122),dot(285,122),dot(365,111),dot(395,111),dot(380,138)].join(''),225,650,'두 원의 콘센트 기호'),
 book4Interlock:entry(interlock(),430,740,'자기유지 및 상호 인터록 유접점 회로'),
 book4InterlockAnswer:entry(gateAnswer(),495,740,'AND4 OR2 NOT3 무접점 모범 연결'),
 book4HV:entry(hv(),710,740,'전력퓨즈 MOF CT VCB 두 변압기 수전 단선도',caption+' 계측 분기는 기능 연결로 단순화했으며 원문의 별도 조작전원·PT 가지는 세 계산에 사용되지 않아 생략했습니다.'),
 book4Cathodic:entry(text(275,75,'직류전원')+rect(240,45,185,55)+text(215,78,'−')+text(440,78,'+')+line('M240 73H130V260M425 73H560V250')+rect(40,160,660,25)+'<circle cx="130" cy="290" r="30"/><circle cx="130" cy="290" r="22"/>'+rect(535,250,50,110)+text(543,295,'양')+text(543,327,'극')+text(58,365,'피방식체'),420,740,'직류전원의 음극은 피방식체, 양극은 별도 양극'),
 book4Spot:entry(spot(),560,740,'여러 배전선의 네트워크 변압기 저압측 병렬 연결')
};
