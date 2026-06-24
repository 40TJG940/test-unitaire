# --- Etape build ---
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS builder
WORKDIR /app
COPY backend-csharp.csproj ./
RUN dotnet restore
COPY *.cs ./
RUN dotnet publish -c Release -o /out

# --- Etape production ---
FROM mcr.microsoft.com/dotnet/runtime:9.0 AS production
WORKDIR /app
COPY --from=builder /out ./
ENV PORT=3000
EXPOSE 3000
ENTRYPOINT ["dotnet", "calculator-backend.dll"]
