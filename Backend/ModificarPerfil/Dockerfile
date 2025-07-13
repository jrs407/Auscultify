FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install -g typescript

COPY . .

RUN npm run build

EXPOSE 3003

CMD ["npm", "start"]
