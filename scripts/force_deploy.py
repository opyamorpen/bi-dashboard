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
OLD_INSTANCE = 'nnXPqJ8Z'

s = requests.Session()

# 登录
r = s.post(f'{BASE_URL}/project/api/project/auth/login',
    json={'email': EMAIL, 'password': PASS})
token = r.headers.get('Ones-Auth-Token', '')
print(f'Login: {"OK" if token else "FAIL"}')

headers = {
    'Content-Type': 'application/json;charset=UTF-8',
    'Ones-Check-Id': TEAM_UUID,
    'Ones-Check-Point': 'team',
    'Ones-Plugin-Id': 'built_in_apis',
    'Ones-Auth-Token': token,
}

# 1. Disable 旧实例
print(f'\n[1] Disable old instance {OLD_INSTANCE}...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/disable',
    headers=headers, json={'instance_uuid': OLD_INSTANCE})
print(f'  disable: {r.text[:200]}')
time.sleep(2)

# 2. Delete 旧实例
print(f'\n[2] Delete old instance {OLD_INSTANCE}...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/delete',
    headers=headers, json={'instance_uuid': OLD_INSTANCE})
print(f'  delete: {r.text[:200]}')
time.sleep(3)

# 3. 检查插件列表
print(f'\n[3] Check plugin list...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/list',
    headers=headers, json={})
plugins = r.json().get('data', [])
print(f'  Total: {len(plugins)} plugins')
for p in plugins:
    svc = p.get('service', {})
    app_id = svc.get('app_id', '')
    name = svc.get('name', '')
    instance_id = svc.get('instance_id', '')
    status = svc.get('status', '')
    if '8SHK4cQv' in app_id or 'j4Bs' in app_id or 'bi' in name.lower():
        print(f'  ** app_id={app_id}, name={name}, instance={instance_id}, status={status}')

# 4. 如果新实例不在列表中，尝试 enable 它
NEW_INSTANCE = 'qzL2wL5a'
found_new = False
for p in plugins:
    svc = p.get('service', {})
    if '8SHK4cQv' in svc.get('app_id', ''):
        found_new = True

if not found_new:
    print(f'\n[4] New instance not in list, try enable {NEW_INSTANCE}...')
    r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/enable',
        headers=headers, json={'instance_uuid': NEW_INSTANCE})
    print(f'  enable: {r.text[:200]}')
    time.sleep(3)
    
    # 再次检查
    r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/list',
        headers=headers, json={})
    plugins = r.json().get('data', [])
    print(f'  Total: {len(plugins)} plugins')
    for p in plugins:
        svc = p.get('service', {})
        app_id = svc.get('app_id', '')
        name = svc.get('name', '')
        instance_id = svc.get('instance_id', '')
        status = svc.get('status', '')
        if '8SHK4cQv' in app_id or 'j4Bs' in app_id or 'bi' in name.lower():
            print(f'  ** app_id={app_id}, name={name}, instance={instance_id}, status={status}')

# 5. 测试 BI API
print(f'\n[5] Test BI API...')
r = requests.get(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/bi/dashboards',
    headers={'Ones-Check-Id': TEAM_UUID, 'Ones-Check-Point': 'team'})
print(f'  BI API: {r.status_code} {r.text[:100]}')

# 6. 测试新实例前端文件
print(f'\n[6] Test new instance static files...')
for path in ['logo.svg', 'modules/bi-dashboard-app/index.html', 'bi-dashboard-list.7f6d4c.js']:
    r = requests.get(f'{BASE_URL}/plugin/{ORG_UUID}/{TEAM_UUID}/dev_8SHK4cQv/0.1.0/{path}')
    print(f'  {path}: {r.status_code}')
