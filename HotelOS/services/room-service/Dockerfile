FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
WORKDIR /app/shared
RUN npm install --omit=dev
WORKDIR /app/services/room-service
COPY services/room-service/package.json ./
RUN npm install --omit=dev
COPY services/room-service ./
EXPOSE 3004
CMD ["node", "src/server.js"]
