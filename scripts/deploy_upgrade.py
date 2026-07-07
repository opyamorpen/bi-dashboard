import requests, json, sys, os, time

env = {}
with open('scripts/.env') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k] = v

BASE_URL = 'https://demo688.ones.pro'
EMAIL = env['ONES_EMAIL']
PASS = env.get('ONES_PASSWORD', '')
TEAM_UUID = env.get('ONES_TEAM_UUID', '7xrUyuCf')
ORG_UUID = env.get('ONES_ORG_UUID', 'MVUtevnf')
OPK_FILE = 'BI仪表盘.opk'

s = requests.Session()

# 1. 登录
print('[1/4] Login...')
r = s.post(f'{BASE_URL}/project/api/project/auth/login',
    json={'email': EMAIL, 'password': PASS})
token = r.headers.get('Ones-Auth-Token', '')
print(f'  {"OK" if token else "FAIL"}')

headers = {
    'Ones-Check-Id': TEAM_UUID,
    'Ones-Check-Point': 'team',
    'Ones-Plugin-Id': 'built_in_apis',
    'Ones-Auth-Token': token,
}

# 2. 上传 OPK (升级)
print('[2/4] Upload OPK (upgrade)...')
with open(OPK_FILE, 'rb') as f:
    r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/upload_opk',
        headers=headers,
        files={'file': (OPK_FILE, f, 'application/octet-stream')},
        data={'organization_uuid': ORG_UUID},
        timeout=60)
upload_resp = r.json()
print(f'  {json.dumps(upload_resp, ensure_ascii=False)[:300]}')

data = upload_resp.get('data', {})
instance_uuid = data.get('instance_uuid', '')
if not instance_uuid:
    print('Upload FAILED')
    sys.exit(1)
print(f'  instance: {instance_uuid}')

# 3. 升级
print('[3/4] Upgrade...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/upgrade',
    headers={**headers, 'Content-Type': 'application/json;charset=UTF-8'},
    json={'instance_uuid': instance_uuid})
print(f'  {r.text[:300]}')

# 4. 等待并验证
print('[4/4] Wait 5s and verify...')
time.sleep(5)

# 测试 createDashboard
r = requests.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/bi/dashboard',
    headers={'Ones-Check-Id': TEAM_UUID, 'Ones-Check-Point': 'team', 'Content-Type': 'application/json'},
    json={'name': '升级后测试'})
print(f'  createDashboard: {r.status_code} {r.text[:200]}')

# 测试 listDashboards
r = requests.get(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/bi/dashboards',
    headers={'Ones-Check-Id': TEAM_UUID, 'Ones-Check-Point': 'team'})
print(f'  listDashboards: {r.status_code} {r.text[:200]}')

print('\n=== Done ===')
