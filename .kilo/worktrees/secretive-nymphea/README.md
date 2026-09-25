# Help Center Backend API

A comprehensive backend API for managing a help center with patients, doctors, agents, appointments, tests, and file uploads.

## Features

- **Admin Authentication** with JWT + OTP via email
- **Patient Management** (CRUD)
- **Doctor Management** (CRUD)
- **Agent Management** (CRUD)
- **Appointment Booking** (Online: 50 BDT, Package: 500 BDT)
- **Test Management** with flexible discount tracking
- **File Upload** (prescriptions, receipts, reports)
- **Auto Verification** - appointments auto-completed after 7 days
- **Email Notifications** (OTP, appointment confirmation, reminders)

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: JWT
- **Email**: Nodemailer (Gmail SMTP)
- **File Upload**: Multer
- **Validation**: Joi

## Project Structure

```
help-center-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── patientController.js
│   │   ├── doctorController.js
│   │   ├── agentController.js
│   │   ├── appointmentController.js
│   │   ├── testController.js
│   │   └── uploadController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── agentRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── testRoutes.js
│   │   └── uploadRoutes.js
│   ├── services/
│   │   ├── emailService.js
│   │   └── otpService.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── validation.js
│   │   └── upload.js
│   ├── utils/
│   │   ├── responseHandler.js
│   │   ├── seed.js
│   │   └── autoVerification.js
│   ├── prisma/
│   │   ├── client.js
│   │   └── schema.prisma
│   ├── app.js
│   └── server.js
├── prisma/
│   └── schema.prisma
├── uploads/
│   ├── prescriptions/
│   ├── receipts/
│   └── reports/
├── .env.example
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- PostgreSQL (Neon account recommended)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd help-center-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migration
npm run prisma:migrate

# Seed the database with dummy data
npm run seed

# Start development server
npm run dev
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create and apply migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Seed database with dummy data |

## Environment Variables

```
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
DATABASE_URL=your_postgresql_connection_string
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=your_gmail@gmail.com
APP_NAME=Help Center
ADMIN_EMAIL=admin@helpcenter.com
ADMIN_PASSWORD=admin123
```

## API Endpoints

All responses follow this format:

```json
{
  "success": true,
  "message": "Success message",
  "data": {},
  "error": null
}
```

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register a new admin | ❌ |
| POST | `/login` | Login with email/password, sends OTP to email | ❌ |
| POST | `/verify-otp` | Verify OTP and receive JWT token | ❌ |
| GET | `/me` | Get current admin profile | ✅ |
| PUT | `/change-password` | Change admin password | ✅ |
| POST | `/logout` | Logout | ❌ |

### Patients (`/api/patients`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all patients | ✅ |
| POST | `/` | Create a patient | ✅ |
| GET | `/:id` | Get a single patient | ✅ |
| PUT | `/:id` | Update a patient | ✅ |
| DELETE | `/:id` | Delete a patient | ✅ |

### Doctors (`/api/doctors`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all doctors | ✅ |
| POST | `/` | Create a doctor | ✅ |
| GET | `/:id` | Get a single doctor | ✅ |
| PUT | `/:id` | Update a doctor | ✅ |
| DELETE | `/:id` | Delete a doctor | ✅ |

### Agents (`/api/agents`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all agents | ✅ |
| POST | `/` | Create an agent | ✅ |
| GET | `/:id` | Get a single agent | ✅ |
| PUT | `/:id` | Update an agent | ✅ |
| DELETE | `/:id` | Delete an agent | ✅ |

### Appointments (`/api/appointments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all appointments | ✅ |
| POST | `/` | Create an appointment | ✅ |
| GET | `/:id` | Get a single appointment | ✅ |
| PUT | `/:id` | Update an appointment (status) | ✅ |
| DELETE | `/:id` | Delete an appointment | ✅ |
| GET | `/patient/:patientId` | Get appointments by patient | ✅ |
| GET | `/date/:date` | Get appointments by date | ✅ |

**Service Types:**
- `online` - 50 BDT
- `package` - 500 BDT

**Appointment Status:** `pending`, `confirmed`, `completed`, `cancelled`

### Tasks (`/api/tasks`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all tasks (agent sees own; admin sees all) | ✅ |
| GET | `/tracking` | Task-tracking view (super admin sees every agent's live status + timer) | ✅ |
| GET | `/:id` | Get a single task | ✅ |
| PUT | `/:id` | Update a task | ✅ |
| PUT | `/:id/status` | Update task status (also sets timing fields) | ✅ |
| PUT | `/:id/receive` | Agent receives task → `RECEIVED` + `receiveTime` | ✅ |
| PUT | `/:id/start` | Agent receives patient → `IN_PROGRESS` + `startTime` (timer) | ✅ |
| PUT | `/:id/end` | Agent ends task → `SERVICE_COMPLETED` + `endTime` | ✅ |
| PUT | `/:id/approve` | Super admin approves completion → `COMPLETED` | ✅ |

**Task Status:** `ASSIGNED`, `RECEIVED`, `IN_PROGRESS`, `SERVICE_COMPLETED`, `COMPLETED`

> The agent's "Receive Task" / "Receive Patient" actions write to the shared `Task` table, so the super admin's `GET /api/tasks/tracking` reflects the **exact same status and timer in real time** — no extra sync is required. The dashboard stats (`GET /api/dashboard`) now also include `totalTasks`, `taskStatusCounts` and `agentTasks` for the super admin.

### Tests (`/api/tests`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all tests | ✅ |
| POST | `/` | Create a test | ✅ |
| GET | `/:id` | Get a single test | ✅ |
| PUT | `/:id` | Update a test (discount) | ✅ |
| DELETE | `/:id` | Delete a test | ✅ |
| GET | `/appointment/:appointmentId` | Get tests by appointment | ✅ |

**Note:** Admin can set any discount percentage (not limited to specific values).

**Test Status:** `pending`, `done`

### Upload (`/api/upload`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/single` | Upload a single file | ✅ |
| POST | `/multiple` | Upload multiple files | ✅ |

**Query parameter:** `?type=prescriptions|receipts|reports`

## Authentication Flow

1. **Register**: Create an admin account with email, password, and name
2. **Login**: Enter email and password - system sends OTP to email
3. **Verify OTP**: Enter the OTP received via email - system returns JWT token
4. **Use API**: Include JWT in `Authorization: Bearer <token>` header

## Auto Verification

The system automatically marks appointments as `completed` after 7 days if they are still in `pending` status. This runs every 6 hours.

## Seed Data

The seed creates:
- 1 Admin (admin@helpcenter.com / admin123)
- 3 Doctors (Cardiology, Gynecology, Orthopedics)
- 2 Agents
- 2 Patients (for testing)

## License

ISC
# totala_backend
