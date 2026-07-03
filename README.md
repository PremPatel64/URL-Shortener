# 🔗 Trimmer - Production-Ready URL Shortener

> A secure, scalable, and analytics-driven URL Shortener built with **Node.js, Express.js, MongoDB, and Vanilla JavaScript** following the **MVC Architecture**.

---

## 📖 Overview

Trimmer is a full-stack URL shortening platform that allows users to create, manage, and analyze shortened URLs with detailed click analytics.

The application focuses on:

- Secure Authentication
- Fast URL Redirection
- Analytics Dashboard
- QR Code Generation
- Professional MVC Architecture
- Production-Level Security

---

# 🚀 Features

### Authentication

- User Registration
- Login & Logout
- JWT Authentication
- Protected Routes
- Password Hashing (bcrypt)

---

### URL Management

- Create Short URLs
- Custom Alias Support
- Expiration Dates
- Update Alias
- Delete URL
- Search URLs
- Pagination
- Sorting
- Favorite URLs

---

### Analytics

- Click Tracking
- Browser Statistics
- Operating System Statistics
- Device Statistics
- Country Statistics
- Daily / Weekly / Monthly Analytics
- CSV Export

---

### Security

- Helmet
- Rate Limiter
- CORS
- Mongo Sanitize
- XSS Protection
- HTTP-only Cookies
- JWT Authentication

---

### Performance

- Background Click Logging
- MongoDB Compound Indexes
- Sparse Indexes
- Optimized Queries
- HTTP 302 Redirect

---

# 🏗️ Tech Stack

| Category | Technology |
|-----------|------------|
| Backend | Node.js |
| Framework | Express.js |
| Database | MongoDB |
| Authentication | JWT |
| Validation | Express Validator |
| Frontend | HTML, CSS, JavaScript |
| Charts | Chart.js |
| Password Hashing | bcrypt |
| Environment | dotenv |

---

# 📂 Project Structure

```text
backend/
│
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── utils/
├── validators/
└── app.js

frontend/
│
├── css/
├── js/
├── dashboard.html
├── login.html
├── register.html
└── index.html

package.json
README.md
