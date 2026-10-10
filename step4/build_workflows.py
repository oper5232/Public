import json
from pathlib import Path
import uuid
OUT = Path(__file__).parent / 'workflows'

def node(name, typ, parameters, x, y, v=1):
    return {'id': str(uuid.uuid4()), 'name': name, 'type': 'n8n-nodes-base.'+typ, 'typeVersion': v, 'parameters': parameters, 'position': [x,y]}
def request(name, path, body, x,y):
    n = node(name, 'httpRequest', {'method': 'POST', 'url': 'http://pipeline:8787'+path,
        'authentication': 'genericCredentialType', 'genericAuthType': 'httpHeaderAuth',
        'sendBody': True, 'specifyBody': 'json', 'jsonBody': body, 'options': {'timeout': 60000}}, x,y,4.2)
    n['credentials'] = {'httpHeaderAuth': {'id': 'CONFIGURE_PIPELINE_CREDENTIAL', 'name': 'Career Pipeline Header Auth'}}
    return n

def write(name,nodes,links):
    connections={}
    for a,b in links:
        connections[a]={'main':[[{'node': b,'type':'main','index':0}]]}
    doc={'name':name,'nodes':nodes,'connections':connections,'active':False,
         'settings':{'executionOrder':'v1','timezone':'Asia/Seoul','saveDataErrorExecution':'all','saveDataSuccessExecution':'none'}, 'pinData':{}}
    (OUT/(name+'.json')).write_text(json.dumps(doc,ensure_ascii=False,indent=2))

manual = node('01 공고 직접 입력 · 인증', 'webhook', {'httpMethod':'POST','path':'career-candidates','authentication':'headerAuth','responseMode':'responseNode','options':{}},0,0,2)
manual['webhookId'] = str(uuid.uuid4())
manual['credentials'] = {'httpHeaderAuth': {'id':'CONFIGURE_INTAKE_CREDENTIAL','name':'Career Intake Header Auth'}}
intake=request('02 입력 검증·정규화·중복·후보 기록', '/intake', '={{ JSON.stringify($json.body) }}',260,0)
sync=request('03 Notion 후보 동기화·오류 기록','/sync','={}',520,0)
reply=node('04 접수 결과 반환 · 승인 대기','respondToWebhook',{'respondWith':'json','responseBody':'={{ JSON.stringify({ intake: $("02 입력 검증·정규화·중복·후보 기록").first().json, sync: $json }) }}','options':{}},780,0,1.4)
write('STEP4_Manual_Candidate_Intake',[manual,intake,sync,reply],[(manual['name'],intake['name']),(intake['name'],sync['name']),(sync['name'],reply['name'])])
trigger=node('01 매일 08시·20시 서울','scheduleTrigger',{'rule':{'interval':[{'field':'cronExpression','expression':'0 8,20 * * *'}]}},0,0,1.2)
run=request('02 입력함 처리·중복검사·후보 동기화','/scheduled','={}',260,0)
write('STEP4_Scheduled_Candidate_Intake',[trigger,run],[(trigger['name'],run['name'])])
