📦 FreightFlow

Modern Logistics & Freight Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[Features](#-features) • [Installation](#️-installation) • [Usage](#-usage) • [Contributing](#-contributing)


📖 About

FreightFlow is a comprehensive full-stack logistics management platform designed to streamline freight operations between Admins, Shippers, and Drivers. Built with modern web technologies, it provides an intuitive interface and robust backend to manage shipments, track deliveries, and optimize freight workflows.

Perfect for logistics companies, freight brokers, and transportation management needs.

✨ Features

🔐 Authentication & Security
- Secure user authentication with JWT
- Role-based access control (Admin, Shipper, Driver)
- Password reset & forgot-password workflow
- Protected routes and API endpoints

📊 Multi-Role Dashboards
- Admin Dashboard → Complete oversight: manage users, shipments, and drivers
- Shipper Dashboard → Create shipments, track status, manage deliveries
- Driver Dashboard → View assigned routes, update delivery progress in real-time

🎨 Modern UI/UX
- Clean, professional white-theme design
- Fully responsive across all devices
- Intuitive navigation and user flows
- Modular CSS architecture for easy customization

🖥️ Robust Backend
- RESTful API architecture
- Scalable Node.js + Express server
- Secure environment variable management
- Database-ready structure (MongoDB supported)


 🛠️ Tech Stack

Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Responsive Design

Backend
- Node.js
- Express.js
- RESTful API
- JWT Authentication

Database
- MongoDB
- Mongoose ODM
- (Easily adaptable)

Tools: Git, VS Code, Postman, npm


📁 Project Structure


freightflow/
│
├── assets/
│   ├── css/
│   │   └── style.css           # Global styles
│   ├── js/
│   │   └── script.js           # Frontend logic
│   ├── images/                 # Image assets
│   └── icons/                  # Icon files
│
├── pages/
│   ├── admin-dashboard.html    # Admin interface
│   ├── shipper-dashboard.html  # Shipper interface
│   ├── driver-dashboard.html   # Driver interface
│   ├── login.html              # Login page
│   ├── register.html           # Registration page
│   └── forgot-password.html    # Password recovery
│
├── server.js                   # Express server
├── index.html                  # Landing page
├── .env                        # Environment variables
├── package.json                # Dependencies
└── README.md                   # Documentation



⚙️ Installation

Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (or MongoDB Atlas account)
- Git

Step-by-Step Setup

1️⃣ Clone the Repository

git clone https://github.com/ayushkumar/freightflow.git
cd freightflow

2️⃣ Install Dependencies

bash
npm install


3️⃣ Configure Environment Variables

Create a `.env` file in the root directory:

env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URL=mongodb://localhost:27017/freightflow
# Or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/freightflow

# Security
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Optional: Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password


4️⃣ Start the Server

Development Mode:
bash
npm run dev


Production Mode:
bash
npm start

The application will be available at: http://localhost:5000

🚀 Usage

Default User Roles

After setup, you can create users with different roles:

- Admin → Full system access
- Shipper → Create and manage shipments
- Driver → View and update assigned deliveries

API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Request password reset |
| GET | `/api/shipments` | Get all shipments |
| POST | `/api/shipments` | Create new shipment |
| PUT | `/api/shipments/:id` | Update shipment |
| DELETE | `/api/shipments/:id` | Delete shipment |


📸 Screenshots

> Coming soon - Add screenshots of your dashboards here

🗺️ Roadmap & Future Enhancements

- [ ] 📍 Real-time GPS shipment tracking
- [ ] 🗺️ Driver route optimization with Google Maps API
- [ ] 🔔 Push notification system (email/SMS alerts)
- [ ] 📊 Advanced analytics & reporting dashboard
- [ ] 💳 Payment gateway integration (Stripe/PayPal)
- [ ] 📱 Mobile app (React Native)
- [ ] 🌐 Multi-language support
- [ ] 📄 Invoice generation and management
- [ ] 🤖 AI-powered delivery time predictions

---

🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are greatly appreciated.

 How to Contribute

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please open an issue with:
- Clear description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots (if applicable)
  
📄 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for detail

👨‍💻 Author
Ayush Kumar

5th-semester Computer Science Student  
Passionate about Full-Stack Development & Clean UI Design

GitHub: [@ayushkumar](https://github.com/ayushkumar)

🙏 Acknowledgments

- Inspired by modern logistics platforms
- Icons from [Font Awesome](https://fontawesome.com/)
- UI components inspired by [Bootstrap](https://getbootstrap.com/)

⭐ Star this repo if you find it helpful!

**Made with ❤️ by Ayush Kumar**

</div>
