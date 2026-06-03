FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
WORKDIR /app/shared
RUN npm install --omit=dev
WORKDIR /app/services/maintenance
COPY services/maintenance/package.json ./
RUN npm install --omit=dev
COPY services/maintenance ./
EXPOSE 3003
CMD ["node", "src/server.js"]
