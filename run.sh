# start backend
uv run python litellm/proxy/proxy_cli.py --port 4004

# start ui
cd ui/litellm-dashboard
npm run dev
