FROM node:19-alpine
MAINTAINER totalplatform "info@totaljs.com"

VOLUME /www/
WORKDIR /www/
RUN mkdir -p /www/
RUN mkdir -p /www/controllers/
RUN mkdir -p /www/definitions/
RUN mkdir -p /www/plugins/
RUN mkdir -p /www/public/
RUN mkdir -p /www/resources/
RUN mkdir -p /www/schemas/
RUN mkdir -p /www/views/

COPY controllers/ ./controllers/
COPY definitions/ ./definitions/
COPY plugins/ ./plugins/
COPY public/ ./public/
COPY resources/ ./resources/
COPY schemas/ ./schemas/
COPY views/ ./views/
COPY database.sql .
COPY index.js .
COPY config .
COPY license.txt .
COPY package.json .

RUN ls -la /www/*

RUN npm install
EXPOSE 8000

CMD [ "npm", "start" ]