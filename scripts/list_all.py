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

# 查询所有插件
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/list',
    headers={
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    }, json={})
plugins = r.json().get('data', [])
print(f'Total: {len(plugins)} plugins')
for p in plugins:
    svc = p.get('service', {})
    app_id = svc.get('app_id', '')
    name = svc.get('name', '')
    instance_id = svc.get('instance_id', '')
    status = svc.get('status', '')
    version = svc.get('version', '')
    # 标记 BI 相关
    marker = ' <<<' if ('8SHK4cQv' in app_id or 'j4BsRG9J' in app_id or 'bi' in name.lower()) else ''
    print(f'  app_id={app_id}, name={name}, instance={instance_id}, status={status}, version={version}{marker}')
