# API AppBarber

API em Node.js com Fastify e MongoDB para centralizar os dados do app.

## Requisitos

- Node.js 18+
- MongoDB local ou remoto

## Configuração

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Instale as dependências:

```bash
pnpm install
```

3. Rode em modo desenvolvimento:

```bash
pnpm dev
```

API padrão: `http://localhost:3333`.

Se o Mongo estiver em Docker com autenticação padrão, a URI deve incluir usuário/senha:

`mongodb://admin:admin@127.0.0.1:27017/appbarber?authSource=admin`

## Endpoints principais

- `GET /health`
- `GET /app-data`
- `DELETE /app-data`
- `GET /:resource`
- `POST /:resource`
- `PATCH /:resource/:id`
- `DELETE /:resource/:id`

Recursos suportados: `users`, `services`, `professionals`, `products`, `appointments`, `transactions`, `campaigns`.
