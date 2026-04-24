# STAYFITINLIFE V10.2

GitHub-ready build.

## Files included

- `index.html` — full app UI and logic
- `favicon.png` — browser icon
- `icons/` — PWA icons
- `manifest.webmanifest` — PWA manifest
- `sw.js` — versioned service worker
- `netlify.toml` — Netlify config
- `netlify/functions/ai-coach.js` — AI Coach serverless function
- `.gitignore`

## Deploy on Netlify

1. Push this folder to GitHub.
2. Connect GitHub repo to Netlify.
3. Set publish directory to project root.
4. Add environment variable:

```text
OPENAI_API_KEY=your_openai_key
```

5. Deploy.

## Important

If old UI appears after deploy:
- Open browser DevTools
- Application → Service Workers → Unregister
- Clear site data
- Hard refresh

## AI Coach

Frontend calls:

```text
/.netlify/functions/ai-coach
```

The API key is never exposed in frontend code.
