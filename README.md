# FieldPulse frontend

Field sales visit verification, planning, and reporting. Next.js 16 static
export; see [`ARCHITECTURE.md`](ARCHITECTURE.md) for how the code is organised.

## Local development

```sh
cp .env.example .env.local   # fill in the two API URLs
npm ci
npm run dev                  # http://localhost:5173
```

## Deployment

Pushes to `staging` and `main` build a static bundle and publish it to S3 +
CloudFront through GitHub Actions. Environment variables, AWS setup, and the
CloudFront configuration the static export depends on are documented in
[`deploy/README.md`](deploy/README.md).
