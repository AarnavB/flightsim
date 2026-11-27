# Deployment

The project builds to a static Vite output directory, `dist`, and is configured for Vercel.

## Local production build

~~~bash
npm run build
npm run preview
~~~

## Vercel settings

- Framework preset: Vite
- Root directory: repository root
- Install command: `npm install --no-audit --no-fund`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: none required

Vercel Hobby is an optional personal/non-commercial static-hosting target. Review the current Vercel plan terms and allowance before connecting or deploying. Do not add a paid plan, paid add-on, custom domain, database or serverless function for this project. A local build remains the zero-hosting-cost fallback.

A Vercel project is not assumed to exist merely because `vercel.json` is present. Preview deployment status must be checked in Vercel before it is reported as available.
