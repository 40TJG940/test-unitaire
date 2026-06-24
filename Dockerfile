# Stage test : installe toutes les dépendances et lance Jest
FROM node:22-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "test"]

# Stage production : uniquement les dépendances runtime
FROM node:22-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY Back_js/ ./Back_js/
COPY public/ ./public/
EXPOSE 3000
CMD ["node", "Back_js/server.js"]
