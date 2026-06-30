# RecruitCore - Applicant Tracking System (ATS)

RecruitCore is a secure, responsive, full-stack Applicant Tracking System (ATS) designed to streamline candidate sourcing, interview scheduling, selections logging, onboarding, and analytical reporting.

---

## 📂 Folder Structure

```text
/
├── .env.example              # Example environment configurations
├── package.json              # App dependencies & scripts
├── tsconfig.json             # TypeScript settings
├── vite.config.ts            # Vite bundler options
├── server.ts                 # Full-stack Express server endpoints & routing
├── server-db.ts              # Local persistent JSON-backed Database layer
├── db.json                   # Generated state database (with seed data)
└── src/
    ├── main.tsx              # Application client-side entry point
    ├── index.css             # Tailwind CSS global styles
    ├── App.tsx               # App router & core layout
    ├── types.ts              # Sync'd TypeScript types, enums and metrics
    └── components/
        ├── LoginView.tsx     # Session authentication with quick demo access
        ├── Sidebar.tsx       # Dynamic navigation sidebar with profile badges
        ├── DashboardView.tsx # Sourcing aggregates, throughput leaderboard, & yield funnel
        ├── CandidatesView.tsx# Candidate search grid, status pills, and workflow triggers
        ├── CandidateForm.tsx # Resume profiles sourcing & phone duplication check form
        ├── InterviewsView.tsx# Technical rounds schedule, reschedule & remarks log
        ├── PipelineView.tsx  # Interview selections board and onboarding milestones
        ├── ReportsView.tsx   # Sourcing yield aggregates and print-ready summary sheets
        └── UsersView.tsx     # HR recruiters roster directory & clearance configuration
```

---

## 🗄️ Database Schema

The database model is managed via a local relational-like schema mapped to a synchronized persistent `db.json` file. It enforces relational mapping, non-duplicate unique indices, and initial database seeding.

### Entities

1. **User (Recruiter)**
   - `id`: unique string (primary key)
   - `name`: string
   - `email`: unique string
   - `role`: `UserRole` (`Admin` | `Team Leader` | `HR Recruiter`)
   - `passwordHash`: encrypted credential hash
   - `createdAt`: ISO timestamp

2. **Candidate**
   - `id`: unique string (primary key)
   - `name`: string
   - `mobile`: unique string (duplicate check constraint enforced before save)
   - `email`: string
   - `location`: string
   - `currentCompany`: string
   - `currentSalary`: number (Annual INR)
   - `expectedSalary`: number (Annual INR)
   - `experience`: number (Years)
   - `noticePeriod`: number (Days)
   - `skills`: string[] (tags list)
   - `recruiterId`: foreign key mapping to `User`
   - `recruiterName`: string (denormalized for quick performance reads)
   - `source`: string
   - `callDate`: date string
   - `remarks`: string
   - `status`: `CandidateStatus` (`Interested` | `Not Interested` | `Follow-up` | `Call Back Later` | `Wrong Number`)

3. **Interview**
   - `id`: unique string (primary key)
   - `candidateId`: foreign key mapping to `Candidate`
   - `candidateName`: string (denormalized)
   - `date`: date string
   - `time`: time string
   - `client`: string
   - `position`: string
   - `interviewMode`: `InterviewMode` (`Online` | `Offline` | `Telephonic`)
   - `status`: `InterviewStatus` (`Scheduled` | `Attended` | `No Show` | `Rescheduled`)
   - `remarks`: string
   - `scheduledBy`: foreign key mapping to `User`

4. **Selection**
   - `id`: unique string (primary key)
   - `candidateId`: foreign key mapping to `Candidate`
   - `candidateName`: string
   - `status`: `SelectionStatus` (`Selected` | `Rejected` | `Hold` | `Pending`)
   - `date`: date string
   - `remarks`: string
   - `updatedBy`: foreign key mapping to `User`

5. **Joining**
   - `id`: unique string (primary key)
   - `candidateId`: foreign key mapping to `Candidate`
   - `candidateName`: string
   - `offerReleased`: boolean
   - `joiningDate`: date string
   - `status`: `JoiningStatus` (`Pending` | `Joined` | `Did Not Join`)
   - `remarks`: string
   - `updatedBy`: foreign key mapping to `User`

---

## 🔒 Security & Access Matrix

System functionalities are secured by a role clearance middleware:

| Role clearance | Dashboard | Sourced pool | Add Candidate | Schedule Interview | Log Verdict / Selection | Onboard / Joining | Roster roster | Delete Records |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Manage) | ✅ |
| **Team Leader** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Read) | ✅ |
| **HR Recruiter** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (Read) | ❌ |

---

## 🔌 API Documentation

All request payloads are validated, and session authorizations require sending an `Authorization: Bearer <userId>` header.

### Authentication

- **POST `/api/auth/login`**: Authenticate credentials. Returns session tokens.
- **GET `/api/auth/me`**: Recover user profile from tokens.

### Candidate Pool

- **GET `/api/candidates`**: Search and filter candidate rosters.
- **POST `/api/candidates`**: Sift new profiles. Enforces unique mobile validation.
- **PUT `/api/candidates/:id`**: Update candidate records.
- **DELETE `/api/candidates/:id`**: Remove candidates (Admin/TL clearance only).

### Interview Module

- **GET `/api/interviews`**: Return scheduled evaluation slots.
- **POST `/api/interviews`**: Log a new interview slot.
- **PUT `/api/interviews/:id`**: Update interview statuses and rescheduling.
- **DELETE `/api/interviews/:id`**: Delete interview session (Admin/TL clearance only).

### Selections & Onboarding

- **GET `/api/selections`**: Fetch selection lists.
- **POST `/api/selections`**: Save verdict metrics (Admin/TL clearance only).
- **GET `/api/joinings`**: Fetch onboarding join lists.
- **POST `/api/joinings`**: Save joining date parameters (Admin/TL clearance only).

### Administration & Reports

- **GET `/api/users`**: Fetch registered system users.
- **POST `/api/users`**: Add a new recruiter (Admin clearance only).
- **GET `/api/dashboard/stats`**: Sourced pipelines counts aggregates.
- **GET `/api/dashboard/reports`**: Recruiter Leaderboard and yield conversion analytics reports.

---

## ⚙️ Environment Variables (`.env.example`)

```env
# APP_URL: The URL where this applet is hosted.
# AI Studio automatically injects this at runtime with the Cloud Run service URL.
APP_URL="MY_APP_URL"
```

---

## 🚀 Installation & Local Development

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Local Dev Server (Vite + Express)
```bash
npm run dev
```
The server automatically boots on **port 3000** at `http://localhost:3000`.

### 3. Build & Run Production Bundle
```bash
npm run build
npm start
```
