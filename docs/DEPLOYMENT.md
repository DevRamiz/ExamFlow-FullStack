# Deployment

## Render Blueprint

The root `render.yaml` creates:

- one PostgreSQL database;
- one Docker web service containing the built React client and Express API.

Steps:

1. Push the project to GitHub.
2. In Render, choose **New > Blueprint**.
3. Select the GitHub repository.
4. Render reads `render.yaml`.
5. Deploy the blueprint.
6. Open the generated web-service URL.
7. Put the URL in the submission README and course document.

The service startup command runs the schema migration, idempotent demo seed, and API server.

## Separate frontend deployment

The client can also be deployed to Vercel. Set:

```text
VITE_API_URL=https://your-api.example.com/api
VITE_WS_URL=wss://your-api.example.com/ws
```

Set the server `CLIENT_ORIGIN` to the Vercel client URL.

## Production notes

- Replace demo JWT secrets with a generated secret.
- Use a managed PostgreSQL connection string.
- Set `SEED_DATABASE=false` when demo accounts are not wanted.
- Do not commit `.env`.
