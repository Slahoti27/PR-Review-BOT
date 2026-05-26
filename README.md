# 🤖 PR Review Bot

An AI-powered GitHub Pull Request reviewer. Paste a PR URL, get instant AI feedback on bugs, security issues, and style — then post inline review comments directly back to the PR on GitHub.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon DB — free) |
| AI | Claude API (Anthropic) |
| Auth | GitHub OAuth + JWT (httpOnly cookie) |
| Hosting | Vercel (frontend) + Render (backend) |

## Features

- 🔐 GitHub OAuth login
- 🔍 Paste any GitHub PR URL to trigger an AI review
- 🤖 Claude AI analyses the diff file-by-file
- 🔴🟡🟢 Issues categorised by severity (critical / major / minor)
- 💬 Post inline review comments directly on the GitHub PR
- 📊 Dashboard with review history
- 🔗 Public shareable link for each review

---

## Setup Guide

### 1. GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set:
   - Homepage URL: `http://localhost:5173`
   - Callback URL: `http://localhost:5000/api/auth/github/callback`
4. Copy the **Client ID** and **Client Secret**

### 2. Get free PostgreSQL (Neon DB)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the **connection string** (looks like `postgresql://user:pass@host/db?sslmode=require`)

### 3. Get Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 4. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all values in .env

npm install
npm run dev
```

### 5. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000

npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## Project Structure

```
pr-review-bot/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # Sequelize + PostgreSQL
│   │   │   └── passport.js       # GitHub OAuth strategy
│   │   ├── controllers/
│   │   │   ├── authController.js # Login, /me, logout
│   │   │   └── reviewController.js # Create, fetch, post reviews
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT cookie verification
│   │   ├── models/
│   │   │   ├── User.js           # GitHub user
│   │   │   └── Review.js         # PR review + issues JSON
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── reviews.js
│   │   ├── services/
│   │   │   ├── githubService.js  # Fetch diff, post comments
│   │   │   └── claudeService.js  # AI review + prompt
│   │   └── app.js                # Express entry point
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/client.js         # Axios API calls
    │   ├── context/AuthContext.jsx
    │   ├── components/ProtectedRoute.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx     # Review list + submit form
    │   │   ├── ReviewDetail.jsx  # Issues + post-to-GitHub
    │   │   └── SharedReview.jsx  # Public share page
    │   ├── App.jsx
    │   └── index.css
    └── .env.example
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/github` | — | Start GitHub OAuth |
| GET | `/api/auth/github/callback` | — | OAuth callback |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/logout` | — | Clear cookie |
| POST | `/api/reviews` | ✅ | Submit PR for review |
| GET | `/api/reviews` | ✅ | List your reviews |
| GET | `/api/reviews/:id` | ✅ | Get review detail |
| GET | `/api/reviews/share/:token` | — | Public share |
| POST | `/api/reviews/:id/post-to-github` | ✅ | Post to GitHub PR |

---

## Deployment

### Render (Backend)
1. Connect your GitHub repo
2. Set build command: `npm install`
3. Set start command: `node src/app.js`
4. Add all env vars from `.env.example`
5. Update `GITHUB_CALLBACK_URL` to your Render URL

### Vercel (Frontend)
1. Connect your GitHub repo, set root to `frontend/`
2. Set `VITE_API_URL` to your Render backend URL
3. Update `FRONTEND_URL` in backend env to your Vercel URL

---

## Resume Bullet

> Built a full-stack AI PR review platform integrating GitHub REST API, Claude AI, and PostgreSQL — automatically analysing PR diffs and posting structured inline review comments (bugs, security, style) categorised by severity directly on GitHub PRs, with a React dashboard for review history and public shareable links.

**Stack:** React · Vite · Node.js · Express · PostgreSQL · Sequelize · Claude AI · GitHub OAuth · JWT · Vercel · Render
