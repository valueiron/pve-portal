FROM node:lts-alpine3.22 AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Copy source code first
COPY . .

RUN npm run build

# Copy config template to build output
COPY public/config.js.template /app/dist/config.js.template
 
# Production Stage
FROM nginx:stable-alpine AS production

# Install envsubst and openssl for env substitution and TLS cert generation
RUN apk add --no-cache gettext openssl

# Copy nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Create entrypoint script to generate config.js from template
# If API_BASE_URL is not set, config.js will use auto-detection
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'set -e' >> /entrypoint.sh && \
    echo 'mkdir -p /etc/nginx/ssl' >> /entrypoint.sh && \
    echo 'if [ ! -f /etc/nginx/ssl/cert.pem ]; then' >> /entrypoint.sh && \
    echo '  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \' >> /entrypoint.sh && \
    echo '    -keyout /etc/nginx/ssl/key.pem \' >> /entrypoint.sh && \
    echo '    -out /etc/nginx/ssl/cert.pem \' >> /entrypoint.sh && \
    echo '    -subj "/CN=localhost" 2>/dev/null' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'envsubst '"'"'$API_BASE_URL $OIDC_ISSUER_URL'"'"' < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js' >> /entrypoint.sh && \
    echo 'rm -f /usr/share/nginx/html/config.js.template' >> /entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 80 443
CMD ["/entrypoint.sh"]
