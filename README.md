# 🚚 FreightFlow

**Modern Full-Stack Logistics & Freight Management Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4%2B-green)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-lightgrey)](https://expressjs.com/)
[![Phase 1](https://img.shields.io/badge/Phase%201-Complete-success)](https://github.com/aayush-1o/truck)

> A comprehensive logistics management system connecting Admins, Shippers, and Drivers through an intuitive platform with real-time tracking, secure authentication, and powerful APIs.

## 🎯 Current Status: **Phase 1 Complete (100%)** ✅

**What's Live:**
- ✅ Full authentication system (login, register, JWT)
- ✅ Dynamic dashboards for all roles (Admin, Shipper, Driver)
- ✅ Real-time data integration with MongoDB
- ✅ Quote calculator with dynamic pricing
- ✅ RESTful API with 20+ endpoints
- ✅ Responsive UI with modern design

**Next Phase:** Real-time tracking, payments, and deployment 🚀

[Features](#-features) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Tech Stack](#-tech-stack) • [Documentation](#-documentation)

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Environment Setup](#-environment-setup)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 About

FreightFlow is a production-ready, full-stack logistics management platform designed to streamline freight operations. Built with modern technologies and best practices, it provides:

- **Role-Based Dashboards**: Separate interfaces for Admins, Shippers, and Drivers
- **Real-Time Tracking**: Live shipment status updates and GPS integration ready
- **Secure Authentication**: JWT-based authentication with role-based access control
- **RESTful API**: Complete backend API with 20+ endpoints
- **Scalable Architecture**: Built for growth with MongoDB and Node.js

**Perfect for:** Logistics companies, freight brokers, transportation management, and supply chain operations.

---

## ✨ Features

### 🔐 **Authentication & Security**
- ✅ Secure JWT-based authentication
- ✅ Role-based authorization (Admin, Shipper, Driver)
- ✅ Password hashing with bcrypt
- ✅ Protected API routes with middleware
- ✅ Session management with localStorage
- ✅ Auto-redirect on authentication status

### 📊 **Dynamic Dashboards** (Phase 1 ✅)
- ✅ **Admin Dashboard**: User management, platform analytics, shipment monitoring
- ✅ **Shipper Dashboard**: Create/track shipments, view statistics, manage bookings
- ✅ **Driver Dashboard**: Assigned jobs, earnings tracker, status updates
- ✅ Real-time data fetching from MongoDB
- ✅ Role-based access control
- ✅ Responsive design for all devices

### 🚚 **Shipment Management**
- ✅ Complete CRUD operations for shipments
- ✅ Unique tracking ID generation
- ✅ Status tracking (Pending → In-Transit → Delivered)
- ✅ Route visualization (pickup/delivery locations)
- ✅ Weight and vehicle type management
- 🔄 Real-time tracking (Phase 2)
- 🔄 GPS integration (Phase 2)

### 💰 **Quote Calculator** (Phase 1 ✅)
- ✅ Dynamic price calculation based on:
  - Distance estimation
  - Weight multipliers
  - Vehicle type rates
  - Fuel costs
  - Toll charges
  - Platform fee (15%)
- ✅ Detailed price breakdown
- ✅ Real-time calculation
- ✅ Professional quote display

### 👥 **User Management**
- ✅ User registration with role selection
- ✅ Profile management
- ✅ User statistics and analytics
- ✅ Admin user management panel
- 🔄 Email verification (Phase 2)
- 🔄 Password reset flow (Phase 2)

### 🎨 **Modern UI/UX**
- ✅ Tailwind CSS styling
- ✅ Lucide icons
- ✅ AOS animations
- ✅ Responsive mobile-first design
- ✅ Loading states and notifications
- ✅ Error handling with user feedback

### 🔄 **Upcoming Features** (Phase 2)

- ✅ Password hashing with bcrypt
- ✅ Password reset via email
- ✅ Protected API endpoints
- ✅ Input validation and sanitization


#### Admin Dashboard
- User management (create, update, deactivate)
- Shipment oversight and analytics
- Driver management and verification
- System statistics and reports
- Role assignment and permissions

#### Shipper Dashboard
- Create and manage shipments
- Real-time shipment tracking
- Quote requests and pricing
- Payment history
- Delivery confirmations

#### Driver Dashboard
- View assigned shipments
- Update shipment status
- Location tracking
- Earnings and statistics
- Availability management

### 🚀 **Backend API**
- ✅ RESTful API architecture
- ✅ 20+ endpoints with full CRUD operations
- ✅ Mongoose ODM for MongoDB
- ✅ Comprehensive error handling
- ✅ Request validation middleware
- ✅ API documentation ready

### 📦 **Shipment Management**
- Auto-generated tracking IDs
- Status history tracking
- Pickup and delivery location management
- Dynamic pricing calculation
- Vehicle type selection
- Cargo weight and description
- Rating and review system

### 🎨 **Modern Frontend**
- Clean, professional UI design
- Fully responsive (mobile, tablet, desktop)
- Tailwind CSS styling
- Smooth animations and transitions
- Intuitive user experience
- Form validation

---

## 🛠️ Tech Stack

### **Frontend**
- **HTML5** - Semantic markup
- **CSS3** - Tailwind CSS framework
- **JavaScript** - Vanilla JS for DOM manipulation
- **Responsive Design** - Mobile-first approach

### **Backend**
- **Node.js** (v18+) - Runtime environment
- **Express.js** (v5.x) - Web framework
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Nodemailer** - Email service
- **express-validator** - Input validation

### **Database**
- **MongoDB** (4.4+) - NoSQL database
- **Mongoose** - Schema modeling

### **Development Tools**
- **Git** - Version control
- **npm** - Package management
- **dotenv** - Environment variables
- **Nodemon** - Development server

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (v4.4 or higher)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aayush-1o/truck.git
   cd truck
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env with your configuration
   # Required: MONGODB_URI, JWT_SECRET
   # Optional: EMAIL_USER, EMAIL_PASS
   ```

4. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open the application**
   - Backend API: http://localhost:5000
   - Frontend: Open `index.html` in a browser or use Live Server

---

## 📁 Project Structure

```
freightflow/
│
├── models/                     # Database models
│   ├── User.js                 # User authentication model
│   ├── Shipment.js             # Shipment tracking model
│   ├── Driver.js               # Driver profile model
│   └── Payment.js              # Payment transaction model
│
├── routes/                     # API route handlers
│   ├── shipments.js            # Shipment endpoints
│   ├── users.js                # User management endpoints
│   └── drivers.js              # Driver endpoints
│
├── middleware/                 # Express middleware
│   ├── auth.js                 # JWT authentication
│   └── validator.js            # Request validation
│
├── pages/                      # Frontend pages
│   ├── admin-dashboard.html    # Admin interface
│   ├── shipper-dashboard.html  # Shipper interface
│   ├── driver-dashboard.html   # Driver interface
│   ├── login.html              # Login page
│   ├── register.html           # Registration page
│   └── forgot-password.html    # Password recovery
│
├── assets/                     # Static assets
│   ├── css/
│   │   └── style.css           # Global styles
│   ├── js/
│   │   └── script.js           # Frontend logic
│   └── images/                 # Image assets
│
├── server.js                   # Express server entry point
├── index.html                  # Landing page
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies
└── README.md                   # Documentation
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/register` | Register new user | ❌ |
| `POST` | `/login` | Login user | ❌ |
| `POST` | `/forgot-password` | Request password reset | ❌ |
| `POST` | `/verify-token` | Verify reset token | ❌ |
| `POST` | `/reset-password` | Reset password | ❌ |

### Shipment Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| `POST` | `/shipments` | Create shipment | ✅ | Shipper |
| `GET` | `/shipments` | Get all shipments | ✅ | All |
| `GET` | `/shipments/:id` | Get single shipment | ✅ | All |
| `PUT` | `/shipments/:id` | Update shipment | ✅ | Shipper/Admin |
| `PATCH` | `/shipments/:id/status` | Update status | ✅ | Driver/Admin |
| `DELETE` | `/shipments/:id` | Cancel shipment | ✅ | Shipper/Admin |
| `GET` | `/shipments/track/:trackingId` | Public tracking | ❌ | - |

### User Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| `GET` | `/users` | Get all users | ✅ | Admin |
| `GET` | `/users/profile` | Get profile | ✅ | All |
| `PUT` | `/users/profile` | Update profile | ✅ | All |
| `DELETE` | `/users/:id` | Deactivate user | ✅ | Admin |
| `PATCH` | `/users/:id/role` | Update role | ✅ | Admin |
| `GET` | `/users/stats` | Get statistics | ✅ | Admin |

### Driver Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| `POST` | `/drivers` | Create driver profile | ✅ | Driver |
| `GET` | `/drivers` | Get all drivers | ✅ | Admin/Shipper |
| `GET` | `/drivers/profile` | Get driver profile | ✅ | Driver |
| `PUT` | `/drivers/location` | Update location | ✅ | Driver |
| `PATCH` | `/drivers/availability` | Toggle availability | ✅ | Driver |
| `GET` | `/drivers/earnings` | Get earnings | ✅ | Driver |
| `PUT` | `/drivers/profile` | Update profile | ✅ | Driver |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |

---

## ⚙️ Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/freightflow
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/freightflow

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5500

# Email Configuration (Optional - for password reset)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Future: Payment Gateway (Phase 3)
# RAZORPAY_KEY_ID=your_razorpay_key_id
# RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

## 💻 Development

### Running in Development Mode

```bash
# Start server with auto-reload
npm run dev

# Or
npm start
```

### API Testing

Use tools like [Postman](https://www.postman.com/) or [Thunder Client](https://www.thunderclient.com/) to test endpoints.

**Example: Register a new user**
```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "password123",
    "role": "shipper"
  }'
```

**Example: Login**
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Database Management

View and manage your MongoDB data using:
- [MongoDB Compass](https://www.mongodb.com/products/compass) (GUI)
- `mongosh` (CLI)

---

## 🚢 Deployment

### MongoDB Atlas (Production Database)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Update `MONGODB_URI` in production environment

### Backend Deployment Options

- **Render** (Recommended) - https://render.com
- **Railway** - https://railway.app
- **Heroku** - https://heroku.com
- **DigitalOcean** - https://www.digitalocean.com

### Frontend Deployment Options

- **Vercel** - https://vercel.com
- **Netlify** - https://netlify.com
- **GitHub Pages** - https://pages.github.com

---

## 🗺️ Roadmap

### ✅ Phase 1: Backend Foundation (COMPLETED)
- [x] Database models & schemas
- [x] RESTful API endpoints
- [x] JWT authentication
- [x] Input validation
- [x] Error handling

### 🚧 Phase 2: Frontend Integration (In Progress)
- [ ] Connect dashboards to APIs
- [ ] Real-time data updates
- [ ] Form submissions to backend
- [ ] User session management

### 📅 Phase 3: Advanced Features
- [ ] Real-time tracking with WebSockets
- [ ] GPS integration (OpenStreetMap)
- [ ] Payment gateway (Razorpay)
- [ ] Email notifications
- [ ] File uploads (invoices, POD)

### 📅 Phase 4: Testing & QA
- [ ] Unit tests
- [ ] Integration tests
- [ ] Security testing
- [ ] Performance optimization

### 📅 Phase 5: Production Deployment
- [ ] Environment configuration
- [ ] CI/CD pipeline
- [ ] Monitoring & logging
- [ ] Documentation

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Aayush**
- GitHub: [@aayush-1o](https://github.com/aayush-1o)
- Email: ayushh.ofc10@gmail.com

---

## 🙏 Acknowledgments

- MongoDB for database infrastructure
- Express.js community for excellent documentation
- Tailwind CSS for the styling framework
- All open-source contributors

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on [GitHub Issues](https://github.com/aayush-1o/truck/issues)
- Email: ayushh.ofc10@gmail.com

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by Aayush

</div>
