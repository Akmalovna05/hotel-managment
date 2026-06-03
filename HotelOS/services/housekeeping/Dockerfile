FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
WORKDIR /app/shared
RUN npm install --omit=dev
WORKDIR /app/services/housekeeping
COPY services/housekeeping/package.json ./
RUN npm install --omit=dev
COPY services/housekeeping ./
EXPOSE 3002
CMD ["node", "src/server.js"]
