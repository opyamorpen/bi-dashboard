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

# 登录
r = s.post(f'{BASE_URL}/project/api/project/auth/login',
    json={'email': EMAIL, 'password': PASS})
token = r.headers.get('Ones-Auth-Token', '')
print(f'Login: {"OK" if token else "FAIL"}')

# 检查当前插件列表
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/list',
    headers={
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    }, json={})
plugins = r.json().get('data', [])
print(f'\nPlugins: {len(plugins)}')
for p in plugins:
    svc = p.get('service', {})
    app_id = svc.get('app_id', '')
    name = svc.get('name', '')
    instance_id = svc.get('instance_id', '')
    status = svc.get('status', '')
    if 'j4Bs' in app_id or 'bi' in name.lower():
        print(f'  ** app_id={app_id}, name={name}, instance={instance_id}, status={status}')

# 等待5秒
print('\nWaiting 5s...')
time.sleep(5)

# 重新尝试上传
print('Upload attempt...')
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
print(f'  {r.text[:300]}')
