FROM node:18-alpine

WORKDIR /app

# Installation des dépendances (couche cachée tant que package.json ne change pas)
COPY package*.json ./
RUN npm install

# Code source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
