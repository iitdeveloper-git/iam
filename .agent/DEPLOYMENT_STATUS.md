# Deployment Status

Local:

- Compose file is present.
- `.env.example` is present.
- Keycloak realm import is present.
- Migration service is present.
- Compose services were not started in this session.

GitHub deployment:

- Backend workflow targets Hugging Face Space `iitdeveloper/iam` by default.
- Frontend workflow targets Netlify using `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.

Staging:

- Not deployed.

Production:

- Blocked by DNS, TLS, cloud infrastructure, managed services, secret manager and SMTP/GNS credentials.
