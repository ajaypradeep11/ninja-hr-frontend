# NinjaHR frontend (Next.js). Builds the app and serves it with `next start`.
# Server-side calls to the backend use NINJA_HR_API_URL / INTERNAL_API_KEY at
# runtime (provided by compose) — they are NOT baked in at build time.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["npm", "run", "start"]
