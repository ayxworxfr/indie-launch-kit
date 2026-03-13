#!/bin/bash
# 从 .dev.vars 读取配置，自动上传到 Cloudflare Workers Secrets
# 用法：bash scripts/deploy-secrets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DEV_VARS="$ROOT_DIR/.dev.vars"

if [ ! -f "$DEV_VARS" ]; then
  echo "❌ 找不到 .dev.vars 文件，请先复制 .dev.vars.example 并填写真实值"
  exit 1
fi

echo "📋 从 .dev.vars 读取配置..."
echo ""

# 需要上传的 Secret 列表（其余变量走 wrangler.toml [vars]）
SECRETS=(
  "ED25519_PRIVATE_KEY"
  "ALIPAY_APP_ID"
  "ALIPAY_PRIVATE_KEY"
  "ALIPAY_PUBLIC_KEY"
  "RESEND_API_KEY"
)

cd "$ROOT_DIR"

for key in "${SECRETS[@]}"; do
  # 从 .dev.vars 提取对应的值（忽略注释行，精确匹配 key=）
  value=$(grep -E "^${key}=" "$DEV_VARS" | head -1 | cut -d'=' -f2-)

  if [ -z "$value" ]; then
    echo "⚠️  跳过 $key（.dev.vars 中未找到）"
    continue
  fi

  echo "🔐 上传 $key ..."
  echo "$value" | npx wrangler secret put "$key"
done

echo ""
echo "✅ 所有 Secrets 上传完成"
echo ""

# 询问是否初始化远程数据库
read -p "是否同时初始化远程 D1 数据库表？(y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🗄️  初始化远程数据库..."
  npx wrangler d1 execute license-db --remote --file=src/schema.sql
  echo "✅ 数据库初始化完成"
fi
