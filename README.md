# MediLink — Hospital Management System (PostgreSQL + Prisma)

A full-stack multi-specialty hospital management platform supporting role-based access for Admins, Doctors, Nurses, Receptionists, Pharmacists, Lab Technicians, Ward Managers, and Patients.

> **Database Architecture Update**: The backend has been fully migrated from MongoDB (Mongoose) to **PostgreSQL** using **Prisma ORM**. Complete data preservation, relational schema normalization, foreign key constraints, and 100% REST API compatibility have been implemented.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Vanilla CSS / Tailwind, React Router v6 |
| Backend | Node.js (v20), Express.js |
| Database | PostgreSQL 15 (Prisma ORM 5.19.0) |
| Containerization | Docker & Docker Compose |
| Auth | JWT, bcryptjs |
| AI Integration | OpenRouter API (OpenAI-compatible) with fallback rule-based mock engine |

---

## Docker Quick Start (Single Command)

Run the entire application stack (PostgreSQL + Backend + Frontend) using Docker Compose:

```bash
docker compose up --build
```

- **Frontend**: [http://localhost:3001](http://localhost:3001)
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **Health Check**: [http://localhost:5001/health](http://localhost:5001/health)

---

## Canonical Generalized Demo Logins

All seed passwords default to `Password123!` (configurable via `DEFAULT_SEED_PASSWORD` in `.env`).

| Role | Email | Password | User Details |
|---|---|---|---|
| **Admin** | `admin@medilink.com` | `Password123!` | System Admin (Full System Access) |
| **Doctor** | `doctor@medilink.com` | `Password123!` | Dr. Vikramaditya Mehta (Cardiology) |
| **Patient** | `patient@medilink.com` | `Password123!` | Rahul Gupta (Mumbai, MH) |
| **Nurse** | `nurse@medilink.com` | `Password123!` | Sister Deepa Pillai (Head ICU Nurse) |
| **Receptionist** | `receptionist@medilink.com` | `Password123!` | Sunita Verma (Front Desk Lead) |
| **Pharmacist** | `pharmacist@medilink.com` | `Password123!` | Amit Joshi (Chief Pharmacist) |
| **Lab Technician** | `labtech@medilink.com` | `Password123!` | Ramesh Kulkarni (Pathology Tech) |
| **Radiology Tech** | `radiology@medilink.com` | `Password123!` | Anil Saxena (Radiology Tech) |
| **Billing Staff** | `billing@medilink.com` | `Password123!` | Vijay Trivedi (Billing Manager) |

---

## AI Features & LLM Provider Configuration

MediLink includes an AI intelligence suite powering:
- **Symptom Analysis & Triage**: Analyzes patient symptoms and recommends appropriate specialists.
- **AI Bed Allocation**: Recommends optimal ward & bed placement based on urgency.
- **Admin & Operational Insights**: Analyzes hospital revenue, bed occupancy, and high-risk patients.
- **Pharmacy Inventory Alerts**: Flags expiring and low-stock medicines.
- **Patient Assistant Chatbot**: Guided AI assistant for navigation, appointments, and billing.

### Provider & Model Setup (OpenRouter)

The AI client connects via **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`) using an OpenAI-compatible API interface.

1. **Obtain API Key**:
   - Sign in to [https://openrouter.ai](https://openrouter.ai).
   - Generate an API key under **Keys** ([https://openrouter.ai/keys](https://openrouter.ai/keys)).
2. **Configure Environment Variables (`backend/.env`)**:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
   OPENROUTER_MODEL=openai/gpt-4o-mini
   ```
3. **Model Selection**:
   - Model selection is driven entirely via `OPENROUTER_MODEL` in `.env`.
   - Consult OpenRouter's model catalog ([https://openrouter.ai/models](https://openrouter.ai/models)) when selecting a model (e.g. `anthropic/claude-3.5-sonnet`, `google/gemini-2.5-flash`, `meta-llama/llama-3.3-70b-instruct`, `openai/gpt-4o-mini`).
4. **Local Fallback Mode**:
   - If `OPENROUTER_API_KEY` is commented out or missing, or if an LLM call times out (10s limit) or rate limits (429/5xx), MediLink automatically executes a rule-based mock response.

---

## Database Commands & Utilities

### 1. Seeding Deterministic Indian Hospital Data
Seed initial demo data into PostgreSQL:

```bash
# In local development
npm run seed --prefix backend

# Or via Docker
docker compose run seed
```

### 2. Database Migration Pipeline (MongoDB → PostgreSQL)

To migrate live or legacy MongoDB data into PostgreSQL:

```bash
cd backend

# Step A: Pre-migration MongoDB Backup
npm run backup:data

# Step B: Execute Automated Migration Script
npm run migrate:data

# Step C: Post-Migration Audit
npm run verify:data
```

---

## Authors

Kanan Goenka · Kanishk Gandecha · Keshav Rathi — 2025
