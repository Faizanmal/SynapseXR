# Stage 1: Build the production WebXR bundle
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Enable production environment variables during build
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx with Reverse Proxy to Backend
FROM nginx:alpine-slim

# Copy production nginx configuration files
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/nginx.ssl.conf /etc/nginx/nginx.ssl.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
