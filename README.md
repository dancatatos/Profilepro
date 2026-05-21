# Credibly

**An AI-powered personal credibility profile platform** — think "Linktree for credibility."
Built for network marketers, affiliate marketers, insurance agents, coaches, recruiters
and online sellers who want to look more professional, build trust faster and capture
more leads.

Credibly is a mobile-first **Progressive Web App**: a responsive website, an installable
app, and a desktop dashboard — all from one codebase.

---

## ✨ Highlights

- **AI Profile Generator** — a conversational onboarding flow where Gemini writes your
  headline, bio, CTAs and credibility copy as structured JSON.
- **Taglish AI mode** — native Filipino-English copy generation.
- **AI Profile Audit** — credibility / conversion / branding / clarity scores + fixes.
- **Mobile-first Profile Builder** — drag-to-reorder sections, inline editing, live preview.
- **Public profile pages** — fast, themeable, SEO + Open Graph ready.
- **Share system, QR codes & digital business card.**
- **Analytics, leads, templates** and an **admin panel** scaffold.
- **PWA** — installable, offline shell, push-notification-ready.

## 🧱 Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Firebase
(Auth, Firestore, Storage, Hosting, Functions) · Gemini API · Framer Motion · Zustand.

---

## 🚀 Quick start

```bash
npm install
cp .env.example .env.local   # then fill in values (see below)
npm run dev
```

Open <http://localhost:3000>.

> **Demo mode:** with placeholder env values the app still runs — it boots a local
> **demo account** so you can explore every screen. AI features fall back to
> high-quality templated copy. Connect Firebase + Gemini (below) to go live.

---

## 🔥 Firebase setup (step by step)

### 1. Create a Firebase project
1. Go to <https://console.firebase.google.com> → **Add project**.
2. Name it (e.g. `credibly`), finish the wizard.

### 2. Add a Web App
1. Project Overview → **Add app** → **Web** (`</>`).
2. Register the app. Copy the `firebaseConfig` values.
3. Paste them into `.env.local` as the `NEXT_PUBLIC_FIREBASE_*` variables.

### 3. Enable Authentication
1. **Build → Authentication → Get started**.
2. Enable **Email/Password**.
3. Enable **Google** (pick a support email).

### 4. Create Firestore
1. **Build → Firestore Database → Create database**.
2. Start in **production mode** (rules are deployed below), pick a region.

### 5. Enable Storage
1. **Build → Storage → Get started** — production mode.

### 6. Get a Gemini API key
1. Go to <https://aistudio.google.com/apikey> → **Create API key**.
2. Put it in `.env.local` as `GEMINI_API_KEY` (server-side only — never `NEXT_PUBLIC`).

### 7. Fill `.env.local`

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Restart `npm run dev` after editing env vars.

### 8. Deploy rules & indexes

```bash
npm install -g firebase-tools
firebase login
# set your project id in .firebaserc, then:
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

## ☁️ Deploying

**Cloud Functions** (secure AI proxy, lead processing, automations):
```bash
cd functions && npm install
firebase functions:secrets:set GEMINI_API_KEY
cd .. && firebase deploy --only functions
```

**Hosting** — this app uses Next.js SSR. Deploy with the Firebase web-frameworks
integration or **Firebase App Hosting**:
```bash
firebase experiments:enable webframeworks
firebase deploy
```

---

## 📱 PWA / mobile

- `app/manifest.ts` — installable web app manifest.
- `public/sw.js` — service worker: app-shell cache, offline fallback, push-ready.
- `public/offline.html` — offline fallback page.
- `InstallPrompt` — custom "Add to Home Screen" banner.
- The service worker registers in **production builds only** (`npm run build && npm start`).
- Architecture is ready to wrap with **Capacitor**, an Android **Trusted Web Activity**,
  or an iOS WebView.

---

## 🤖 AI architecture (`/lib/ai`)

```
lib/ai/
  client.ts      Gemini transport (REST, JSON + streaming) — swap for Firebase AI Logic
  prompts/       Reusable system personas + prompt builders (incl. Taglish)
  schemas/       Gemini structured-output (responseSchema) definitions
  flows/         Orchestration: generate profile, audit, clone-rewrite, chat
  actions/       Modular single-purpose copy actions
  generators/    Turn AI JSON into real Profile data
```

API routes under `app/api/ai/*` call these flows server-side so the key stays secret.
Every flow **degrades gracefully** to templated output when no Gemini key is set.

---

## 🗂️ Project structure

```
app/                Next.js App Router
  (auth)/           Login, signup, forgot password
  (app)/            Dashboard shell + all modules
  [username]/       Public profile pages
  api/ai/           Server-side AI endpoints
  admin/            Admin panel
components/          UI library, layout, profile builder, public profile, PWA
lib/                 firebase/, ai/, utils, constants, theme, defaults
store/               Zustand stores (auth, profile, ui)
functions/           Firebase Cloud Functions (Gen 2)
types/               Shared domain types
```

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run the production build (PWA active) |
| `npm run lint` | Lint |
| `npm run typecheck` | Type-check without emitting |

---

Built like a modern venture-backed AI SaaS startup. 🚀
