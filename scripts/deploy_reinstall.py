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
PASSWORD = env['ONES_PASSWORD']
TEAM_UUID = env.get('ONES_TEAM_UUID', '7xrUyuCf')
ORG_UUID = env.get('ONES_ORG_UUID', 'MVUtevnf')
OPK_FILE = 'BI仪表盘.opk'

s = requests.Session()

# 1. 登录
print('[1/4] 登录...')
r = s.post(f'{BASE_URL}/project/api/project/auth/login',
    json={'email': EMAIL, 'password': PASSWORD})
token = r.headers.get('Ones-Auth-Token', '')
if not token:
    print('登录失败:', r.text[:200])
    sys.exit(1)
print('  OK')

# 2. 查询已安装的 BI 插件实例
print('[2/4] 查询已安装插件...')
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/manager',
    headers={
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    }, json={})
plugins = r.json().get('data', [])
bi_instance = None
for p in plugins:
    svc = p.get('service', {})
    app_id = svc.get('app_id', '')
    if 'j4BsRG9J' in app_id or 'bi_dash' in app_id:
        bi_instance = svc
        print(f'  Found: app_id={app_id}, instance_id={svc.get("instance_id")}, status={svc.get("status")}, version={svc.get("version")}')

# 3. 卸载旧实例（如果存在）
if bi_instance:
    instance_id = bi_instance.get('instance_id')
    print(f'[3/4] 卸载旧实例 {instance_id}...')
    r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/delete',
        headers={
            'Content-Type': 'application/json;charset=UTF-8',
            'Ones-Check-Id': TEAM_UUID,
            'Ones-Check-Point': 'team',
            'Ones-Plugin-Id': 'built_in_apis',
            'Ones-Auth-Token': token,
        },
        json={'instance_uuid': instance_id})
    print(f'  delete: {r.text[:200]}')
else:
    print('[3/4] 无旧实例需要卸载')

# 4. 上传 + 安装
print('[4/4] 上传并安装...')
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
print(f'  upload: {json.dumps(upload_resp, ensure_ascii=False)[:300]}')

data = upload_resp.get('data', {})
instance_uuid = data.get('instance_uuid', '')
new_version = data.get('new_version', '')
if not instance_uuid:
    print('上传失败')
    sys.exit(1)
print(f'  instance: {instance_uuid}, version: {new_version}')

# 安装
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/install',
    headers={
        'Content-Type': 'application/json;charset=UTF-8',
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    },
    json={'instance_uuid': instance_uuid})
print(f'  install: {r.text[:300]}')
try:
    d = r.json()
    if d.get('data'):
        print('  安装成功!')
    else:
        print('  尝试 upgrade...')
        r2 = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/upgrade',
            headers={
                'Content-Type': 'application/json;charset=UTF-8',
                'Ones-Check-Id': TEAM_UUID,
                'Ones-Check-Point': 'team',
                'Ones-Plugin-Id': 'built_in_apis',
                'Ones-Auth-Token': token,
            },
            json={'instance_uuid': instance_uuid})
        print(f'  upgrade: {r2.text[:300]}')
except Exception as e:
    print(f'  异常: {e}')

print('\n=== 完成 ===')
