# Deploying FieldPulse

The frontend ships the same way as `inventory-dashboard`: a GitHub Action builds a
static bundle, syncs it to an S3 bucket, and invalidates a CloudFront
distribution. `main` deploys to Production, `staging` to staging. The workflow is
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

FieldPulse is a Next.js static export (`output: "export"` in `next.config.ts`),
not a Vite SPA, so a few things the Next dev server does for free have to be
configured in CloudFront. This file is the checklist.

## 1. GitHub

Create two **Environments** on `Meta4-Dev/fieldpulse-frontend`: `Production` and
`staging` (names must match the workflow exactly).

Per environment:

| Kind   | Name                             | Value                                                                                 |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------- |
| var    | `NEXT_PUBLIC_FIELDPULSE_API_URL` | FieldPulse backend origin, e.g. `https://fieldpulse-be.createyourmeta-iv.com`         |
| var    | `NEXT_PUBLIC_ERP_API_URL`        | ERP API origin (sign-in posts here)                                                   |
| var    | `NEXT_PUBLIC_CHATWOOT_ORIGIN`    | Chatwoot origin that embeds the dashboard app; defaults to `https://app.chatwoot.com` |
| secret | `AWS_ACCESS_KEY_ID`              | IAM user with the policy in §5                                                        |
| secret | `AWS_SECRET_ACCESS_KEY`          |                                                                                       |
| secret | `AWS_REGION`                     | Bucket region, e.g. `eu-central-1`                                                    |
| secret | `S3_BUCKET`                      | Bucket name (no `s3://`)                                                              |
| secret | `CLOUDFRONT_ID`                  | Distribution ID, e.g. `E1ABC…`                                                        |

The two `*_API_URL` vars are mandatory: `src/lib/config.ts` throws at build time when
either is empty, so a misconfigured environment fails the workflow instead of
shipping.

## 2. S3 bucket (one per environment)

- Private bucket, **Block all public access** on. CloudFront reads it through an
  Origin Access Control (OAC); nothing talks to S3 directly.
- Do **not** enable static-website hosting — the CloudFront function below does
  the URL mapping, and the REST endpoint is what OAC supports.
- Bucket policy: allow `s3:GetObject` to the CloudFront service principal for
  the distribution's ARN (the console offers to write this when you create the
  OAC).

## 3. CloudFront distribution (one per environment)

**Origin**: the S3 bucket via OAC.

**Alternate domain name**: e.g. `fieldpulse.createyourmeta-iv.com`, with an ACM
certificate in `us-east-1`. HTTPS is mandatory — the service worker, offline
mode, and web push do not run on plain HTTP.

**Default root object**: `index.html`.

**Function**: create a CloudFront Function from
[`cloudfront/url-rewrite.js`](cloudfront/url-rewrite.js) (runtime
`cloudfront-js-2.0`) and attach it as the **viewer request** function on every
behavior below except `/_next/static/*` and `/sw.js`.

**Cache policy**: `CachingOptimized` for `/_next/static/*`. For everything else
use a policy that forwards the query string (`/visits?id=…` must reach the
browser) but does not vary the cache on it, e.g. a custom policy with query
strings set to _All_ and a short default TTL. The S3 objects already carry
`Cache-Control`, so `UseOriginCacheControlHeaders-QueryStrings` also works.

**Behaviors**, most specific first:

| Path pattern              | Function      | Response headers policy    |
| ------------------------- | ------------- | -------------------------- |
| `/_next/static/*`         | none          | `fieldpulse-default` (§4)  |
| `/sw.js`                  | none          | `fieldpulse-default`       |
| `/integrations/chatwoot*` | `url-rewrite` | `fieldpulse-chatwoot` (§4) |
| `Default (*)`             | `url-rewrite` | `fieldpulse-default`       |

**Custom error responses**: map origin **403** and **404** to `/404.html` with
response code **404**. (A missing key on a private S3 origin comes back as 403,
so both need mapping.)

## 4. Response headers policies

A static export cannot set headers, so these replace the `headers()` block that
`next.config.ts` applies in `next dev`. Keep the two in sync.

`fieldpulse-default` (all paths except the Chatwoot dashboard app):

| Header                   | Value                             |
| ------------------------ | --------------------------------- |
| `X-Content-Type-Options` | `nosniff`                         |
| `X-Frame-Options`        | `DENY`                            |
| `Referrer-Policy`        | `strict-origin-when-cross-origin` |

`fieldpulse-chatwoot` (`/integrations/chatwoot*` — this page is loaded inside an
iframe by Chatwoot, so it must **not** carry `X-Frame-Options: DENY`):

| Header                    | Value                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `X-Content-Type-Options`  | `nosniff`                                                                                                      |
| `Content-Security-Policy` | `frame-ancestors 'self' <NEXT_PUBLIC_CHATWOOT_ORIGIN>`, e.g. `frame-ancestors 'self' https://app.chatwoot.com` |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                                                                              |

`Cache-Control` and the `Content-Type` of `sw.js` are set on the S3 objects by
the workflow, so they need no policy.

## 5. IAM policy for the deploy user

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::<bucket>"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::<bucket>/*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::<account-id>:distribution/<distribution-id>"
    }
  ]
}
```

One user with both environments' buckets and distributions listed is fine, or
one user per environment.

## 6. Outside AWS

- **Backend CORS.** Add the frontend origin to `CORS_ALLOWED_ORIGINS` in the
  FieldPulse backend's `.env` on EC2 (staging and production), and to the ERP
  API's equivalent. The browser sends the bearer token in an `Authorization`
  header, so the preflight must be allowed.
- **Chatwoot.** Point the Dashboard App URL at
  `https://<frontend-host>/integrations/chatwoot`. The CSP above must name the
  Chatwoot origin that embeds it; if Chatwoot is self-hosted, set
  `NEXT_PUBLIC_CHATWOOT_ORIGIN` to that origin in both GitHub Environments and
  in the `fieldpulse-chatwoot` headers policy.
- **DNS.** CNAME (or Route 53 alias) the frontend hostname to the distribution.

## 7. Verifying a deploy

```sh
curl -sI https://<host>/today | grep -iE "^(HTTP|x-frame|cache-control)"
curl -sI https://<host>/integrations/chatwoot | grep -iE "^(HTTP|content-security|x-frame)"
curl -sI https://<host>/sw.js | grep -iE "^(HTTP|cache-control|content-type)"
curl -sI https://<host>/does-not-exist | head -1   # expect 404
```

The first should show `X-Frame-Options: DENY`; the second should show the
`frame-ancestors` CSP and **no** `X-Frame-Options`; the third should be
`no-cache, no-store, must-revalidate` with a JavaScript content type.

## Why not the backend's EC2 + PM2 pipeline?

That would also work (`next start` behind nginx keeps `headers()` and dynamic
routes intact) and needs none of §3–§4. It costs a running Node process per
environment instead of a bucket, which is the trade the inventory dashboard
already made in favour of S3. Switching later means removing `output: "export"`
and cloning `fieldpulse-backend/.github/workflows/production.yml`.
