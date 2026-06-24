# --- Etape build ---
FROM rust:1-slim AS builder
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

# --- Etape production ---
FROM debian:bookworm-slim AS production
WORKDIR /app
COPY --from=builder /app/target/release/calculator-backend /usr/local/bin/calculator-backend
ENV PORT=3000
EXPOSE 3000
CMD ["calculator-backend"]
