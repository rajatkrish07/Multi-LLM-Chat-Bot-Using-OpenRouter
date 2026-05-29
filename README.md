# ChatBuddy 🌐🤖

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-amber?style=for-the-badge&logo=render&logoColor=white)](https://multi-llm-chat-bot-using-openrouter.onrender.com/)

**Live Application URL**: [https://multi-llm-chat-bot-using-openrouter.onrender.com/](https://multi-llm-chat-bot-using-openrouter.onrender.com/)

ChatBuddy is a fully responsive, modern digital assistant application built with a full-stack architecture (**React 19 + TypeScript + Vite + Express**). It is integrated with **Firebase Authentication (Google OAuth)** and **Cloud Firestore** for secure, persistent, real-time message history synchronization across users' devices.

ChatBuddy connects with OpenRouter endpoints to offer seamless developer access to high-performance LLMs (with free tier models fallback) in an elegantly visual user interface.

---

## ✨ Features

- **🌐 Google OAuth Integration**: Seamless, modern cloud login supported via Firebase Authentication. 
- **💾 Persistent Firestore History**: Your user profile, custom chat sessions, and messages are backed up in real-time to a secure Cloud Firestore database.
- **🎨 Responsive Slate Theme**: Fully polished visual elements with deep charcoal backgrounds, elegant negative space, smooth entry animations, and balanced micro-interactions (powered by Tailwind v4 + Motion).
- **📝 High-Fidelity Markdown Rendering**: Built-in, precise React Markdown-style renderer specializing in:
  - **Tables**: Perfectly aligned, borders-wrapped interactive grid tables.
  - **Headings & Subheadings**: Clear and robust heading hierarchy without raw hashes (`#`).
  - **Aesthetic Lists & Bullets**: Responsive spacing, indentation, and list styling for best readability.
  - **Code Blocks**: Formatted with monospace typography, custom language banners, and instantaneous click-to-copy utility.
- **⚡ Performance First**: Express backend server bundles components with `esbuild` for speed and lightweight Node.js container spin-ups.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion (for transitions and animations).
- **Backend**: Node.js, Express, esbuild, tsx.
- **Database & Auth**: Google Firebase Auth (Google OAuth) + Cloud Firestore.

---

## 🚀 Getting Started Locally

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (version 18 or newer) and `npm` installed.

### 2. Clone and Setup Environment
Copy the configuration template to create your local variables:
```bash
cp .env.example .env
```

Open your newly created `.env` file and customize the variables:
```env
# Optional OpenRouter API Key for server-side LLM requests
VITE_OPENROUTER_API_KEY="your-openrouter-key"

# Base app URL
APP_URL="http://localhost:3000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Firebase Project (Optional but Highly Recommended)
To enable Cloud Syncing and Google OAuth:
1. Create a Firebase project at the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** and choose a cloud region.
3. Go to **Authentication** > **Sign-in method** > Enable the **Google** provider.
4. Go to **Project Settings** > **General** > **Your apps** > Add a new **Web App**.
5. Copy the Firebase configuration key parameters and load them in `/src/lib/firebase.ts`.

---

## 📦 Build & Scripts

The following commands are defined inside `package.json`:

| Command | Action |
| :--- | :--- |
| **`npm run dev`** | Spins up the local development full-stack integration server (Express runs at `0.0.0.0:3000` proxied with Vite client middleware). |
| **`npm run build`** | Compiles client assets into static files via Vite, and bundles the Express backend TS file to a single self-contained CJS file at `dist/server.cjs`. |
| **`npm run start`** | Runs the production-compiled backend server from `dist/server.cjs`. |
| **`npm run lint`** | Validates the entire codebase for TypeScript compiler errors (`tsc --noEmit`). |
| **`npm run clean`** | Safely deletes the output directories to enable fresh rebuilds. |

---

## 📂 Project Structure

```text
├── server.ts               # Full-stack Express backend server (handles proxy APIS & Vite middleware)
├── index.html              # Core SPA entry layout file
├── vite.config.ts          # Vite build configurations with Tailwind CSS plugins
├── .env.example            # Environment variables blueprint
├── firestore.rules         # Security configuration for Firebase Cloud integration
├── assets/                 # Custom static images & UI logos
└── src/
    ├── main.tsx            # Main DOM rendering hook
    ├── App.tsx             # Parent interface layout, Thread Management, and Sidebar Control
    ├── types.ts            # Global TypeScript interface definitions
    ├── lib/
    │   └── firebase.ts     # Firebase auth and db setups
    └── components/
        ├── ChatMessage.tsx # Elegant Markdown parser, table generator, code copy handlers
        ├── Sidebar.tsx     # Session histories navigation bar
        └── Alert.tsx       # Prompt warnings UI styling components
```

---

## 📜 License
This project is private and distributed for personal use. 

---

## ☁️ Deployment Guide & Troubleshooting

### Why is GitHub Pages showing a blank screen?
If you deploy this project to GitHub Pages and get a blank screen (as shown on `https://<username>.github.io/<repository-name>/`), there are **two key reasons**:

1. **Subdirectory Path Routing (Vite Base)**:
   By default, Vite compiles paths assuming they are housed at the root directory (`/`). However, GitHub Pages hosts your project at a subdirectory path (`/Multi-LLM-Chat-Bot-Using-OpenRouter/`). 
   - **Fix**: Update the `vite.config.ts` file to specify your repository base name:
     ```typescript
     export default defineConfig(() => {
       return {
         base: '/Multi-LLM-Chat-Bot-Using-OpenRouter/', // matches your repository name exactly
         plugins: [react(), tailwindcss()],
         // ...
       };
     });
     ```

2. **Full-Stack Backend vs. Static Showcase**:
   GitHub Pages only hosts **static assets** (HTML, CSS, JS). This application is **full-stack**: it uses **Node.js + Express (`server.ts`)** as a secure proxy backend to hide your secret `OPENROUTER_API_KEY` from the client.
   - If hosted purely on GitHub Pages, the frontend will load, but any API POST requests to `/api/chat` will fail with a **404 Not Found** because there is no backend server running.

---

### Recommended Deployment Options

#### Option A: Full-Stack Cloud Handlers (Express Server + React) 🌟
To keep your API keys hidden securely, deploy both your Express server and React client in a single container. These services are free or low-cost and seamlessly integrate with your GitHub repository:
- **Render** ([render.com](https://render.com)):
  - Create a new **Web Service**.
  - Connect your GitHub Repository.
  - Set **Build Command** to: `npm run build`
  - Set **Start Command** to: `npm run start`
  - Under **Environment Variables**, add:
    - `OPENROUTER_API_KEY`: *(Your key)*
    - `NODE_ENV`: `production`
- **Railway** ([railway.app](https://railway.app)):
  - Import your GitHub repository.
  - Railway will automatically detect the `package.json` build/start instructions.
  - Connect your `OPENROUTER_API_KEY` environmental variable in their variables panel.
- **Render/Railway Advantages**: No code changes needed, your API keys stay completely private!

#### Option B: Exposing Keys to the browser (Static GitHub Pages Only) ⚠️
If you **must** use GitHub Pages for simplicity, you have to bypass the Node.js server entirely and let the client talk to OpenRouter directly:
- **Code Changes**: In `/src/utils/openRouter.ts`, modify `makeCompletionRequest` to fetch directly from `https://openrouter.ai/api/v1/chat/completions` instead of `/api/chat`.
- **Security Check**: You must never put premium keys directly in code because GitHub code is public! Implement an input field in the screen for users to type their own OpenRouter key, and save it in `localStorage` client-side.
- **Static Compile**: Run `npm run build` locally, and supply `/dist` relative paths to your `gh-pages` deploy action.

