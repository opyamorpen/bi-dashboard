#!/bin/bash
# BI仪表盘插件自动部署脚本
# 用法: ./scripts/deploy.sh <opk文件路径>
# 新插件用 install，已有插件用 upgrade

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

OPK_FILE="${1:-}"
if [[ -z "$OPK_FILE" ]]; then
  echo "用法: $0 <opk文件路径>"
  exit 1
fi
if [[ ! -f "$OPK_FILE" ]]; then
  echo "错误: 文件不存在: $OPK_FILE"
  exit 1
fi

BASE_URL="${ONES_BASE_URL:-https://demo688.ones.pro}"
EMAIL="${ONES_EMAIL:?请设置 ONES_EMAIL}"
PASSWORD="${ONES_PASSWORD:?请设置 ONES_PASSWORD}"
TEAM_UUID="${ONES_TEAM_UUID:-7xrUyuCf}"
ORG_UUID="${ONES_ORG_UUID:-MVUtevnf}"

echo "=== BI仪表盘插件部署 ==="
echo "环境: $BASE_URL"
echo "团队: $TEAM_UUID"
echo "文件: $OPK_FILE"
echo ""

# 1. 登录
echo "[1/3] 登录中..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/project/api/project/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c /tmp/ones_cookies_bi.txt -D /tmp/ones_headers_bi.txt)

TOKEN=$(grep -i 'Ones-Auth-Token' /tmp/ones_headers_bi.txt | sed 's/.*: //' | tr -d '\r\n')
if [[ -z "$TOKEN" ]]; then
  echo "错误: 登录失败，未获取到 token"
  echo "$LOGIN_RESP" | head -5
  exit 1
fi
echo "  ✓ 登录成功"

# 2. 上传 OPK
echo "[2/3] 上传 OPK..."
UPLOAD_RESP=$(curl -s -X POST "$BASE_URL/project/api/project/team/$TEAM_UUID/plugin/upload_opk" \
  -H "Ones-Check-Id: $TEAM_UUID" \
  -H "Ones-Check-Point: team" \
  -H "Ones-Plugin-Id: built_in_apis" \
  -H "Ones-Auth-Token: $TOKEN" \
  -b /tmp/ones_cookies_bi.txt \
  -F "file=@$OPK_FILE" \
  -F "organization_uuid=$ORG_UUID")

INSTANCE_UUID=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['instance_uuid'])" 2>/dev/null)
if [[ -z "$INSTANCE_UUID" ]]; then
  echo "错误: 上传失败"
  echo "$UPLOAD_RESP" | head -20
  exit 1
fi
NEW_VERSION=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['new_version'])" 2>/dev/null)
echo "  ✓ 上传成功 (instance: $INSTANCE_UUID, 版本: $NEW_VERSION)"

# 3. 安装/升级
echo "[3/3] 安装插件..."

# 先尝试 install（新插件），失败则尝试 upgrade（已有插件）
INSTALL_RESP=$(curl -s -X POST "$BASE_URL/project/api/project/team/$TEAM_UUID/plugin/install" \
  -H "Content-Type: application/json;charset=UTF-8" \
  -H "Ones-Check-Id: $TEAM_UUID" \
  -H "Ones-Check-Point: team" \
  -H "Ones-Plugin-Id: built_in_apis" \
  -H "Ones-Auth-Token: $TOKEN" \
  -b /tmp/ones_cookies_bi.txt \
  -d "{\"instance_uuid\":\"$INSTANCE_UUID\"}")

RESULT=$(echo "$INSTALL_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',d.get('code','')))" 2>/dev/null)

if echo "$INSTALL_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('data') else 1)" 2>/dev/null; then
  echo "  ✓ 安装成功! 版本: $NEW_VERSION"
else
  echo "  install 返回: $INSTALL_RESP"
  echo "  尝试 upgrade..."
  UPGRADE_RESP=$(curl -s -X POST "$BASE_URL/project/api/project/team/$TEAM_UUID/plugin/upgrade" \
    -H "Content-Type: application/json;charset=UTF-8" \
    -H "Ones-Check-Id: $TEAM_UUID" \
    -H "Ones-Check-Point: team" \
    -H "Ones-Plugin-Id: built_in_apis" \
    -H "Ones-Auth-Token: $TOKEN" \
    -b /tmp/ones_cookies_bi.txt \
    -d "{\"instance_uuid\":\"$INSTANCE_UUID\"}")

  if echo "$UPGRADE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('data') else 1)" 2>/dev/null; then
    echo "  ✓ 升级成功! 版本: $NEW_VERSION"
  else
    echo "错误: 安装/升级均失败"
    echo "install: $INSTALL_RESP"
    echo "upgrade: $UPGRADE_RESP"
    exit 1
  fi
fi

# 清理
rm -f /tmp/ones_cookies_bi.txt /tmp/ones_headers_bi.txt
echo ""
echo "=== 完成 ==="
echo "插件已部署到 $BASE_URL"
