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
print('[1/5] Login...')
r = s.post(f'{BASE_URL}/project/api/project/auth/login',
    json={'email': EMAIL, 'password': PASS})
token = r.headers.get('Ones-Auth-Token', '')
print(f'  {"OK" if token else "FAIL"}')

# 2. 上传 OPK (新 app_id, 不会冲突)
print('[2/5] Upload OPK...')
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

# 3. 安装
print('[3/5] Install...')
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

# 4. 等待启动
print('[4/5] Wait for startup (5s)...')
time.sleep(5)

# 5. 验证
print('[5/5] Verify...')
# 查找新实例
r = s.post(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/plugin/list',
    headers={
        'Ones-Check-Id': TEAM_UUID,
        'Ones-Check-Point': 'team',
        'Ones-Plugin-Id': 'built_in_apis',
        'Ones-Auth-Token': token,
    }, json={})
plugins = r.json().get('data', [])
for p in plugins:
    svc = p.get('service', {})
    app_id = svc.get('app_id', '')
    if '8SHK4cQv' in app_id or 'bi' in svc.get('name', '').lower():
        print(f'  Plugin: app_id={app_id}, instance={svc.get("instance_id")}, status={svc.get("status")}, version={svc.get("version")}')

# 验证 API
r = requests.get(f'{BASE_URL}/project/api/project/team/{TEAM_UUID}/bi/dashboards',
    headers={'Ones-Check-Id': TEAM_UUID, 'Ones-Check-Point': 'team'})
print(f'  BI API: {r.status_code} {r.text[:100]}')

# 验证静态文件
r2 = requests.get(f'{BASE_URL}/plugin/{ORG_UUID}/{TEAM_UUID}/dev_8SHK4cQv/0.1.0/logo.svg')
print(f'  logo.svg: {r2.status_code}')

r3 = requests.get(f'{BASE_URL}/plugin/{ORG_UUID}/{TEAM_UUID}/dev_8SHK4cQv/0.1.0/modules/bi-dashboard-app/index.html')
print(f'  index.html: {r3.status_code}')

# 从 index.html 提取 JS 文件名并验证
import re
js_match = re.search(r'src="([^"]+\.js)"', r3.text)
if js_match:
    js_path = js_match.group(1)
    # 解析相对路径
    js_url = f'{BASE_URL}/plugin/{ORG_UUID}/{TEAM_UUID}/dev_8SHK4cQv/0.1.0/{js_path.replace("../../","")}'
    r4 = requests.get(js_url)
    print(f'  JS ({js_path.split("/")[-1]}): {r4.status_code}')

print('\n=== Done ===')
