# The instructions for the first stage
FROM node:10-alpine


ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

RUN apk update
RUN apk --no-cache add bash python make g++

RUN npm install -g http-server 

WORKDIR /

# just something long-running 
CMD [ "http-server" ]