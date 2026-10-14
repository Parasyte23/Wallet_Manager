# Wallet Management System 💼

A full-stack, real-time digital wallet application developed as a Semester V BBA CA academic project. This system simulates a modern financial dashboard, allowing users to securely manage funds, execute real-time peer-to-peer transfers, and visualize their spending habits through interactive data analytics.

## 🚀 Key Features

* **Real-Time Transactions:** Integrated `Socket.io` for instant WebSocket notifications and live UI background refreshing when receiving funds.
* **Secure Authentication:** JWT-based user authentication with dynamic, unique Wallet ID generation (e.g., `MW-XXXXXX-26`) securely managed via `localStorage`.
* **Interactive Financial Analytics:** Dynamic Doughnut and Bar charts rendered with `Chart.js`, tracking income, expenses, and category-based spending.
* **Advanced Data Filtering:** Regex-powered case-insensitive backend searching, combined with frontend category and transaction-type filters for seamless ledger management.
* **Custom Responsive UI:** Built completely in Vanilla JavaScript and CSS Flexbox. Features include a global search architecture, dynamic DOM rendering, and a custom touch-supported draggable Help FAB.

## 💻 Tech Stack

**Frontend**
* HTML5 & CSS3 (Fully Responsive)
* Vanilla JavaScript (DOM Manipulation & Fetch API)
* Chart.js (Data Visualization)
* FontAwesome (Iconography)

**Backend**
* Node.js & Express.js (RESTful API architecture)
* Socket.io (Real-time WebSocket communication)
* JSON Web Tokens (JWT) (Stateless authentication)
* Cors & Dotenv (Security and Environment management)

**Database**
* MongoDB Atlas (Cloud NoSQL Database)
* Mongoose (Object Data Modeling)

## ⚙️ Installation & Local Setup

**1. Clone the repository**
```bash
git clone [https://github.com/yourusername/wallet-management-system.git](https://github.com/yourusername/wallet-management-system.git)
cd wallet-management-system