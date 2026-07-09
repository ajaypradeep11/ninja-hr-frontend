# NinjaHR frontend (Next.js). Builds the app and serves it with `next start`.
# Server-side calls to the backend use NINJA_HR_API_URL / INTERNAL_API_KEY at
# runtime (provided by compose) — they are NOT baked in at build time.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* vars are inlined into the client bundle at `next build` time,
# so (unlike NINJA_HR_API_URL/INTERNAL_API_KEY) they must arrive as build args
# — setting them only as compose `environment:` at container run time would
# be invisible to the already-built browser bundle. Values come from
# docker-compose.yml's `frontend.build.args`.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=$NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
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
