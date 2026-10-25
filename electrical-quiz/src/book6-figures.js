// Learning redraws of complete figures in the user's Book 6.xlsx.
const path=d=>`<path d="${d}"/>`;
const text=(x,y,s,size=22)=>`<text x="${x}" y="${y}" fill="#15202b" stroke="none" font-size="${size}" font-family="sans-serif">${s}</text>`;
const dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="6" fill="#15202b"/>`;
const number=(x,y,n)=>`<circle cx="${x}" cy="${y}" r="16"/>`+text(x-5,y+6,String(n),18);
const figure=(body,w=700,h=250,label='2020년 제공 문제의 학습용 그림')=>({
 svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><rect width="100%" height="100%" fill="white"/><g stroke="#15202b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`,
 caption:'Book 6.xlsx의 인쇄 기호·번호를 바탕으로 다시 그린 학습용 그림입니다. 원본과 크기·세부 형상은 다를 수 있습니다.'
});
const circle=(cx,cy,r)=>`<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
function towers(){
 let b=text(25,30,'①~⑥의 철탑 형태를 확인하시오',23);
 // Top row: square, rectangular, ox-head. Bottom: portal, rotated, MC.
 b+=path('M75 295L120 80L165 295ZM94 230L150 183M94 183L150 230M101 184L140 142M101 142L140 184M82 265L158 225M82 225L158 265M55 120L120 98L185 120M50 168L120 145L190 168M45 215L120 191L195 215M55 120V140M185 120V140M50 168V188M190 168V188M45 215V235M195 215V235M28 295H215')+'<rect x="102" y="295" width="36" height="35"/>'+number(120,365,1);
 b+=path('M350 295V130L390 80L430 130V295ZM350 130H430M350 165L430 209M350 209L430 165M350 209L430 253M350 253L430 209M330 130H450M330 130V150M450 130V150M320 295H460')+'<rect x="350" y="295" width="80" height="35"/>'+number(390,365,2);
 b+=path('M635 295L660 204L590 117L660 149L730 117L697 204L720 295ZM608 126H711M660 149V190M635 295L706 250M646 250L720 295M630 132V85M690 132V85M590 117V139M730 117V139M605 295H750')+'<rect x="656" y="295" width="43" height="35"/>'+number(670,365,3);
 b+='<rect x="55" y="440" width="30" height="200"/><rect x="180" y="440" width="30" height="200"/>'+path('M55 440H210M55 475H210M55 440L85 475M85 440L115 475M115 440L145 475M145 440L175 475M175 440L205 475M85 500H180M85 560H180M25 640H240M70 640V664M195 640V664')+number(135,705,4);
 b+=path('M340 640L370 535L335 465L395 445L455 465L420 535L450 640ZM370 535H420M347 610L433 560M357 560L443 610M335 465H455M335 465V487M455 465V487M395 465V505M315 640H470M395 650L420 675L395 700L370 675Z')+number(395,735,5);
 b+='<rect x="620" y="465" width="12" height="175"/><rect x="718" y="465" width="12" height="175"/>'+path('M590 465L635 435H690L760 465ZM635 435V465M690 435V465M620 465H730M632 475L718 550M632 550L718 475M632 560L718 635M632 635L718 560M632 550H718M632 560H718M590 465V485M760 465V485M590 640H765')+'<rect x="617" y="650" width="20" height="12"/><rect x="715" y="650" width="20" height="12"/>'+number(675,705,6);
 return b;
}
export const book6Figures={
 book6RemoteRelay:figure('<rect x="175" y="65" width="285" height="105"/>'+[190,275,360].map(x=>`<path d="M${x} 156L${x+35} 82L${x+70} 156Z" fill="#15202b"/>`).join('')+text(480,175,'10',34),700,250,'삼각형 세 개를 집합한 기호와 숫자10'),
 book6Floor50:figure(circle(290,105,44)+dot(275,105)+dot(305,105)+'<path d="M290 151L266 177H314Z" fill="#15202b"/>'+text(350,165,'50A',28),700,250,'바닥 부착 표시와50A가 있는 콘센트 기호'),
 book6Medical:figure(circle(315,115,48)+'<path d="M315 67A48 48 0 0 0 315 163Z" fill="#15202b"/>'+dot(333,99)+dot(333,132)+text(380,155,'H',34),700,250,'반쪽을 채우고 H를 붙인 콘센트 기호'),
 book6EarthSocket:figure(circle(315,115,48)+dot(297,115)+dot(333,115)+text(375,155,'ET',30),700,250,'ET가 붙은 콘센트 기호'),
 book6Emergency:figure('<rect x="180" y="60" width="300" height="120"/>'+circle(255,120,46)+circle(405,120,46)+dot(239,120)+dot(271,120)+dot(389,120)+dot(421,120),700,250,'2020년 비상콘센트:두 원에 점이 각각 두 개'),
 book6WiringLines:figure([90,165,240,315].map((y,i)=>number(90,y,i+1)).join('')+'<path d="M200 90H620" stroke-width="3"/>'+'<path d="M200 165H620" stroke-width="3" stroke-dasharray="2 13" stroke-linecap="butt"/>'+'<path d="M200 240H620" stroke-width="3" stroke-dasharray="26 16" stroke-linecap="butt"/>'+'<path d="M200 315H620" stroke-width="3" stroke-dasharray="40 9 3 9 3 9" stroke-linecap="butt"/>',700,390,'옥내배선 네 가지 선 기호'),
 book6Towers:figure(towers(),800,780,'2020년3회 철탑 여섯 형태:번호 순서는 원문 기준')
};
