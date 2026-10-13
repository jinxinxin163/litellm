# run backend
uv run python litellm/proxy/proxy_cli.py --port 4004

# run ui
# 配置
ui/litellm-dashboard/.env.development配置NEXT_PUBLIC_BASE_URL=http://localhost:4004
ui/litellm-dashboard/next.config.mjs添加allowedDevOrigins: ['172.21.73.80'],
# 运行
cd ui/litellm-dashboard
npm run dev -- --port 4005
