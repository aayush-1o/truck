# 🚛 FreightFlow — Logistics & Freight Management Platform

> A full-stack logistics platform for shippers, drivers, and admins — built with **Node.js**, **Express**, **MongoDB**, and **Vanilla JS**.

[![Phase](https://img.shields.io/badge/Phase-4%20Complete-brightgreen)](https://github.com/aayush-1o/truck)
[![Live](https://img.shields.io/badge/Live-truck--production.up.railway.app-blue)](https://truck-production.up.railway.app)
[![Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20MongoDB-blue)](https://github.com/aayush-1o/truck)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📸 Overview

FreightFlow is a role-based freight management platform:

- **Shippers** create and track shipments
- **Drivers** manage pickups and deliveries
- **Admins** oversee all users and shipments

---

## ✅ Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Backend APIs, Authentication, Database Models |
| Phase 2 | ✅ Complete | Frontend-Backend Integration, Real Dashboards |
| Phase 3 | ✅ Complete | Payments (Razorpay), Real-time Tracking, Notifications |
| Phase 4 | ✅ Complete | Analytics Charts, Live Map, Rating System, Dark Mode, Email Alerts |

🌐 **Live Demo:** https://truck-production.up.railway.app

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT, bcryptjs |
| **Frontend** | HTML5, Tailwind CSS, Vanilla JS |
| **Real-time** | Socket.io |
| **Maps** | Leaflet.js (OpenStreetMap) |
| **Charts** | Chart.js |
| **Payments** | Razorpay (test mode) |
| **Email** | Nodemailer |
| **Hosting** | Railway (backend) + MongoDB Atlas (DB) |
| **Icons** | Lucide Icons |

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/aayush-1o/truck.git
cd truck
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
MONGODB_URI=mongodb://localhost:27017/freightflow
JWT_SECRET=your_jwt_secret_here
PORT=5000

# Optional - for forgot-password emails
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
```

### 4. Install & Start MongoDB (Mac)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### 5. Create Admin Account
```bash
node seed.js
```
**Admin credentials:** `admin@freightflow.com` / `admin123456`

### 6. Start the Server
```bash
npm start
```

Open → **http://localhost:5000/pages/login.html**

---

## 📂 Project Structure

```
truck/
├── server.js                    # Express server + auth routes
├── seed.js                      # Admin user creator
├── .env                         # Environment config
│
├── models/
│   ├── User.js                  # User schema (admin/shipper/driver)
│   ├── Shipment.js              # Shipment schema + tracking
│   └── Driver.js                # Driver profile + stats
│
├── routes/
│   ├── shipments.js             # CRUD, tracking, status updates
│   ├── users.js                 # User management (admin)
│   └── drivers.js               # Driver profiles, stats, availability
│
├── middleware/
│   ├── auth.js                  # JWT protect + role authorize
│   └── validator.js             # Input validation
│
├── pages/
│   ├── login.html               # Login → role-based redirect
│   ├── register.html            # New account creation
│   ├── forgot-password.html     # Request password reset
│   ├── reset-password.html      # Set new password via token
│   ├── admin-dashboard.html     # Admin view (all users + shipments)
│   ├── shipper-dashboard.html   # Shipper view (create + track)
│   └── driver-dashboard.html    # Driver view (jobs + earnings)
│
└── assets/
    ├── js/
    │   ├── api-client.js        # Central API client + auth guard
    │   ├── admin-dashboard.js   # Admin dashboard logic
    │   ├── shipper-dashboard.js # Shipper dashboard logic
    │   └── driver-dashboard.js  # Driver dashboard logic
    └── css/
        └── style.css
```

---

## 🔌 API Reference

### Auth Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/register` | Public | Register new user |
| `POST` | `/api/login` | Public | Login + get JWT token |
| `POST` | `/api/forgot-password` | Public | Request password reset email |
| `POST` | `/api/verify-token` | Public | Validate reset token |
| `POST` | `/api/reset-password` | Public | Set new password |

### Shipment Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/shipments` | Shipper | Create shipment |
| `GET` | `/api/shipments` | All | Get shipments (role-filtered) |
| `GET` | `/api/shipments/track/:id` | Public | Track by tracking ID |
| `GET` | `/api/shipments/:id` | Authorized | Get single shipment |
| `PATCH` | `/api/shipments/:id/status` | Driver/Admin | Update status |
| `PUT` | `/api/shipments/:id` | Shipper/Admin | Edit shipment |
| `DELETE` | `/api/shipments/:id` | Shipper/Admin | Cancel shipment |

### User Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users` | Admin | All users |
| `GET` | `/api/users/profile` | Private | Current user profile |
| `PUT` | `/api/users/profile` | Private | Update profile |
| `GET` | `/api/users/stats` | Admin | User statistics |
| `PATCH` | `/api/users/:id/role` | Admin | Change user role |
| `DELETE` | `/api/users/:id` | Admin | Deactivate user |

### Driver Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/drivers` | Driver | Create driver profile |
| `GET` | `/api/drivers` | Admin/Shipper | All drivers |
| `GET` | `/api/drivers/profile` | Driver | Own profile |
| `GET` | `/api/drivers/stats` | Driver | Earnings + stats |
| `PUT` | `/api/drivers/profile` | Driver | Update profile |
| `PUT` | `/api/drivers/location` | Driver | Update location |
| `PATCH` | `/api/drivers/availability` | Driver | Toggle availability |
| `GET` | `/api/drivers/earnings` | Driver | Earnings history |

---

## 👤 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | View all users, all shipments, manage roles |
| **Shipper** | Create shipments, view own shipments, track deliveries |
| **Driver** | Accept jobs, update delivery status, manage availability |

---

## 🔒 Security

- Passwords hashed with **bcrypt** (salt rounds: 12)
- Authentication via **JWT** (7-day expiry)
- Role-based route protection middleware
- Password reset tokens expire after 1 hour

---

## 📧 Contact

**Ayush** — [ayushh.ofc10@gmail.com](mailto:ayushh.ofc10@gmail.com)

GitHub: [@aayush-1o](https://github.com/aayush-1o)
