# 🛡️ ExamGuard

**Behavioral anomaly detection for online exams — no cameras, no invasive proctoring.**

ExamGuard monitors student behavior during exams using browser-level signals to flag suspicious activity without requiring webcam access or screen recording. It uses a MERN stack (MongoDB, Express, React, Node.js) with Socket.IO for real-time monitoring.

---

## 🔍 What It Detects

| Behavior | Severity |
|---|---|
| Tab switching / window blur | High |
| Copy/paste attempts | High |
| Developer tools open (F12) | High |
| Clipboard keyboard shortcuts (Ctrl+C/V) | High |
| Fullscreen exit | Medium |
| Prolonged idle periods | Medium |
| Right-click attempts | Low |
| Other suspicious keyboard shortcuts | Low |

## 🏗️ Architecture

```
exam-guard/
├── server/                   # Express + MongoDB backend
│   ├── models/
│   │   ├── User.js           # Roles: student, instructor, admin
│   │   ├── Exam.js           # Exam with questions + thresholds
│   │   └── ExamSession.js    # Session with behavioral events + scoring
│   ├── routes/
│   │   ├── auth.js           # Register, login, /me
│   │   ├── exams.js          # CRUD for exams
│   │   ├── sessions.js       # Start, log events, submit
│   │   └── analytics.js      # Dashboard stats, per-exam analytics
│   ├── middleware/
│   │   └── auth.js           # JWT protect + role restriction
│   └── index.js              # Express + Socket.IO server
│
└── client/                   # React + Vite frontend
    └── src/
        ├── context/
        │   └── AuthContext.jsx        # JWT auth state
        ├── hooks/
        │   └── useBehavioralTracker.js  # Core tracking hook
        ├── pages/
        │   ├── AuthPage.jsx           # Login + Register
        │   ├── Dashboard.jsx          # Analytics overview
        │   ├── ExamsPage.jsx          # Exam listing
        │   ├── CreateExam.jsx         # Instructor exam builder
        │   ├── ExamRoom.jsx           # Student exam taking
        │   ├── MonitorPage.jsx        # Real-time instructor view
        │   └── SessionReview.jsx      # Per-session deep dive
        └── components/
            └── Layout.jsx             # Sidebar navigation
```

## 🚀 Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas)

### 1. Clone & Install

```bash
cd exam-guard
npm run install:all
```

### 2. Configure Backend

```bash
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT secret
```

### 3. Run Development Servers

```bash
# Install concurrently at root first
npm install

# Start both servers
npm run dev
```

Or separately:
```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

### 4. Open in Browser

```
http://localhost:5173
```

## 👥 User Roles

| Role | Capabilities |
|---|---|
| **Student** | Take exams, see own results |
| **Instructor** | Create exams, monitor sessions live, review analytics |
| **Admin** | All instructor capabilities |

## 📊 Anomaly Scoring

Scores are calculated automatically from behavioral events:

- Each tab switch: +10 points (max 30)
- Each copy/paste attempt: +15 points (max 25)
- Each window blur: +8 points (max 20)
- Each dev tools attempt: +20 points (max 30)
- Each fullscreen exit: +12 points (max 20)
- Each keyboard shortcut: +5 points (max 15)

**Risk Levels:**
- 🟢 Low: 0–24
- 🟡 Medium: 25–49
- 🟠 High: 50–74
- 🔴 Critical: 75–100 (auto-flagged)

## 🔌 Real-time Monitoring

Instructors can watch active exams in real-time. As students trigger behavioral events, the instructor's monitor page updates instantly via WebSocket (Socket.IO), showing live anomaly scores, risk levels, and a color-coded grid of all students.

## 📡 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/exams
POST   /api/exams
GET    /api/exams/:id
PUT    /api/exams/:id
DELETE /api/exams/:id

POST   /api/sessions/start
POST   /api/sessions/:id/event
POST   /api/sessions/:id/answer
POST   /api/sessions/:id/submit
GET    /api/sessions/:id
GET    /api/sessions/exam/:examId
GET    /api/sessions/my/sessions

GET    /api/analytics/dashboard
GET    /api/analytics/exam/:examId
```

## 🔒 Privacy & Ethics

ExamGuard is designed with privacy in mind:
- ❌ No webcam access
- ❌ No screen recording
- ❌ No microphone
- ❌ No keystroke logging of content
- ✅ Only browser behavioral metadata
- ✅ All data stored in your own MongoDB instance
- ✅ Students can see their risk status in real-time
