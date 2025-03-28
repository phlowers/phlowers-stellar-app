FROM node:alpine as build
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN npm install

RUN uv python install 3.12

RUN npm run set-up-mechaphlowers

RUN npm run build -- --configuration production,githubPage

FROM nginx:latest

COPY --from=build /usr/src/app/dist/phlowers-stellar-app /usr/share/nginx/html

EXPOSE 80