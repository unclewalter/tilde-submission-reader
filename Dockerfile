FROM mhart/alpine-node:7

WORKDIR /src
ADD . .

# If you need npm, don't use a base tag
RUN npm install

EXPOSE 3000
CMD [ "npm", "start" ]
