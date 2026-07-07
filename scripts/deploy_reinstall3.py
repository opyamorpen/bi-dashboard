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
OLD_INSTANCE = 'qzL2wL5a'

s = requests.Session()

# 1. 登录
print('[1/6] Login...')
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

# 2. Disable + Delete 旧实例
print(f'[2/6] Disable + Delete old instance {OLD_INSTANCE}...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/disable',
    headers={**headers, 'Content-Type': 'application/json;charset=UTF-8'},
    json={'instance_uuid': OLD_INSTANCE})
print(f'  disable: {r.text[:100]}')
time.sleep(2)

r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/delete',
    headers={**headers, 'Content-Type': 'application/json;charset=UTF-8'},
    json={'instance_uuid': OLD_INSTANCE})
print(f'  delete: {r.text[:100]}')
time.sleep(3)

# 3. 上传 OPK
print('[3/6] Upload OPK...')
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

# 4. Install
print('[4/6] Install...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/install',
    headers={**headers, 'Content-Type': 'application/json;charset=UTF-8'},
    json={'instance_uuid': instance_uuid})
print(f'  install: {r.text[:200]}')
time.sleep(3)

# 5. Enable
print('[5/6] Enable...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/enable',
    headers={**headers, 'Content-Type': 'application/json;charset=UTF-8'},
    json={'instance_uuid': instance_uuid})
print(f'  enable: {r.text[:100]}')
time.sleep(3)

# 6. 验证
print('[6/6] Verify...')
r = requests.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/bi/dashboard',
    headers={'Ones-Check-Id': TEAM_UUID, 'Ones-Check-Point': 'team', 'Content-Type': 'application/json'},
    json={'name': '升级后测试'})
print(f'  createDashboard: {r.status_code} {r.text[:200]}')

r = requests.get(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/bi/dashboards',
    headers={'Ones-Check-Id': TEAM_UUID, 'Ones-Check-Point': 'team'})
resp_data = r.json().get('data', {}).get('data', [])
print(f'  listDashboards: {r.status_code} (count: {len(resp_data)})')

print('\n=== Done ===')
