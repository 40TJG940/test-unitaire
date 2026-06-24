# Backend JS (Node) + front embarqué — à builder depuis la RACINE.
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY Back_js/ ./Back_js/
COPY public/ ./public/
EXPOSE 3000
CMD ["node", "Back_js/server.js"]
