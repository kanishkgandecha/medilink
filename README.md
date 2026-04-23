# MediLink — Hospital Management System

A full-stack MERN hospital management platform supporting role-based access for Admins, Doctors, Nurses, Receptionists, Pharmacists, Lab Technicians, Ward Managers, and Patients.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT (httpOnly-compatible), bcrypt |
| UI | Lucide Icons, React Toastify |

## Features

- **Role-based dashboards** — each role sees only relevant data and navigation
- **Appointments** — book, reschedule, cancel; double-booking prevention; auto-generates consultation bill on completion
- **Prescriptions** — doctors write, pharmacists fulfil; auto-generates medicine bill on fulfilment
- **Pharmacy** — medicine inventory management with stock tracking
- **Billing** — consultation and medicine bills; payment recording; insurance claims
- **Wards & Beds** — ward creation, bed allocation and release
- **Test Reports** — lab report upload and viewing per patient
- **Staff Management** — create Staff accounts (Nurse, Receptionist, Pharmacist, Lab Technician, Ward Manager) with phone-number default password
- **Doctor Management** — create Doctor profiles atomically; phone-number default password
- **Change Password** — in-app password change from the header profile menu

## Roles & Access

| Role | Key Pages |
|---|---|
| Admin | All pages |
| Doctor | Dashboard, Appointments, Patients, Prescriptions, Reports |
| Nurse | Dashboard, Patients, Wards, Tasks |
| Receptionist | Dashboard, Appointments, Patients, Billing |
| Pharmacist | Dashboard, Pharmacy, Prescriptions, Billing |
| Lab Technician | Dashboard, Test Reports, Patients |
| Ward Manager | Dashboard, Wards & Beds, Patients |
| Patient | Dashboard, Appointments, Prescriptions, Billing, Test Reports |

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas account (or local MongoDB)

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/kanishkgandecha/Medilink.git
cd Medilink
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/medilink?retryWrites=true&w=majority
JWT_SECRET=your_strong_random_secret_here
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:3000

# Optional — for password reset emails
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=MediLink <noreply@medilink.com>
```

Start the backend (with hot-reload):

```bash
npm run dev        # nodemon — auto-restarts on file changes
# or
npm start          # plain node
```

The API will be available at `http://localhost:5001`.

### 3. Frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_BACKEND_URL=http://localhost:5001
VITE_APP_NAME=MediLink HMS
VITE_API_TIMEOUT=30000
```

Start the frontend dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 4. Seed demo data (optional)

```bash
cd backend
node seed.js
```

This creates demo accounts for each role. Default credentials are printed to the console after seeding.

## Default Passwords

When an Admin creates a Doctor or Staff member via the UI, the account's **default password is set to the user's phone number**. The user should change it on first login via the profile dropdown → **Change Password**.

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Self-register (Patient role) |
| PUT | `/api/auth/update-password` | Change password |
| GET | `/api/patients` | List patients |
| POST | `/api/patients` | Create patient profile |
| GET | `/api/doctors` | List doctors |
| POST | `/api/doctors` | Create doctor + user account |
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Book appointment |
| PUT | `/api/appointments/:id` | Update / complete appointment |
| GET | `/api/prescriptions` | List prescriptions |
| POST | `/api/prescriptions` | Write prescription (Doctor) |
| PUT | `/api/prescriptions/:id/status` | Fulfil prescription (Pharmacist) |
| GET | `/api/billing` | List bills |
| POST | `/api/billing` | Create bill |
| POST | `/api/billing/:id/payment` | Record payment |
| GET | `/api/medicines` | List medicines |
| GET | `/api/wards` | List wards |
| POST | `/api/wards/:id/allocate` | Allocate bed |
| POST | `/api/wards/:id/release` | Release bed |
| GET | `/api/staff` | List staff |
| POST | `/api/staff` | Create staff + user account |
| GET | `/api/dashboards/:role` | Role-specific dashboard stats |

Full API documentation is available via the Postman collection in `backend/MediLink.postman_collection.json` (if present).

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5001) |
| `NODE_ENV` | No | `development` or `production` |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `JWT_EXPIRE` | No | Token expiry (default: `30d`) |
| `FRONTEND_URL` | No | Allowed CORS origin |
| `EMAIL_HOST` | No | SMTP host for password reset emails |
| `EMAIL_PORT` | No | SMTP port |
| `EMAIL_USER` | No | SMTP username |
| `EMAIL_PASS` | No | SMTP password / app password |
| `EMAIL_FROM` | No | Sender display name + address |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_BACKEND_URL` | Yes | Base URL of the backend API |
| `VITE_APP_NAME` | No | App title shown in UI |
| `VITE_API_TIMEOUT` | No | Axios timeout in ms (default: 30000) |

## Project Structure

```
Medilink/
├── backend/
│   ├── controllers/       # Route handler logic
│   ├── middleware/        # auth, error handler, rate limiter
│   ├── models/            # Mongoose schemas
│   ├── routes/            # Express routers
│   ├── utils/             # logger, email, asyncHandler
│   ├── seed.js            # Demo data seeder
│   └── server.js          # Entry point
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── common/    # Header, Sidebar, ProtectedRoute, modals
    │   │   └── dashboard/ # Per-role dashboard components
    │   ├── context/       # AuthContext, ThemeContext
    │   ├── pages/         # Full-page views (Patients, Billing, etc.)
    │   └── services/      # Axios API wrappers per domain
    └── vite.config.js
```

## Deployment

The app is deployed at:

- **Frontend:** [https://medilinkfinal-git-main-kanishks-projects-810056d9.vercel.app](https://medilinkfinal-git-main-kanishks-projects-810056d9.vercel.app)
- **Backend:** [https://medilink-oajt.onrender.com](https://medilink-oajt.onrender.com)

For production deployment, set `NODE_ENV=production` and update `FRONTEND_URL` / `VITE_BACKEND_URL` accordingly.

## Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT stored client-side; validated on every protected request
- Role + subRole checked server-side on every protected route (`authorize` middleware)
- Rate limiting on all API routes (stricter on `/api/auth`)
- Helmet + mongo-sanitize for XSS/NoSQL injection protection

## Authors

Kanan Goenka · Kanishk Gandecha · Keshav Rathi — 2025
