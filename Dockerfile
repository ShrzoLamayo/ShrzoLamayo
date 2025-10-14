# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --legacy-peer-deps
COPY src ./src
RUN npx tsc -p tsconfig.json

# Stage 2: runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
RUN npm install --omit=dev --legacy-peer-deps
EXPOSE 8080
CMD ["node", "dist/server.js"]
