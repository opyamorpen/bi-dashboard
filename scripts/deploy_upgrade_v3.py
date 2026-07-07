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

# 1. Login
r = s.post(f'{BASE_URL}/project/api/project/auth/login', json={'email': EMAIL, 'password': PASS})
token = r.headers.get('Ones-Auth-Token', '')
print(f'[1] Login: {"OK" if token else "FAIL"}')

headers = {
    'Ones-Check-Id': TEAM_UUID,
    'Ones-Check-Point': 'team',
    'Ones-Plugin-Id': 'built_in_apis',
    'Ones-Auth-Token': token,
}

# 2. Upload OPK
print('[2] Upload OPK...')
with open(OPK_FILE, 'rb') as f:
    r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/upload_opk',
        headers=headers,
        files={'file': (OPK_FILE, f, 'application/octet-stream')},
        data={'organization_uuid': ORG_UUID},
        timeout=60)
data = r.json().get('data', {})
instance_uuid = data.get('instance_uuid', '')
print(f'  instance: {instance_uuid}, is_upgrade: {data.get("is_upgrade")}, new_version: {data.get("new_version")}')

# 3. Upgrade
print('[3] Upgrade...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/upgrade',
    headers={**headers, 'Content-Type': 'application/json;charset=UTF-8'},
    json={'instance_uuid': instance_uuid})
print(f'  {r.text[:100]}')

# 4. Wait + Enable
time.sleep(3)
print('[4] Enable...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/enable',
    headers={**headers, 'Content-Type': 'application/json;charset=UTF-8'},
    json={'instance_uuid': instance_uuid})
print(f'  {r.text[:100]}')
time.sleep(5)

# 5. Verify API
print('[5] Verify...')
r = requests.get(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/bi/dashboards',
    headers={'Ones-Check-Id': TEAM_UUID, 'Ones-Check-Point': 'team'})
print(f'  API: {r.status_code}')

# 6. Verify JS file
import re
r = requests.get(f'{BASE_URL}/plugin/{ORG_UUID}/{TEAM_UUID}/dev_8SHK4cQv/0.1.2/modules/bi-dashboard-app/index.html')
print(f'  index.html: {r.status_code}')
js_match = re.search(r'src="([^"]+\.js)"', r.text)
if js_match:
    js_name = js_match.group(1).split('/')[-1]
    r2 = requests.get(f'{BASE_URL}/plugin/{ORG_UUID}/{TEAM_UUID}/dev_8SHK4cQv/0.1.2/{js_name}')
    print(f'  JS ({js_name}): {r2.status_code}')

print('\nDone')
