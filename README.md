# SkillShare Platform

> A full-stack skill-sharing platform where users showcase skills, book live 1v1 sessions, and earn AI-generated certifications.

## ✨ Features

- **📸 Skill Feed** — Instagram-style infinite scroll feed with image/video posts
- **🔍 Explore** — Browse and search posts by skill category
- **👤 Creator Profiles** — Follow creators, view posts and certificates
- **📅 1v1 Session Booking** — Book live video sessions with Jitsi Meet (no account needed)
- **🧪 AI Skill Tests** — Gemini-powered tests generated from creator content
- **🎓 Digital Certificates** — Verified PDF certificates with QR codes
- **🔔 Notifications** — In-app notifications for all platform events
- **💳 Payments** — Stripe integration for paid sessions

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React, TypeScript, Vanilla CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas (Mongoose) |
| **Auth** | Firebase Authentication |
| **Media** | Cloudinary |
| **AI** | Google Gemini API |
| **Video** | Jitsi Meet (open source, free) |
| **Email** | Resend |
| **Payments** | Stripe |
| **Certificates** | PDFKit + QR codes |

---

## 🚀 Quick Start

### Prerequisites

You'll need free accounts for:
1. **Firebase** — [firebase.google.com](https://firebase.google.com) (enable Email/Password + Google + GitHub auth)
2. **MongoDB Atlas** — [mongodb.com](https://mongodb.com) (create a free M0 cluster)
3. **Cloudinary** — [cloudinary.com](https://cloudinary.com) (free tier)
4. **Google AI Studio** — [aistudio.google.com](https://aistudio.google.com) (free Gemini API key)
5. **Resend** — [resend.com](https://resend.com) (free tier, optional for emails)
6. **Stripe** — [stripe.com](https://stripe.com) (only if enabling paid sessions)

---

### 1. Clone and Install

```bash
git clone <repo-url>
cd skill_share

# Install backend dependencies
cd backend && npm install --legacy-peer-deps

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment Variables

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env with your API keys
```

**Frontend:**
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Firebase config
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Sign-in methods: Email/Password, Google, GitHub
4. Go to **Project Settings** → Service Accounts → Generate new private key
5. Copy values to your backend `.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (keep `\n` as literal backslash-n)
6. Copy web app config to frontend `.env.local`

### 4. MongoDB Atlas Setup

1. Create a free M0 cluster at [mongodb.com](https://mongodb.com)
2. Add a database user with read/write access
3. Whitelist IP `0.0.0.0/0` (for deployment) or your local IP
4. Copy connection string to `MONGODB_URI` in backend `.env`

### 5. Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard → copy Cloud Name, API Key, API Secret
3. Add to backend `.env`

### 6. Run Locally

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Backend starts at http://localhost:5000

# Terminal 2: Frontend
cd frontend
npm run dev
# Frontend starts at http://localhost:3000
```

---

## 📁 Project Structure

```
skill_share/
├── backend/                    # Express API Server
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          # MongoDB connection
│   │   │   └── cloudinary.js  # Media upload config
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Post.js
│   │   │   ├── Session.js
│   │   │   ├── Test.js
│   │   │   ├── Certificate.js
│   │   │   └── Notification.js
│   │   ├── routes/
│   │   │   ├── auth.js        # POST /api/auth/sync
│   │   │   ├── users.js       # GET/PUT /api/users/*
│   │   │   ├── posts.js       # GET/POST /api/posts/*
│   │   │   ├── sessions.js    # GET/POST /api/sessions/*
│   │   │   ├── tests.js       # POST /api/tests/generate
│   │   │   ├── certificates.js# GET /api/certificates/*
│   │   │   ├── notifications.js
│   │   │   └── payments.js    # Stripe integration
│   │   ├── middleware/
│   │   │   └── auth.js        # Firebase token verification
│   │   ├── services/
│   │   │   ├── aiService.js   # Gemini test generation
│   │   │   ├── certificateService.js # PDF generation
│   │   │   ├── emailService.js      # Resend emails
│   │   │   ├── notificationService.js
│   │   │   └── reminderService.js   # Session reminder cron
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
└── frontend/                   # Next.js 14 App
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx        # Landing page
    │   │   ├── login/          # Auth pages
    │   │   ├── signup/
    │   │   ├── feed/           # Main feed
    │   │   ├── explore/        # Discovery
    │   │   ├── profile/[username]/
    │   │   ├── post/create/
    │   │   ├── sessions/
    │   │   ├── test/[id]/
    │   │   ├── notifications/
    │   │   └── verify/[code]/  # Certificate verification
    │   ├── components/
    │   │   ├── layout/         # Sidebar, BottomNav, AppLayout
    │   │   ├── feed/           # PostCard
    │   │   └── booking/        # BookingModal
    │   ├── context/
    │   │   └── AuthContext.tsx # Firebase auth state
    │   ├── lib/
    │   │   ├── firebase.ts     # Firebase client config
    │   │   └── api.ts          # Typed fetch wrapper
    │   └── types/index.ts
    ├── .env.example
    └── next.config.ts
```

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/sync` | Sync Firebase user to MongoDB |
| GET | `/api/auth/check-username/:u` | Check username availability |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me` | Get my profile |
| PUT | `/api/users/me` | Update profile + avatar |
| GET | `/api/users/:username` | Public profile + posts |
| POST | `/api/users/:id/follow` | Toggle follow |
| PUT | `/api/users/availability` | Set creator availability |

### Posts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/posts/feed?page=` | Following feed |
| GET | `/api/posts/explore?category=` | Explore |
| POST | `/api/posts` | Create post (multipart) |
| POST | `/api/posts/:id/like` | Toggle like |
| POST | `/api/posts/:id/comments` | Add comment |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sessions` | Book session |
| GET | `/api/sessions/mine` | My sessions |
| PUT | `/api/sessions/:id/confirm` | Confirm booking |
| DELETE | `/api/sessions/:id` | Cancel |
| GET | `/api/sessions/:id/join` | Get Jitsi room URL |

### Tests & Certificates
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/tests/generate` | AI generate test |
| GET | `/api/tests/:id` | Get test |
| POST | `/api/tests/:id/submit` | Submit + grade |
| GET | `/api/certificates/verify/:code` | Public verify |

---

## 🚀 Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel deploy
# Set environment variables in Vercel dashboard
```

### Backend → Render

1. Push code to GitHub
2. Create a new **Web Service** in [Render](https://render.com)
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `npm install --legacy-peer-deps`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend`
5. Add all environment variables from `.env.example`
6. Set `FRONTEND_URL` to your Vercel URL

### Database → MongoDB Atlas

1. Free M0 cluster is sufficient for development
2. Network Access → Add IP `0.0.0.0/0` for Render

### Post-Deploy
- Update `NEXT_PUBLIC_API_URL` in Vercel to your Render URL
- Update `FRONTEND_URL` in Render to your Vercel URL
- Add Render URL to Firebase **Authorized Domains**

---

## 🔧 Key Design Decisions

### Video Calls
Using **Jitsi Meet** (meet.jit.si) — completely free, open source, no API key needed. Rooms are created by generating a unique UUID room name. Users join 15 minutes before session start.

### AI Test Generation
**Gemini 1.5 Flash** generates 10 multiple-choice questions from creator post content. Questions range easy/medium/hard. Fallback template questions used if API fails.

### Certificates
Server-side PDF generation with **PDFKit** — beautiful dark-themed certificates with QR codes linking to the public `/verify/:code` page. Uploaded to Cloudinary as raw PDFs.

### Session Reminders
**node-cron** runs every 30 minutes to send reminder emails 24h and 1h before confirmed sessions, using **Resend** for email delivery.

---

## 🌱 Future Enhancements

- Real-time notifications via WebSockets/SSE
- Creator analytics dashboard
- Live streaming integration
- Mobile app (React Native)
- Subscription tiers for creators
- AI-powered content recommendations
- Community forums/groups
- Multi-language support

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
