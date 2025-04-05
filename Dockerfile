FROM python:3.12-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

FROM node:22-alpine
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV NPM_REGISTRY=${NPM_REGISTRY}

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm build

EXPOSE 3000

# Create entrypoint script
RUN echo '#!/bin/sh\n\
npm config set registry ${NPM_REGISTRY}\n\
exec "$@"' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["pnpm", "start"]
