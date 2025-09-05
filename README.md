This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Troubleshooting 404 Chunk Files

If you see many `*.js` 404 errors for dynamic chunks after deployment (e.g. `cb355538-xxxx.js 404`):

1. Ensure only ONE Next.js config file exists. This repo currently has `next.config.mjs` (authoritative) and a legacy `next.config.ts`. Remove or rename the unused one (`next.config.ts`) to avoid conflicting `basePath` / `assetPrefix` / `trailingSlash` settings.
2. Confirm `basePath` and `assetPrefix` are aligned with the actual served subdirectory. In our config `assetPrefix` = `basePath` (no trailing slash) and `trailingSlash` disabled to prevent redirect rewriting of chunk URLs.
3. Clear server / proxy caches (some reverse proxies cache 404s for static assets) and hard refresh the browser (Ctrl+F5).
4. If hosted in SharePoint or behind a path-rewriting reverse proxy, verify that the subdirectory physically contains `/_next/static/*`. A missing rewrite rule for `/_next/` is a common cause.
5. Set `SUPPRESS_CONFIG_LOG=0` (default) and inspect build logs for the `[next.config]` line to verify the active basePath.

After adjustments, rebuild (`npm run build`) and redeploy.
