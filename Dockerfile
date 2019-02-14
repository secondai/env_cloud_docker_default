FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./


RUN apk add --no-cache --virtual .gyp \
        python \
        make \
        g++ 

USER node

RUN npm install

COPY --chown=node:node . .


RUN apk del .gyp


EXPOSE 8080

CMD [ "node", "server.js" ]