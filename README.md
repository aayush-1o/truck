📦 FreightFlow – Modern Logistics & Freight Management System

FreightFlow is a full-stack logistics management platform designed to streamline the workflow between Admins, Shippers, and Drivers.
It provides a clean, modern interface and efficient backend workflows to manage shipments, track drivers, and simplify freight operations.

🚀 Features
🔐 Authentication

Secure login & registration

Role-based access (Admin, Shipper, Driver)

Password reset / forgot-password flow

📊 Dashboards

Admin Dashboard → Manage users, shipments, drivers

Shipper Dashboard → Create shipments, check status, manage deliveries

Driver Dashboard → View assigned shipments, update progress

🎨 Modern Frontend

Clean white-theme UI

Fully responsive pages

Organized project structure

Modular CSS & JS

🖥️ Backend (Node.js + Express)

REST API for user management

Database connectivity

Secure environment variables

Scalable and extendable structure

📁 Project Structure

freightflow/
│
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   ├── images/
│   └── icons/
│
├── pages/
│   ├── admin-dashboard.html
│   ├── shipper-dashboard.html
│   ├── driver-dashboard.html
│   ├── login.html
│   ├── register.html
│   └── forgot-password.html
│
├── server.js
├── index.html
├── .env
├── package.json
└── README.md

🏗️ Tech Stack
Frontend

HTML5

CSS3

JavaScript

Responsive Design Principles

Backend

Node.js

Express.js

REST API architecture

Database

MongoDB / Any DB of your choice (project-ready)

Tools

Git & GitHub

VS Code

Postman (API testing)

⚙️ Setup & Installation
1️⃣ Clone the repository
git clone https://github.com/your-username/freightflow.git
cd freightflow

2️⃣ Install dependencies
npm install

3️⃣ Create .env file
PORT=5000
MONGO_URL=your_database_url
JWT_SECRET=your_secret_key

4️⃣ Start the server
npm start

The app will run at:

http://localhost:5000

🗺️ Future Enhancements

Live shipment tracking using GPS

Driver route optimization

Notification system (email/SMS)

Analytics & reports dashboard

Payment gateway integration

🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to open a pull request or issue.

📄 License

This project is licensed under the MIT License.

✨ Author

Ayush Kumar
5th-semester Computer Science student
Passionate about full-stack development & clean UI design.
