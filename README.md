# ChatBuddy 🌐🤖

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
