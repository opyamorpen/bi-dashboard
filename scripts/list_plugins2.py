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

s = requests.Session()

# 登录
r = s.post(f'{BASE_URL}/project/api/project/auth/login',
    json={'email': EMAIL, 'password': PASS})
token = r.headers.get('Ones-Auth-Token', '')
print(f'Login: {"OK" if token else "FAIL"}')

# 用 plugin/list 查询（HAR中看到的API）
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/list',
    headers={
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    }, json={})
plugins = r.json().get('data', [])
print(f'\nplugin/list: {len(plugins)} plugins')
for p in plugins:
    svc = p.get('service', {})
    app_id = svc.get('app_id', '')
    name = svc.get('name', '')
    status = svc.get('status', '')
    instance_id = svc.get('instance_id', '')
    version = svc.get('version', '')
    scope = svc.get('scope', '')
    scope_uuid = svc.get('scope_uuid', '')
    print(f'  app_id={app_id}, name={name}, instance={instance_id}, status={status}, version={version}, scope={scope}, scope_uuid={scope_uuid}')
