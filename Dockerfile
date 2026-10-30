# Production image for self-hosting (e.g. on UNN ICT servers). Vercel does not use this.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S jhts && adduser -S jhts -G jhts
COPY --from=build --chown=jhts:jhts /app/.next/standalone ./
COPY --from=build --chown=jhts:jhts /app/.next/static ./.next/static
COPY --from=build --chown=jhts:jhts /app/public ./public
USER jhts
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health/live || exit 1
CMD ["node", "server.js"]
