FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
WORKDIR /app/shared
RUN npm install --omit=dev
WORKDIR /app/gateway
COPY gateway/package.json ./
RUN npm install --omit=dev
COPY gateway ./
EXPOSE 3000
CMD ["node", "src/server.js"]
