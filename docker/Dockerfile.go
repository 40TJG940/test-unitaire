# Backend Go + front embarqué — à builder depuis la RACINE.
FROM golang:1.23 AS build
WORKDIR /src
COPY Back_go/ ./
RUN CGO_ENABLED=0 go build -o /calc .

FROM debian:bookworm-slim
WORKDIR /app/Back_go
COPY --from=build /calc /usr/local/bin/calc
COPY public /app/public
EXPOSE 3000
CMD ["calc"]
