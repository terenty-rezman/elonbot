FROM node
WORKDIR /usr/src/elonbnot
COPY package*.json ./
RUN npm i
COPY . .
CMD ["npm", "run", "docker"]
