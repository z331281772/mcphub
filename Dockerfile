FROM 10.0.27.61:5001/python:3.13-slim-bookworm AS base

COPY --from=10.0.27.61:5001/ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 设置代理参数
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG INSTALL_EXT=false

# 安装系统依赖、Node.js和pnpm
RUN apt-get update && apt-get install -y curl gnupg git \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && npm install -g pnpm \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# 设置pnpm环境并安装MCP服务器
ENV PNPM_HOME=/usr/local/share/pnpm \
    PATH=$PNPM_HOME:$PATH
RUN mkdir -p $PNPM_HOME && \
    pnpm add -g @amap/amap-maps-mcp-server @playwright/mcp@latest tavily-mcp@latest @modelcontextprotocol/server-github @modelcontextprotocol/server-slack && \
    uv tool install mcp-server-fetch

# 可选安装Playwright Chrome（仅在x86_64架构上）
RUN if [ "$INSTALL_EXT" = "true" ] && [ "$(uname -m)" = "x86_64" ]; then \
        npx -y playwright install --with-deps chrome; \
    fi

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

# Download the latest servers.json from mcpm.sh and replace the existing file
RUN curl -s -f --connect-timeout 10 https://mcpm.sh/api/servers.json -o servers.json || echo "Failed to download servers.json, using bundled version"

RUN pnpm frontend:build && pnpm build

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["pnpm", "start"]
