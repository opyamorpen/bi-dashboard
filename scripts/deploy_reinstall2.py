import requests, json, sys, os

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
OLD_INSTANCE = 'nnXPqJ8Z'

s = requests.Session()

# 1. 登录
print('[1/5] Login...')
r = s.post(f'{BASE_URL}/project/api/project/auth/login',
    json={'email': EMAIL, 'password': PASS})
token = r.headers.get('Ones-Auth-Token', '')
if not token:
    print('FAIL')
    sys.exit(1)
print('  OK')

# 2. 卸载旧实例
print(f'[2/5] Delete old instance {OLD_INSTANCE}...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/delete',
    headers={
        'Content-Type': 'application/json;charset=UTF-8',
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    },
    json={'instance_uuid': OLD_INSTANCE})
print(f'  {r.text[:200]}')

# 3. 上传 OPK
print('[3/5] Upload OPK...')
with open(OPK_FILE, 'rb') as f:
    r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/upload_opk',
        headers={
            'Ones-Check-Id': TEAM_UUID,
            'Ones-Check-Point': 'team',
            'Ones-Plugin-Id': 'built_in_apis',
            'Ones-Auth-Token': token,
        },
        files={'file': (OPK_FILE, f, 'application/octet-stream')},
        data={'organization_uuid': ORG_UUID},
        timeout=60)
upload_resp = r.json()
print(f'  {json.dumps(upload_resp, ensure_ascii=False)[:300]}')

data = upload_resp.get('data', {})
instance_uuid = data.get('instance_uuid', '')
new_version = data.get('new_version', '')
if not instance_uuid:
    print('Upload FAILED')
    sys.exit(1)
print(f'  instance: {instance_uuid}, version: {new_version}')

# 4. 安装
print('[4/5] Install...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/install',
    headers={
        'Content-Type': 'application/json;charset=UTF-8',
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    },
    json={'instance_uuid': instance_uuid})
print(f'  {r.text[:300]}')

try:
    d = r.json()
    if d.get('data'):
        print('  Install OK!')
    else:
        print('  Trying upgrade...')
        r2 = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/upgrade',
            headers={
                'Content-Type': 'application/json;charset=UTF-8',
                'Ones-Check-Id': TEAM_UUID,
                'Ones-Check-Point': 'team',
                'Ones-Plugin-Id': 'built_in_apis',
                'Ones-Auth-Token': token,
            },
            json={'instance_uuid': instance_uuid})
        print(f'  {r2.text[:300]}')
except Exception as e:
    print(f'  Error: {e}')

# 5. 验证
print('[5/5] Verify API...')
import time
time.sleep(3)
r = requests.get(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/bi/dashboards',
    headers={'Ones-Check-Id': TEAM_UUID, 'Ones-Check-Point': 'team'})
print(f'  BI API: {r.status_code} {r.text[:100]}')

# 验证 logo.svg
r2 = requests.get(f'{BASE_URL}/plugin/{ORG_UUID}/{TEAM_UUID}/dev_j4BsRG9J/0.1.0/logo.svg')
print(f'  logo.svg: {r2.status_code}')

# 验证 JS 文件
r3 = requests.get(f'{BASE_URL}/plugin/{ORG_UUID}/{TEAM_UUID}/dev_j4BsRG9J/0.1.0/bi-dashboard-list.7f6d4c.js')
print(f'  JS file: {r3.status_code}')

print('\n=== Done ===')
