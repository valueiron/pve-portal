FROM node:lts-alpine3.22 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install
COPY . .
RUN npm run build

# Copy config template to build output
COPY public/config.js.template /app/dist/config.js.template
 
# Production Stage
FROM nginx:stable-alpine AS production

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Create entrypoint script to generate config.js from template
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'set -e' >> /entrypoint.sh && \
    echo 'export API_BASE_URL=${API_BASE_URL:-http://localhost:5000}' >> /entrypoint.sh && \
    echo 'envsubst '"'"'$API_BASE_URL'"'"' < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js' >> /entrypoint.sh && \
    echo 'rm /usr/share/nginx/html/config.js.template' >> /entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
