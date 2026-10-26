"""Reviewed transcription of complete questions in Book 7.xlsx (2019).

This is a curated, idempotent import, not an automatic OCR/excel parser.
"""
from pathlib import Path
import argparse, json, hashlib

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workbook',type=Path,required=True)
parser.add_argument('--inventory',type=Path,required=True)
args=parser.parse_args();ROOT=Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT/p).read_text())
def write(p,d): (ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
bank=read('src/questions.json');practical=read('src/practical.json');notes=read('sources/practical-notes.json')
new=[];sections=[];counts={};reused=[]
checked='2026-10-26'
notice='2019년 기출 수록 교재의 제공 사진·인쇄 답안을 대조했습니다. 현행 KEC·KS·품셈 전문 전체 검증은 아닙니다.'
def add(exam,number,photos,category,question,options,explain,prompt=None,fields=None,kind='short',diagram=None,original=None,note=None):
    counts[exam]=counts.get(exam,0)+1;qid=f'ec-{exam}-book7-{counts[exam]:03d}';year,round_=map(int,exam.split('-'));exam+='회';sid='book7-'+qid
    q={'id':qid,'year':exam,'examYear':year,'round':round_,'category':category,'question':question,'options':options,'correct':0,'explain':explain,'diagram':diagram,'caution':True,
       'originalQuestion':original or prompt or question,'source':{'file':'Book 7.xlsx','exam':exam,'originalTextAvailable':True,'kind':'user-provided-question-photo','questionNumber':number,'photos':[f'image{i}.png' for i in photos],'transcription':'sources/book7-import-report.json'},
       'verification':{'status':'source-photo-checked','checkedAt':checked,'notes':[notice]+([note] if note else [])}}
    p={'kind':kind,'prompt':prompt or question,'basisAnswer':options[0],'fields':[{'label':k,'answer':v} for k,v in (fields or [('답안',options[0])])],
       'source':{'id':sid,'kind':'user-question-photo','exam':exam,'received':checked},'notes':[note] if note else []}
    new.append(q);practical[qid]=p
    sections.append({'id':sid,'exam':exam,'questionIds':[qid],'excerpt':q['originalQuestion']+'\n인쇄 답안: '+'\n'.join(f['label']+': '+f['answer'] for f in p['fields']),
                     'editorialNote':'Book 7.xlsx 문제'+(str(number) if number is not None else '(원문 번호 확인 불가)')+' / '+', '.join(q['source']['photos'])+' / '+(note or notice)})
    return qid
def share(qid,exam,number,photos,excerpt,**variant):
    exam+='회';sid='book7-shared-'+qid;q=next(q for q in bank if q['id']==qid)
    a={'exam':exam,'sourceId':sid,'file':'Book 7.xlsx','questionNumber':number,'photos':[f'image{i}.png' for i in photos],
       'note':'Book7의2019년 교재 문제·답안과 대조했습니다. 같은 ID의 누적 기록을 공유합니다.',
       'explain':'2019년 제공 교재의 인쇄 답안 대조: '+excerpt,
       'verification':{'status':'source-photo-checked','checkedAt':checked,'notes':[notice,'이 회차의 출처:Book 7.xlsx 문제'+str(number)]},**variant}
    q['appearances']=[v for v in q.get('appearances',[]) if v.get('sourceId')!=sid]+[a];reused.append(qid)
    sections.append({'id':sid,'exam':exam,'questionIds':[qid],'excerpt':excerpt,'editorialNote':'Book 7.xlsx 문제'+(str(number) if number is not None else '(원문 번호 확인 불가)')+' / '+', '.join(a['photos'])+' / '+notice})

# 2019-1: original photographs 1..9. Complete prompts/answers only.
share('q124','2019-1',1,[1],'기구번호87T:주변압기 차동계전기.')
add('2019-1',2,[2],'수전·보호','차단기(CB)와 단로기(DS)의 기능 차이를 바르게 설명한 것은?',
 ['DS는 무부하전류 개폐·전로 접속변경, CB는 부하개폐·사고전류 차단','DS는 사고전류 차단, CB는 무부하 접속변경만 수행','DS와 CB 모두 부하·고장전류 차단 능력이 항상 동일','DS는 전압을 변성하고 CB는 전류를 계측'],
 '인쇄 답안에서 단로기는 무부하전류 개폐와 전로의 접속변경,차단기는 부하개폐 및 사고 시 차단으로 전로나 기기를 보호하는 역할입니다.',
 prompt='차단기와 단로기의 기능 차이점을 각각 쓰시오.',fields=[('단로기(DS)','무부하전류 개폐, 전로의 접속변경'),('차단기(CB)','부하개폐, 사고 시 차단하여 전로나 기기 보호')])
add('2019-1',3,[3],'수전·보호','제공 교재의 콘덴서 설비 보호계전기 네 가지를 모두 나열한 것은?',
 ['과전류·과전압·부족전압·지락보호 계전기','비율차동·부흐홀츠·충격압력·유면검출 계전기','주파수·역전력·동기검정·탈조 계전기','온도·속도·유량·압력 계전기'],
 '인쇄 답안은 과전류계전기,과전압계전기,부족전압계전기,지락보호계전기입니다. 기존 과전압/부족전압 역할 문제와 구별하여 보호기기 네 종류를 묻습니다.',
 prompt='콘덴서 설비 보호에 사용하는 계전기 네 가지를 쓰시오.',fields=[('보호계전기 네 가지','과전류계전기, 과전압계전기, 부족전압계전기, 지락보호계전기')])
add('2019-1',4,[4],'전선·자재','전선 약호 CN-CV-W의 명칭은?',
 ['동심중성선 수밀형 전력케이블','동심중성선 저독성 난연 전력케이블','인입용 비닐절연전선','옥외용 가교폴리에틸렌 절연전선'],
 '사진의 CN-CV-W 인쇄 답안은 동심중성선 수밀형 전력케이블입니다. FR·저독성 난연 표기가 있는 다른 약호와 혼동하지 않습니다.',
 prompt='전선 약호 CN-CV-W의 명칭을 쓰시오.')
add('2019-1',4,[4],'전선·자재','제공 사진의 전선 약호 CV1의 명칭은?',
 ['0.6/1kV 가교폴리에틸렌 절연 비닐 시스 케이블','0.6/1kV 비닐절연 비닐 캡타이어 케이블','450/750V 저독성 난연 폴리올레핀 절연전선','인입용 비닐절연전선 2심 평형'],
 '제공 사진은 CV1로 인쇄되어 있으며 답안은0.6/1kV 가교폴리에틸렌 절연 비닐 시스 케이블입니다. 다른 자료의 VV·VCT·HFIO와 약호를 구분합니다.',
 prompt='제공 사진에 인쇄된 약호 CV1의 전압등급과 케이블 명칭을 쓰시오.')
share('q143','2019-1',7,[5],'가공전선로 지지선의 소선은3가닥 이상이며,이 문제는 소선 지름2.6mm 이상도 함께 제시합니다.',
 question='제공 교재의 고압 지중인입도에서 가공전선로 지지선은 최소 몇 가닥 이상의 소선으로 된 연선을 사용하는가?',diagram='book7UndergroundInlet')
add('2019-1',7,[5],'송배전','제공 교재의 고압 지중인입도에서 지지선 소선의 최소 지름은?',
 ['2.6mm','1.6mm','2.0mm','4.0mm'],
 '이 문제의 인쇄 답안은 소선3가닥 이상,소선 지름2.6mm 이상입니다. 이 문항은 지름을 묻고,가닥 수는 기존q143에서 학습합니다.',
 prompt='제공 고압 지중인입도에서 지지선에 쓰는 금속 소선의 최소 지름을 단위와 함께 쓰시오.',fields=[('최소 소선 지름','2.6mm 이상')],kind='blank',diagram='book7UndergroundInlet')
add('2019-1',7,[5],'송배전','제공 교재의 지지선 안전율과 허용인장하중 최저값은 각각?',
 ['2.5 이상·4.31kN','1.3 이상·5.26kN','2.0 이상·4.00kN','3.0 이상·2.60kN'],
 '문제7(2)의 인쇄 답안은 안전율2.5 이상,허용인장하중 최저값4.31kN입니다. 다른 지지물·가공지선 조건의 수치와 혼동하지 않습니다.',
 prompt='제공 고압 지중인입도에서 지지선의 안전율은(①)이상,허용인장하중의 최저값은(②)kN이다.빈칸을 채우시오.',fields=[('① 안전율','2.5'),('② 허용인장하중 최저값[kN]','4.31')],kind='blank',diagram='book7UndergroundInlet')
add('2019-1',7,[5],'설비·배선','제공 교재의 고압 지중전선로에 사용할 수 있는 케이블 세 가지는?',
 ['클로로프렌 외장·비닐 외장·폴리에틸렌 외장 케이블','나동선·나경동선·나알루미늄선','DV 2R·DV 2F·OW','지지선·조가선·가공지선'],
 '문제7(3)의 인쇄 답안은 클로로프렌 외장케이블,비닐 외장케이블,폴리에틸렌 외장케이블입니다.시설방법(관로식·암거식·직접매설식)을 묻는 기존 문항과 구분합니다.',
 prompt='제공 고압 지중인입도에서 지중전선로에 사용할 수 있는 케이블 세 가지를 쓰시오.',fields=[('세 가지','클로로프렌 외장케이블, 비닐 외장케이블, 폴리에틸렌 외장케이블')],diagram='book7UndergroundInlet')
add('2019-1',7,[5],'설비·배선','제공 교재의 고압 지중인입도에서 차도부 지중전선로의 최소 매설깊이는?',
 ['1m','0.3m','0.5m','2.5m'],
 '문제7(4)의 인쇄 답안은1m입니다.질문에 제시된 고압 지중인입도·차도부 조건의 교재 답안으로 학습합니다.',
 prompt='제공 고압 지중인입도에서 차도부 지중전선로의 매설깊이는 최소 몇m 이상인가?',fields=[('최소 매설깊이','1m 이상')],kind='blank',diagram='book7UndergroundInlet',note='제공 문제의 시설도·차도부 조건을 적용합니다.모든 지중전선로의 일반 기준으로 확대하지 않습니다.')
add('2019-1',9,[6],'변압기','주상변압기 설치 전에 점검하는 사항으로 옳은 조합은?',
 ['절연저항·절연유 상태·외관 및 핸드홀 커버 조임','2차전압·상측정·운전 중 이상 유무만 점검','부하전력·역률·수용률만 측정','전력량·최대수요전력·전기요금만 확인'],
 '설치 전에는 절연저항을 측정하고 절연유의 유량·누유 상태,부싱 손상 등 외관과 핸드홀 커버 조임 상태를 확인합니다.설치 후 항목과 구분합니다.',
 prompt='주상변압기 설치 전 점검사항 세 가지를 쓰시오.',fields=[('①','절연저항 측정'),('②','절연유 상태:유량·누유 상태'),('③','외관 상태:부싱 손상유무 및 핸드홀 커버 조임 상태')])
add('2019-1',9,[6],'변압기','주상변압기 설치 후 점검사항 세 가지로 옳은 것은?',
 ['2차전압 측정·상측정·변압기 이상유무 확인','절연유 생산일·철탑 형식·가공지선 인장강도','후강전선관 호칭·접착제 종류·소선 지름','역률요금·재료할증·철거손실률'],
 '인쇄 답안의 설치 후 점검은2차전압 측정,상측정,변압기 이상유무 확인입니다.절연저항·절연유·외관 상태는 이 원문에서 설치 전 항목으로 구분합니다.',
 prompt='주상변압기 설치 후 점검사항 세 가지를 쓰시오.',fields=[('①','2차전압 측정'),('②','상측정'),('③','변압기 이상유무 확인')])
share('q182','2019-1',10,[7],'저압전로의 절연저항을 측정하는 계측기:메거(절연저항계).',
 question='저압전로의 절연저항을 측정하는 데 사용하는 계측기는?',practical={'prompt':'저압전로의 절연저항을 측정하는 데 사용하는 계측기의 명칭을 쓰시오.'})
share('q139','2019-1',None,[8],'철거손실률:전기설비공사에서 철거 작업 시 발생하는 폐자재를 환입할 때 재료의 파손·손실·망실 및 일부 부식 등에 의한 손실률.참고 표는 옥외전선 할증5%/철거손실2.5%,옥외케이블 할증3%/철거손실1.5%로 기존 정정과 일치합니다.')
add('2019-1',None,[9],'설비·배선','제공 교재에서 승강로·승강기용 절연전선과 이동케이블 동선의 최소 굵기는 각각?',
 ['절연전선1.5mm²·이동케이블0.75mm²','절연전선0.75mm²·이동케이블1.5mm²','절연전선2.5mm²·이동케이블1.5mm²','절연전선4mm²·이동케이블2.5mm²'],
 '제공 사진의 인쇄 답안은 절연전선1.5mm²,이동케이블0.75mm²입니다.질문·답안은 온전하지만 원문 번호는 사진에서 확인되지 않아 추정하지 않았습니다.',
 prompt='승강로 및 승강기에 시설하는 절연전선과 이동케이블의 동선 최소 굵기를 각각mm²로 쓰시오.',fields=[('절연전선[mm²]','1.5'),('이동케이블[mm²]','0.75')],kind='blank',note='문제·답안은 온전하지만 원문 번호는 확인할 수 없습니다.회차는 엑셀19-1회 구간으로 분류했습니다.')

# 2019-2: complete original problems10,11,14,15.
add('2019-2',10,[10],'접지·서지','제공 교재에서22.9kV 이하 배전선로로 수전하는 설비의 피뢰기 정격전압은?',
 ['18kV','21kV','24kV','72kV'],
 '인쇄 답안은18kV입니다.사진 표에서22.9kV의 변전소용21kV와 배전선로용18kV를 구분하며,질문의 배전선로 수전설비에는18kV를 적용합니다.',
 prompt='제공 교재 기준으로22.9kV 이하 배전선로에서 수전하는 설비의 피뢰기 정격전압을kV로 쓰시오.',fields=[('배전선로 수전설비 피뢰기 정격전압','18kV')],kind='blank')
add('2019-2',11,[11],'수전·보호','그림에서 부하 공급을 유지하며 CB를 점검하기 위한 조작순서는? 평상시DS₃는 열려 있다.',
 ['DS₃ ON → CB OFF → DS₂ OFF → DS₁ OFF','CB OFF → DS₁ OFF → DS₂ OFF → DS₃ ON','DS₁ OFF → DS₂ OFF → CB OFF → DS₃ ON','DS₃ OFF → CB ON → DS₁ ON → DS₂ ON'],
 '인쇄 답안은 DS₃ 투입→CB 개방→DS₂ 개방→DS₁ 개방입니다.DS₃는 CB 양측을 잇는 우회 경로로,점검 중 부하 공급을 유지하는 문제 조건입니다.',
 prompt='그림은 평상시DS₃가 열려 있는 계통이다.부하 공급을 유지하면서 CB를 점검하기 위한 조작순서를ON/OFF와 함께 쓰시오.',fields=[('CB 점검 조작순서','DS₃ ON → CB OFF → DS₂ OFF → DS₁ OFF')],diagram='book7BreakerBypass')
add('2019-2',11,[11],'수전·보호','그림에서 CB 점검 후 원상 복구하는 조작순서는?',
 ['DS₂ ON → DS₁ ON → CB ON → DS₃ OFF','DS₃ OFF → CB ON → DS₁ ON → DS₂ ON','CB ON → DS₃ OFF → DS₂ ON → DS₁ ON','DS₁ OFF → DS₂ OFF → CB OFF → DS₃ ON'],
 '인쇄 답안은 DS₂ 투입→DS₁ 투입→CB 투입→DS₃ 개방입니다.문제의 복구 조건에서는 우회 DS₃를 마지막에 개방합니다.점검 시작 순서와 구분합니다.',
 prompt='그림의 CB 점검을 마친 뒤 원래 공급 경로로 복구하는 조작순서를ON/OFF와 함께 쓰시오.',fields=[('점검 후 복구 조작순서','DS₂ ON → DS₁ ON → CB ON → DS₃ OFF')],diagram='book7BreakerBypass')
add('2019-2',14,[12,13],'수전·보호','부하설비의 역률이 저하될 때 수용가의 손해 네 가지를 바르게 나열한 것은?',
 ['전력손실 증가·전기요금 증가·전압강하 증가·설비용량 여유분 감소','전력손실 감소·전기요금 감소·전압강하 감소·설비용량 여유분 증가','전력손실 증가·전기요금 감소·전압강하 감소·설비용량 여유분 증가','전력손실 감소·전기요금 증가·전압강하 증가·설비용량 여유분 증가'],
 '인쇄 답안은 전력손실이 커짐,전기요금 증가,전압강하가 커짐,설비용량의 여유분 감소입니다.역률 개선 효과는 이와 반대 방향입니다.',
 prompt='수·변전 설비에서 부하의 역률이 저하할 때 수용가가 입는 손해 네 가지를 쓰시오.',fields=[('①','전력손실 증가'),('②','전기요금 증가'),('③','전압강하 증가'),('④','설비용량 여유분 감소')])
add('2019-2',14,[12],'수전·보호','부하의 역률을 개선하는 기기와 설치방법의 올바른 조합은?',
 ['전력용 콘덴서·부하와 병렬 접속','전력용 콘덴서·부하와 직렬 접속','과전류계전기·부하와 직렬 접속','절연변압기·중성선에만 접속'],
 '기기 명칭은 전력용 콘덴서이며 부하와 병렬로 접속합니다.진상 무효분을 공급하는 역률 개선 목적의 접속입니다.이 문제는 설치 위치 세 가지를 묻는 기존 문항과 구분합니다.',
 prompt='역률 개선용 기기의 명칭과 부하에 대한 접속방법을 쓰시오.',fields=[('기기 명칭','전력용 콘덴서'),('설치방법','부하와 병렬로 접속')])
add('2019-2',15,[13],'전선·자재','노출배관의 직각 굴곡에 사용하며 T형3방향·크로스형4방향 분기용이 있는 금속관 부품은?',
 ['유니버설 엘보(Universal elbow)','링 리듀서(Ring reducer)','플로어 박스(Floor box)','새들(Saddle)'],
 '인쇄 답안은 유니버설 엘보입니다.노출배관에서 관의 직각 굴곡 또는 분기에 사용하며3방향 T형과4방향 크로스형을 구분합니다.',
 prompt='노출배관에서 관을 직각으로 굽히는 곳에 사용하고3방향 T형·4방향 크로스형이 있는 금속관 부품의 명칭을 쓰시오.')

# 2019-4: source footer of image14 explicitly confirms the exam.
share('ec-2025-1-symbol-001','2019-4',None,[14],'2019년4회 그림기호 문항의(1) 그림기호:누전경보기.',question='제공된2019년4회 자료의(1) 그림기호 명칭은?')
share('ec-2025-1-symbol-004','2019-4',None,[14],'2019년4회 그림기호 문항의(2) 그림기호:누름버튼.',question='제공된2019년4회 자료의(2) 그림기호 명칭은?')
share('ec-2025-1-symbol-005','2019-4',None,[14],'2019년4회 그림기호 문항의(4) 그림기호:연기감지기.이 소방·경보 기호 문맥의S는 옥내배선 개폐기S와 구분합니다.',question='제공된2019년4회 자료의(4) 그림기호 명칭은?')
add('2019-4',None,[14],'조명·기호','제공된2019년4회 자료의(3) TS 그림기호 명칭은?',
 ['타임스위치','연기감지기','개폐기','경보수신반'],
 '제공 사진의(3)은 타임스위치입니다.사각형 안의 TS 문자를 확인합니다.',
 prompt='그림의(3) TS 기호 명칭을 쓰시오.',fields=[('기호 명칭','타임스위치')],diagram='book7TimeSwitch')
add('2019-4',None,[14],'조명·기호','제공된2019년4회 자료의(5) 원 안에 삼각형이 있는 그림기호 명칭은?',
 ['스피커','누전경보기','누름버튼','조광기'],
 '제공 사진의(5)은 스피커입니다.원 내부 삼각형과 별도 그림의 누전경보기 내부 세 갈래 선을 구별합니다.',
 prompt='제공 그림의(5) 기호 명칭을 쓰시오.',fields=[('기호 명칭','스피커')],diagram='book7Speaker')
add('2019-4',None,[14],'조명·기호','제공된2019년4회 자료의(6) 검은 점을 지나는 화살표 그림기호 명칭은?',
 ['조광기','누전경보기','타임스위치','연기감지기'],
 '제공 사진의(6)은 조광기입니다.검은 점을 통과하는 대각선 화살표 형태를 확인합니다.',
 prompt='제공 그림의(6) 기호 명칭을 쓰시오.',fields=[('기호 명칭','조광기')],diagram='book7Dimmer')
share('q073','2019-4',5,[15],'변압기 냉각방식 다섯 가지:유입자냉식·유입풍냉식·유입수냉식·송유풍냉식·송유수냉식.')
share('q036','2019-4',7,[16],'ACSR의 경동연선 대비 특징:기계적 강도가 큼,비중이 작음,같은 저항값에서 바깥지름이 커 코로나 발생 방지에 효과적.',
 practical={'kind':'short','prompt':'가공송전선로의 ACSR을 경동연선과 비교한 특징 세 가지를 쓰시오.','fields':[{'label':'①','answer':'기계적 강도가 크다.'},{'label':'②','answer':'비중이 작다.'},{'label':'③','answer':'같은 저항값에서 바깥지름이 커 코로나 발생 방지에 효과적이다.'}]})
add('2019-4',14,[17],'접지·서지','제공 교재의 피뢰기 구비조건에서 상용주파 방전개시전압·충격 방전개시전압·제한전압은 각각 어떠해야 하는가?',
 ['높을 것·낮을 것·낮을 것','낮을 것·높을 것·높을 것','높을 것·높을 것·낮을 것','낮을 것·낮을 것·높을 것'],
 '인쇄 답안은 상용주파 방전개시전압은 높을 것,충격 방전개시전압은 낮을 것,제한전압은 낮을 것입니다.상용주파 전압과 충격전압에서 요구되는 개시전압 방향이 서로 다릅니다.',
 prompt='피뢰기의 구비조건으로 상용주파 방전개시전압,충격 방전개시전압,제한전압이 각각 높아야 하는지 낮아야 하는지 쓰시오.',
 fields=[('상용주파 방전개시전압','높을 것'),('충격 방전개시전압','낮을 것'),('제한전압','낮을 것')])

# Regenerate only this import's new entries/notes; permanent IDs stay stable.
new_ids={q['id'] for q in new};bank=[q for q in bank if q['id'] not in new_ids]+new
notes['sections']=[s for s in notes['sections'] if not s['id'].startswith('book7-')]+sections
write('src/questions.json',bank);write('src/practical.json',practical);write('sources/practical-notes.json',notes)
retired=read('src/retired-questions.json');inventory=json.loads(args.inventory.read_text())
for image in inventory:image['worksheetExam']='2019-'+('1' if image['row']<25 else '2' if image['row']<49 else '4')+'회'
excluded=[
 {'photos':[5,6,9],'part':'인접 면의 계산 답·상단 수식 조각','reason':'질문·조건 원문이 온전하지 않아 미등록'},
 {'photos':[10],'part':'상단K-factor 설명 일부','reason':'문제 원문 없이 해설 일부만 보여 기존K-factor 문항에2019회차를 임의 연결하지 않음'},
 {'photos':[12],'part':'상단 과전류계전기Tap 해설 일부','reason':'완전한 문제·조건 없이 설명 일부만 있어 미등록'},
 {'photos':[14],'part':'상단 철탑 기초 종류 설명','reason':'질문·인쇄 답안 전체가 없어 별도 문제를 생성하지 않음'},
 {'photos':[15],'part':'하단 다음 문제6 일부','reason':'질문·답안이 잘림'},
 {'photos':[16],'part':'하단 진상콘덴서 접속뱅크 문제8','reason':'문제 문장 일부만 보이고 필수 결선도와 세부 질문·답안이 없어 미등록'},
 {'photos':[17],'part':'옆 페이지의 거리 표 등','reason':'원문 질문·조건이 없어 미등록'}
]
report={'file':'Book 7.xlsx','date':checked,'workbookSha256':hashlib.sha256(args.workbook.read_bytes()).hexdigest(),'images':inventory,
 'newIds':[q['id'] for q in new],'newCount':len(new),'reusedIds':reused,'sharedCount':len(reused),'totalKnown':len(bank),'activeCount':len(bank)-len(retired),
 'newByExam':{e+'회':c for e,c in counts.items()},'excluded':excluded,
 'limits':['질문·인쇄 답안이 온전한 부분만 반영;잘린 인접 문항을 기존 지식으로 보충하지 않음','2019-1 승강기 굵기·철거손실률 및2019-4 기호 문항은 질문·답안이 온전하지만 원문 번호는 확정하지 않음','현행 규정 전문이나 공식 채점표 인증 아님','이전 출제 제외24개를 다시 활성화하지 않음']}
write('sources/book7-import-report.json',report)
print(f'Book7:{len(new)} new IDs, {len(reused)} shared IDs; active {report["activeCount"]}, known {len(bank)}')
