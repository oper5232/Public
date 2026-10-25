"""Reviewed transcription of complete questions in Book 6.xlsx (2020).

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
checked='2026-10-25'
notice='2020년 기출 수록 교재의 제공 사진·인쇄 답안을 대조했습니다. 현행 KEC·KS·품셈 전문 전체 검증은 아닙니다.'
def add(exam,number,photos,category,question,options,explain,prompt=None,fields=None,kind='short',diagram=None,original=None,note=None):
    counts[exam]=counts.get(exam,0)+1;qid=f'ec-{exam}-book6-{counts[exam]:03d}';year,round_=map(int,exam.split('-'));exam+='회';sid='book6-'+qid
    q={'id':qid,'year':exam,'examYear':year,'round':round_,'category':category,'question':question,'options':options,'correct':0,'explain':explain,'diagram':diagram,'caution':True,
       'originalQuestion':original or prompt or question,'source':{'file':'Book 6.xlsx','exam':exam,'originalTextAvailable':True,'kind':'user-provided-question-photo','questionNumber':number,'photos':[f'image{i}.png' for i in photos],'transcription':'sources/book6-import-report.json'},
       'verification':{'status':'source-photo-checked','checkedAt':checked,'notes':[notice]+([note] if note else [])}}
    p={'kind':kind,'prompt':prompt or question,'basisAnswer':options[0],'fields':[{'label':k,'answer':v} for k,v in (fields or [('답안',options[0])])],
       'source':{'id':sid,'kind':'user-question-photo','exam':exam,'received':checked},'notes':[note] if note else []}
    new.append(q);practical[qid]=p
    sections.append({'id':sid,'exam':exam,'questionIds':[qid],'excerpt':q['originalQuestion']+'\n인쇄 답안: '+'\n'.join(f['label']+': '+f['answer'] for f in p['fields']),
                     'editorialNote':'Book 6.xlsx 문제'+str(number)+' / '+', '.join(q['source']['photos'])+' / '+(note or notice)})
    return qid
def share(qid,exam,number,photos,excerpt,**variant):
    exam+='회';sid='book6-shared-'+qid;q=next(q for q in bank if q['id']==qid)
    a={'exam':exam,'sourceId':sid,'file':'Book 6.xlsx','questionNumber':number,'photos':[f'image{i}.png' for i in photos],
       'note':'Book6의2020년 교재 문제·답안과 대조했습니다. 같은 ID의 누적 기록을 공유합니다.',
       'explain':'2020년 제공 교재의 인쇄 답안 대조: '+excerpt,
       'verification':{'status':'source-photo-checked','checkedAt':checked,'notes':[notice,'이 회차의 출처:Book 6.xlsx 문제'+str(number)]},**variant}
    q['appearances']=[v for v in q.get('appearances',[]) if v.get('sourceId')!=sid]+[a];reused.append(qid)
    sections.append({'id':sid,'exam':exam,'questionIds':[qid],'excerpt':excerpt,'editorialNote':'Book 6.xlsx 문제'+str(number)+' / '+', '.join(a['photos'])+' / '+notice})

# 2020-4: original problems 2,5,6,7,14,15.
add('2020-4',2,[1],'조명·기호','그림의 삼각형을 집합한 기호와 숫자10의 뜻으로 옳은 것은?',
    ['리모콘 릴레이·릴레이10개를 집합 설치','전력퓨즈·정격10A','누전차단기·감도10mA','접지단자·저항10Ω'],
    '인쇄 답안은 리모콘 릴레이이며,10은 리모콘 릴레이10개를 집합하여 시설한다는 뜻입니다. 정격전류나 전압값을 뜻하지 않습니다.',
    prompt='그림기호의 명칭과 숫자10이 나타내는 뜻을 쓰시오.',fields=[('명칭','리모콘 릴레이'),('숫자10의 의미','리모콘 릴레이10개를 집합하여 시설')],diagram='book6RemoteRelay')
for label,formula,wrong,explain in [
 ('수용률','최대수용전력 / 총 부하설비용량 ×100%',['총 부하설비용량 / 최대수용전력 ×100%','평균수용전력 / 합성최대수용전력 ×100%','개별 최대수용전력의 합 / 합성최대수용전력'], '분자는 최대수용전력, 분모는 총 부하설비용량입니다.'),
 ('부등률','개별 최대수용전력의 합 / 합성최대수용전력',['합성최대수용전력 / 개별 최대수용전력의 합','평균수용전력 / 합성최대수용전력 ×100%','최대수용전력 / 총 부하설비용량 ×100%'],'각 수용가의 최대수용전력을 더한 값과 동시 합성최대수용전력을 비교합니다. 비율로 표시하며 이 식에는×100%를 붙이지 않습니다.'),
 ('부하율','평균수용전력 / 합성최대수용전력 ×100%',['합성최대수용전력 / 평균수용전력 ×100%','최대수용전력 / 총 부하설비용량 ×100%','개별 최대수용전력의 합 / 합성최대수용전력'],'분자는 평균수용전력, 분모는 제시된 기간의 합성최대수용전력입니다.')]:
    add('2020-4',5,[2],'부하·적산',f'수변전설비 용량 추정에 사용하는 {label}의 식은?',[formula]+wrong,explain,
        prompt=f'수변전설비 용량을 추정하는 {label}의 공식을 쓰시오.',fields=[(label,formula)],original='수변전설비 용량을 추정하는 수용률, 부등률, 부하율을 구하는 공식을 각각 쓰시오.')
add('2020-4',6,[3,4],'접지·서지','제공 교재에서 서지 과전압의 발생 원인 세 분류를 나열한 것은?',
    ['개폐 과전압·뇌 과전압·일시 과전압','접촉저항·도체길이·전선색상','주파수저하·조도저하·역률개선','전압강하·평균부하·수용률'],
    '인쇄 답안은 개폐 과전압,뇌 과전압,일시 과전압입니다. 교재는 개폐의 예로 차단기 동작·고장,뇌 과전압의 예로 직격뢰·역섬락·유도뢰,일시 과전압의 예로 페란티효과·철공진·급격한 부하변화를 설명합니다.',
    prompt='전력계통에서 서지현상에 의해 발생하는 과전압의 원인을 교재의 세 분류로 쓰시오.',fields=[('세 분류','개폐 과전압, 뇌 과전압, 일시 과전압')])
add('2020-4',7,[3,4],'수전·보호','계전기·기구번호88Q의 명칭은?',
    ['유압 펌프용 개폐기','공기 압축기용 개폐기','팬용 개폐기','진공 펌프용 개폐기'],
    '사진의 인쇄 답안은 유압 펌프용 개폐기입니다. 같은88계열이라도88A는 공기압축기,88F는 팬,88V는 진공펌프용으로 구분합니다.',
    prompt='기구번호88Q의 명칭을 쓰시오.',fields=[('88Q','유압 펌프용 개폐기')])
add('2020-4',14,[5,6],'조명·기호','천장과 벽면의 경계 구석에 등기구를 설치하여 천장과 벽면을 동시에 투사하는 건축화 조명은?',
    ['코너 조명','코브 조명','코니스 조명','광천장 조명'],
    '제공 인쇄 답안은①광천장 조명,②코너 조명,③코퍼 조명입니다.②의 천장과 벽면을 동시에 투사하는 방식은 코너 조명이며,코브 조명이나 코니스 조명으로 바꾸지 않습니다.',
    prompt='건축화 조명방식의 명칭을 쓰시오.①천장면의 확산투과재 뒤에 광원을 배치하는 방식,②천장·벽 경계 구석의 등기구가 두 면을 동시에 투사하는 방식,③천장을 사각·원 등으로 오려 다양한 매입기구를 취부하는 방식.',
    fields=[('①','광천장 조명'),('②','코너 조명'),('③','코퍼 조명')])
for part,name,figure,wrong,explain in [
 (1,'바닥 부착50A 콘센트','book6Floor50',['천장 부착15A 콘센트','벽 부착 의료용 콘센트','천장 부착 접지단자 붙이 콘센트'],'아래 삼각형은 바닥 부착을,50A는 정격전류를 나타냅니다.'),
 (2,'벽 부착 의료용 콘센트','book6Medical',['바닥 부착50A 콘센트','천장 부착 접지단자 붙이 콘센트','일반 스위치'],'왼쪽 반쪽의 채움과 H 표기를 인쇄된 심벌과 대조합니다.'),
 (3,'천장 부착 접지단자 붙이 콘센트','book6EarthSocket',['바닥 부착50A 콘센트','벽 부착 의료용 콘센트','리모콘 릴레이'],'원형 콘센트 기호에 ET가 붙은 인쇄 심벌입니다.')]:
    add('2020-4',15,[6],'조명·기호',f'2020년4회 교재의 콘센트 심벌({part})이 뜻하는 것은?',[name]+wrong,explain,
        prompt='그림의 콘센트 심벌이 나타내는 설치 위치·용도 또는 정격을 쓰시오.',fields=[('심벌의 의미',name)],diagram=figure,
        original=f'다음 콘센트 심벌을 그리시오.({part}) {name}.',note='원문은 심벌 그리기 문항이며,웹앱에서는 인쇄 답안 그림을 보고 의미를 쓰는 식별형으로 변환했습니다.')
share('ec-2024-1-book4-006','2020-4',15,[6],
      '원문:다음 콘센트 심벌을 그리시오.④비상콘센트. 인쇄 답안은 사각형 안에 두 개의2구 원형 콘센트가 있는 심벌이다.',
      diagram='book6Emergency',question='2020년4회 교재의 콘센트 심벌④의 명칭은?',
      explain='2020년4회 사진의 인쇄 답안은 비상콘센트입니다. 이 회차 그림은 원 두 개 안에 각각 점 두 개가 있습니다.2024-1의 원 두 개(점2개/3개) 그림과 구분하여 해당 회차 사진대로 표시합니다.')

# 2020-3: complete main problems only. Bottom CT calculation and ACSR fragment excluded.
add('2020-3',3,[7],'송배전','애자의 전기적 특성에서 인쇄 답안에 제시된 섬락전압 두 종류는?',
    ['주수 섬락전압·건조 섬락전압','상전압·선간전압','공칭전압·정격전압','저압·고압'],
    '인쇄 답안의 두 종류는 주수 섬락전압과 건조 섬락전압입니다. 섬락은 애자 표면의 공기 경로를 통한 아크 현상으로,애자 절연체 자체가 파괴되는 관통파괴와 구별합니다.',
    prompt='애자의 전기적 특성에서 섬락전압의 종류 두 가지를 쓰시오.',fields=[('두 종류','주수 섬락전압, 건조 섬락전압')])
share('ec-2024-1-book4-001','2020-3',10,[8],
      '그림의 철탑 명칭을 쓰시오. 인쇄 답안:①사각 철탑②방형 철탑③우두형 철탑④문형 철탑⑤회전형 철탑⑥MC 철탑.',
      question='2020년3회 그림의 철탑①~⑥ 중 ④의 형태 명칭은?',diagram='book6Towers',
      explain='2020년3회 인쇄 답안은①사각②방형③우두형④문형⑤회전형⑥MC 철탑입니다.2024년1회 그림의③문형/④우두형 번호와 다릅니다. 이 회차에서는⑥MC 철탑도 함께 작성합니다.',
      practical={'kind':'short','prompt':'2020년3회 그림의 철탑①~⑥의 형태에 따른 명칭을 쓰시오.',
                 'fields':[{'label':'①②③④⑤⑥'[i-1],'answer':name+' 철탑'} for i,name in enumerate(['사각','방형','우두형','문형','회전형','MC'],1)],
                 'notes':['2020년3회 그림의 번호를 기준으로 작성하세요.기존 회차와 번호·항목 수가 다르므로 이 회차의 그림에 맞춰 쓰세요.']})
share('q061','2020-3',7,[9],'피뢰기의 구비조건:이상전압 침입 시 신속하게(방전)해야 하고,이상전류 통전 시 단자전압인(제한전압)은 일정 전압 이하로 억제한다.')
add('2020-3',12,[10],'수전·보호','방사상 계통의 단락보호에 적합하고,계전기 간 동작 시간차로 고장구간을 차단하는 경제적인 보호방식은?',
    ['과전류 계전방식','표시선 계전방식','비율차동 계전방식','위상비교 계전방식'],
    '인쇄 답안은 과전류 계전방식입니다. 동작 시간차를 두어 주보호와 후비보호를 함께 할 수 있으나,보호시간이 길어지는 단점이 있습니다.',
    prompt='방사상 계통의 단락보호에 적합하고 계전기 간 동작 시간차로 고장구간을 차단한다.주보호와 후비보호가 동시에 가능하여 경제적이나 보호시간이 길어지는 방식의 명칭을 쓰시오.')
add('2020-3',17,[11],'조명·기호','옥내배선 그림기호 표에서③의 짧은 파선이 뜻하는 배선은?',
    ['바닥 은폐배선','천장 은폐배선','노출배선','바닥면 노출배선'],
    '인쇄 답안은①천장 은폐배선,②노출배선,③바닥 은폐배선,④노출배선 중 바닥면 노출배선입니다. 여기서는 인쇄된 내선규정 명칭과 선 종류를 대조합니다.',
    prompt='표의 옥내배선 그림기호①~④를 보고 내선규정의 명칭을 쓰시오.',
    fields=[('① 실선','천장 은폐배선'),('② 점선','노출배선'),('③ 파선','바닥 은폐배선'),('④ 긴 선과 점 두 개','노출배선 중 바닥면 노출배선')],diagram='book6WiringLines')

# 2020-2: companion pages make PVC answers complete; repeated shots are one source.
add('2020-2',5,[12],'전기공사','전주에 시설하는 지지선 공사의 사용 자재 다섯 가지를 바르게 묶은 것은?',
    ['지지선 밴드·아연도철선·지지선 애자·지지선 커버·지지선 로드','전력퓨즈·MOF·VCB·PT·전력량계','머레이루프·펄스·음향·정전용량·수색코일','정류기·인버터·축전지·DC필터·부하'],
    '사진의 인쇄 답안 다섯 가지는 지지선 밴드,아연도철선(지지선),지지선 애자,지지선 커버,지지선 로드입니다. 교재의 추가 예에는 콘크리트 전주 버팀대,지지선 클램프,앵커도 있습니다.',
    prompt='지지선 및 전주 버팀대 공사에서 전주에 지지선을 시설할 때 사용하는 자재 다섯 가지를 쓰시오.',
    fields=[('다섯 가지','지지선 밴드, 아연도철선(지지선), 지지선 애자, 지지선 커버, 지지선 로드')])
add('2020-2',10,[13,14],'설비·배선','제공 교재의 합성수지관 삽입 깊이에서 일반 경우와 접착제 사용 경우의 관 바깥지름 배수는?',
    ['일반1.2배 이상·접착제 사용0.8배 이상','일반0.8배 이상·접착제 사용1.2배 이상','일반1.5배 이상·접착제 사용1.0배 이상','일반2.0배 이상·접착제 사용1.5배 이상'],
    '인쇄 답안은①1.2,②0.8입니다. 두 수는 관의 바깥지름에 대한 최소 삽입 깊이의 배수입니다. 접착제를 사용하는 조건을 함께 확인합니다.',
    prompt='합성수지관 상호 간 및 관과 박스의 접속에서 삽입 깊이는 관 바깥지름의(①)배 이상,접착제를 사용하는 경우에는(②)배 이상으로 한다.빈칸을 채우시오.',
    fields=[('① 일반 경우','1.2'),('② 접착제 사용','0.8')],kind='blank')
add('2020-2',11,[14,15,16],'설비·배선','후강전선관 호칭16,(①),28,(②),42,(③),70,82에서 빈칸 값은?',
    ['22·36·54','19·31·51','25·35·63','20·40·60'],
    '인쇄 답안은①22,②36,③54입니다. 제시된 후강전선관의 호칭 순서는16·22·28·36·42·54·70·82입니다. 호칭을 실제 정확한 내경/외경 값으로 단정하지 않습니다.',
    prompt='후강전선관 호칭16,(①),28,(②),42,(③),70,82의 빈칸을 채우시오.',fields=[('①','22'),('②','36'),('③','54')],kind='blank')
add('2020-2',12,[15,16],'수전·보호','구내선로의 개폐서지·순간 과도전압이2차 기기에 미치는 악영향을 막기 위해 시설하는 기기는?',
    ['서지흡수기(SA)','계기용 변류기(CT)','자동전압조정기(AVR)','주상변압기'],
    '인쇄 답안은 서지흡수기(SA)입니다. 기존q118은 이 기기의 목적,q119는 설치 위치를 묻습니다. 이 문항은 설명에 맞는 기기의 명칭을 구분합니다.',
    prompt='구내선로에서 발생할 수 있는 개폐서지·순간 과도전압 등 이상전압이2차 기기에 악영향을 주는 것을 막기 위해 시설하는 기기의 명칭을 쓰시오.')
add('2020-2',14,[17,18],'전기공사','COS 설치에 사용하는 자재 다섯 가지를 바르게 나열한 것은?',
    ['COS·브라켓·내오손 결합애자·COS 커버·퓨즈링크','LBS·MOF·PT·CT·전력량계','지지선 밴드·로드·앵커·커버·아연도철선','절연변압기·수중등·금속관·메거·접지극'],
    '제공 인쇄 답안은 COS,브라켓,내오손 결합애자,COS 커버,퓨즈링크입니다. 부품 명칭은 사진의 인쇄 표기를 따릅니다.',
    prompt='COS 자체를 포함하여 COS 설치에 사용하는 자재 다섯 가지를 쓰시오.',fields=[('다섯 가지','COS, 브라켓, 내오손 결합애자, COS 커버, 퓨즈링크')])
add('2020-2',15,[18],'접지·서지','교재에서1선 지락 시 건전상 전압이 선간전압의75% 이하가 되도록 한 접지계통의 명칭은?',
    ['유효접지계','비접지계','공진접지계','절연감시계통'],
    '인쇄 답안은 유효접지계입니다. 교재는 건전상 전위 상승을 정상 상전압의 약1.3배 이내로 억제하는 접지로 설명합니다.문제의75%는 선간전압 기준,1.3배는 정상 상전압 기준이므로 기준 전압을 혼동하지 않습니다.',
    prompt='발전기·변압기 등 전력계통의 중성점을 접지하여 보호계전기의 고장점 판별을 돕고,1선 지락 시 건전상 전압을 선간전압의75% 이하가 되도록 하는 교재 설명의 접지계통 명칭을 쓰시오.',fields=[('명칭','유효접지계(유효접지 방식)')])
for qid,ex in [('q075','전선 할증:옥외5%,옥내10%'),('q076','케이블 할증:옥외3%,옥내5%'),('q141','전선관 할증:옥외5%,옥내10%(인쇄 표 및 해설표)')]:
    share(qid,'2020-2',16,[19],ex+'\n원문 표의5개 빈칸:옥외전선5,옥내전선10,옥외케이블3,옥내케이블5,옥내전선관10[%]. 철거손실률과는 다르다.')

# 2020-1: main problems complete; cropped glare/TN/catenary/calculations excluded.
add('2020-1',1,[20],'수전·보호','LBS의 설치 목적 두 가지로 인쇄 답안에 제시된 것은?',
    ['부하개폐·전력퓨즈와 사용 시 결상방지','무전류 상태의 격리만·항상 단락차단','전압계측·전류계측','직류변환·역률계측'],
    '인쇄 답안은 부하개폐,전력퓨즈와 함께 사용하는 경우의 결상방지입니다.결상방지는 원문에 있는 전력퓨즈 조합 조건을 유지하며,LBS 단독으로 모든 단락보호를 수행한다는 뜻으로 바꾸지 않습니다.',
    prompt='LBS(Load Breaker Switch)의 설치 목적 두 가지를 쓰시오.',fields=[('목적 두 가지','부하개폐, 전력퓨즈와 사용 시 결상방지')])
add('2020-1',3,[21],'수전·보호','SCADA의 기능으로 적절한 세 가지를 묶은 것은?',
    ['전력계통 자동화·변전소 무인운전·전력설비 정보 감시/계측/제공','발전기 권선절연·배전선 진동제거·역률만 조정','직접매설·관로포설·암거시공','콘센트 접속·전선관 나사내기·단자 압착'],
    '인쇄 답안은 전력계통의 자동화,변전소 무인운전,각종 전력설비의 정보 감시·계측 및 정보제공입니다.SCADA는 원격감시제어설비(Supervisory Control And Data Acquisition)입니다.',
    prompt='전력시스템에서 이용하는 SCADA의 기능 세 가지를 쓰시오.',fields=[('세 가지','전력계통의 자동화, 변전소 무인운전, 각종 전력설비의 정보 감시·계측 및 정보제공')])
add('2020-1',8,[22,23],'조명·기호','조명기구의 배광에 따른 조명방식 세 가지를 바르게 나열한 것은?',
    ['직접조명·전반확산조명·간접조명','코퍼조명·코너조명·광천장조명','유입자냉식·유입풍냉식·송유수냉식','방사상·루프·스포트네트워크'],
    '인쇄 답안의 예는 직접조명,전반확산조명,간접조명입니다.동일한 배광 분류의 해설표에는 반직접조명과 반간접조명도 있습니다.건축화 조명방식 명칭과는 분류 기준이 다릅니다.',
    prompt='조명기구의 배광에 따른 조명방식의 종류 세 가지를 쓰시오.',fields=[('세 가지 예','직접조명, 전반확산조명, 간접조명')])
add('2020-1',9,[23],'설비·배선','다음 중 제시된 버스덕트의 종류에 속하지 않는 것은?',
    ['셀룰러덕트','피더 버스덕트','플러그인 버스덕트','익스팬션 버스덕트'],
    '원문 인쇄 답안에는 피더·플러그인·트롤리·익스팬션 버스덕트가 제시됩니다.셀룰러덕트는 이 버스덕트 종류 목록에 속하지 않습니다.',
    prompt='버스덕트의 종류 세 가지를 쓰시오.',fields=[('세 가지(인쇄 예 중 선택)','피더 버스덕트, 플러그인 버스덕트, 트롤리 버스덕트, 익스팬션 버스덕트 중 서로 다른 세 가지')],
    note='객관식은 종류 구분,실기는 원문처럼 세 가지 작성입니다.모범답안의 네 예 중 서로 다른 세 가지를 비교하세요.')
add('2020-1',10,[24,25],'전기공사','교재에서 동전선의 직선접속 방법 두 가지로 제시한 것은?',
    ['가는 단선의 트위스트조인트·B형 직선맞대기용슬리브 압착접속','T형 커넥터 분기접속·S형 분기슬리브 접속','피뢰기 방전·계전기 시간차단','직접조명·간접조명'],
    '인쇄 답안은 가는 단선(6mm² 이하)의 직선접속(트위스트조인트),직선맞대기용슬리브(B형)에 의한 압착접속입니다.분기접속과 직선접속을 구별합니다.교재의 방법 분류이며 현행 현장 접속 허용조건 전체의 검증은 아닙니다.',
    prompt='교재에서 동전선의 접속 중 직선접속의 종류 두 가지를 쓰시오.',fields=[('두 가지','가는 단선(6mm² 이하)의 직선접속(트위스트조인트), 직선맞대기용슬리브(B형)에 의한 압착접속')])
add('2020-1',11,[25],'시공·감리','발전설비·중공업 설비,철탑·송전설비,송전선 활선작업에 대응하는 직종을 순서대로 나열한 것은?',
    ['플랜트전공·송전전공·송전활선전공','변전전공·플랜트전공·내선전공','배전전공·변전전공·통신전공','송전활선전공·내선전공·플랜트전공'],
    '인쇄 답안은①플랜트전공,②송전전공,③송전활선전공입니다.이번 문항은 작업 구분에 맞는 직종명이며 노무비 계산은 포함하지 않습니다.',
    prompt='작업 구분에 맞는 직종명을 쓰시오.①발전설비 및 중공업 설비의 시공·보수②철탑 및 송전설비의 시공·보수③송전전공 중 활선작업을 하는 전공.',
    fields=[('①','플랜트전공'),('②','송전전공'),('③','송전활선전공')])

newids={q['id'] for q in new};bank=[q for q in bank if q['id'] not in newids]+new
sectionids={s['id'] for s in sections};notes['sections']=[s for s in notes['sections'] if s['id'] not in sectionids]+sections
write('src/questions.json',bank);write('src/practical.json',practical);write('sources/practical-notes.json',notes)
inventory=json.loads(args.inventory.read_text())
for item in inventory:
    item['sha256']=hashlib.sha256((args.inventory.parent/item['image']).read_bytes()).hexdigest()
    item['worksheetExam']='2020-'+('4' if item['row']<25 else '3' if item['row']<49 else '2' if item['row']<73 else '1')+'회'
write('sources/book6-import-report.json',{'file':'Book 6.xlsx','date':checked,'workbookSha256':hashlib.sha256(args.workbook.read_bytes()).hexdigest(),'images':inventory,
    'newIds':[q['id'] for q in new],'newCount':len(new),'reusedIds':reused,'sharedCount':len(reused),'totalKnown':len(bank),'activeCount':len(bank)-len(read('src/retired-questions.json')),
    'excluded':[{'photos':[7],'part':'하단CT 임피던스 계산','reason':'사진 하단이 잘린 인접 계산 문항;사용자 요청으로 미등록'},
                {'photos':[9],'part':'아래쪽ACSR 문제와 위쪽변압기 해설 일부','reason':'문제/정답이 잘려 완전하지 않음'},
                {'photos':[10],'part':'위쪽 굴착량 계산 해설','reason':'문제 조건이 없음'},
                {'photos':[12],'part':'하단 지중전선로 시설방법 문제6','reason':'인쇄 답안이 하단에서 잘림;기존q010에2020출처를 임의로 추가하지 않음'},
                {'photos':[13],'part':'위쪽 조명 등수·도로조명 면적 계산','reason':'문제 원문 없음'},
                {'photos':[17,18],'part':'위쪽 축전지 계산','reason':'문제 원문 없음'},
                {'photos':[21],'part':'하단 눈부심 방지 문제4','reason':'인쇄 답안이3개 이후 잘림;기존q129에2020회차를 임의 연결하지 않음'},
                {'photos':[22],'part':'위쪽TN 접지계통 해설','reason':'질문 원문이 없음'},
                {'photos':[25],'part':'하단 전선 길이·이도 계산 문제12','reason':'조건·정답 일부 잘림 및 이전 이도 제외 요청'}],
    'variants':[{'id':'ec-2024-1-book4-001','exam':'2020-3회','reason':'③우두형·④문형·⑥MC를2020사진대로 표시;기존2024그림·정답 유지'},
                {'id':'ec-2024-1-book4-006','exam':'2020-4회','reason':'2020콘센트④는 두 원에 각각점2개;기존2024기호와 별도 도면'}],
    'limits':['완전한 문제·인쇄 정답 사진만 반영;잘린 부분을 추정해 문항 생성하지 않음','현행 규정 전문이나 공식 채점표 인증 아님','이전 출제 제외24개를 다시 활성화하지 않음']})
print(f'Book6:{len(new)} new IDs, {len(reused)} shared IDs; active {len(bank)-len(read("src/retired-questions.json"))}, known {len(bank)}')
