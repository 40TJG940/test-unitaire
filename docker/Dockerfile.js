# Backend JS (Node) + front embarqué — à builder depuis la RACINE.
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY Back_js/ ./Back_js/
COPY public/ ./public/
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=5s \
    CMD wget -qO- http://localhost:3000/ > /dev/null || exit 1
CMD ["node", "Back_js/server.js"]
