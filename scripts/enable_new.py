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
NEW_INSTANCE = 'qzL2wL5a'

s = requests.Session()

# 登录
r = s.post(f'{BASE_URL}/project/api/project/auth/login',
    json={'email': EMAIL, 'password': PASS})
token = r.headers.get('Ones-Auth-Token', '')
print(f'Login: {"OK" if token else "FAIL"}')

# 尝试 enable 新实例
print(f'\nEnable instance {NEW_INSTANCE}...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/enable',
    headers={
        'Content-Type': 'application/json;charset=UTF-8',
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    },
    json={'instance_uuid': NEW_INSTANCE})
print(f'  enable: {r.text[:300]}')

time.sleep(3)

# 再次检查插件列表
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
    if '8SHK4cQv' in app_id or 'j4BsRG9J' in app_id or 'bi' in name.lower():
        print(f'  ** app_id={app_id}, name={name}, instance={instance_id}, status={status}')

# 也检查 plugin/manager
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/manager',
    headers={
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    }, json={})
plugins2 = r.json().get('data', [])
print(f'\nmanager: {len(plugins2)} plugins')
for p in plugins2:
    svc = p.get('service', {})
    app_id = svc.get('app_id', '')
    if '8SHK4cQv' in app_id or 'j4Bs' in app_id:
        print(f'  ** app_id={app_id}, name={svc.get("name")}, instance={svc.get("instance_id")}, status={svc.get("status")}')
