# Cobot Services - Fleet Management Platform

Fleet management system for Cobot Services, a robotic cleaning company in Doha, Qatar. Manages Robot Operators (ROs) who drive vans to deliver cleaning robots to customer locations.

## Architecture

| Component | Technology | Port |
|---|---|---|
| Backend API | Node.js + Express + Sequelize | 3000 |
| Admin Dashboard | React + Vite + Tailwind CSS | 5173 |
| Customer Portal | React + Vite + Tailwind CSS | 5174 |
| Mobile App (RO) | Flutter (Android + iOS) | - |
| IVD App | Flutter (Android, 1600x600) | - |
| Database | PostgreSQL + PostGIS | 5432 |
| Real-time | Socket.io | 3000 |

## Quick Start

### 1. Database (Docker)

```bash
docker-compose up postgres -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run dev
```

### 3. Admin Dashboard

```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:5173
# Login: admin@cobot.qa / admin123
```

### 4. Customer Portal

```bash
cd customer-portal
npm install
npm run dev
# Open http://localhost:5174
# Login: info@techplaza.qa / customer123
```

### 5. Mobile App

```bash
cd mobile_app
flutter pub get
flutter run
# Login: operator1@cobot.qa / oper123
```

### 6. IVD App

```bash
cd ivd_app
flutter pub get
flutter run
# Login: operator1@cobot.qa / oper123
```

## Business Flow

```
Supervisor creates job in Dashboard
    → Job assigned to RO + Vehicle + Robot
    → RO logs into IVD (in-vehicle Android device)
    → IVD shows today's jobs → RO taps "Start Driving"
    → IVD opens Google Maps → Background location tracking active
    → RO arrives at customer → IVD detects via GPS
    → Push notification sent to RO's phone
    → RO uses Mobile App for QR scans, robot deployment, report upload
    → Job marked complete → RO returns to IVD for next job
    → Supervisor sees everything in real-time on Dashboard
    → Customer views reports via Customer Portal
```

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@cobot.qa | admin123 |
| Supervisor | supervisor@cobot.qa | super123 |
| Operator 1 | operator1@cobot.qa | oper123 |
| Operator 2 | operator2@cobot.qa | oper123 |
| Driver | driver1@cobot.qa | driver123 |
| Customer | info@techplaza.qa | customer123 |

## API Documentation

All API endpoints are prefixed with `/api`. See `COBOT_SERVICES_CLAUDE_CODE_INSTRUCTIONS.md` for the full endpoint list.

### Key Endpoints

- `POST /api/auth/login` - Staff login
- `POST /api/auth/customer-login` - Customer portal login
- `GET /api/jobs/today` - Today's jobs
- `POST /api/location/update` - Vehicle location update
- `POST /api/qr/scan` - Process QR code scan
- `GET /api/analytics/overview` - Dashboard KPIs
