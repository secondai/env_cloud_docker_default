# The instructions for the first stage
FROM node:10-alpine as builder

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# RUN apk --no-cache add python make g++

COPY . .

CMD [ "npm", "start" ]