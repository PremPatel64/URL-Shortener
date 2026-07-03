# Trimmer | Production-Quality URL Shortener Web Application

Trimmer is a highly secure, performant, and scalable URL Shortening platform built on Node.js, Express, and MongoDB. The project employs a strict **MVC (Model-View-Controller)** architecture, utilizes professional database indexing patterns, implements defense-in-depth security mitigations, and features a clean, responsive glassmorphic frontend utilizing native Web Fetch APIs and dynamic Chart.js visualizations.

---

## Folder Structure

```text
d:/URL shortner/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection pooling helper
│   ├── controllers/
│   │   ├── authController.js     # User registration, login, logout, and profile
│   │   ├── urlController.js      # URL shortening, redirection engine, and alias updates
│   │   └── analyticsController.js# Specific link click distributions and CSV exports
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT token validation and route guards
│   │   ├── errorHandler.js       # Centralized global JSON error responder
│   │   └── validationMiddleware.js# Intercepts express-validator payloads
│   ├── models/
│   │   ├── userModel.js          # User collection schema with hash hooks
│   │   ├── urlModel.js           # URL collection schema with unique sparse indexes
│   │   └── clickModel.js         # Click event collection schema with compound indexes
│   ├── routes/
│   │   ├── authRoutes.js         # Auth router definitions
│   │   ├── urlRoutes.js          # URL router definitions
│   │   └── analyticsRoutes.js    # Analytics router definitions
│   ├── utils/
│   │   ├── catchAsync.js         # Async error handler wrapper
│   │   ├── customErrors.js       # Custom operational AppError classes
│   │   ├── geoip.js              # IP extraction and geo-location header checks
│   │   ├── jwt.js                # JWT sign and verification wrappers
│   │   ├── qrcode.js             # Base64 QR Code generation wrapper
│   │   └── userAgentParser.js    # Regex-based User-Agent header parser
│   ├── validators/
│   │   ├── authValidator.js      # Email/Password express-validator schemas
│   │   └── urlValidator.js       # URL/Alias/Expiration date validation schemas
│   └── app.js                    # Middlewares registration and routes mounting
├── frontend/
│   ├── css/
│   │   └── style.css             # Unified responsive glassmorphic theme stylesheet
│   ├── js/
│   │   ├── auth.js               # Client session manager, routing guards, theme toggle
│   │   └── dashboard.js          # Dynamic data populator and Chart.js renderer
│   ├── index.html                # Hero presentation / CTA landing page
│   ├── login.html                # Account login page
│   ├── register.html             # Account registration page
│   └── dashboard.html            # Analytics dashboard panel with modals
├── .env.example                  # Environment variable contract definition
├── .env                          # Local environment settings
├── package.json                  # Scripts and dependencies configurations
└── README.md                     # Project manual
```

---

## Architectural & Technical Highlights

* **Separation of Concerns**: Keep routers, controllers, validators, and database services isolated. Controllers delegate pure database tasks to service layer components.
* **Operational Error Handling**: Centralized global error handling middleware separates operational errors from programming defects, automatically handling Mongoose CastErrors, Mongoose ValidationErrors, and JWT token expirations.
* **Redirection Performance**: REDIRECTS DO NOT BLOCK on database writes. Clicking a short link triggers the Mongoose click write asynchronously in the background while the redirect response is returned immediately to the client.
* **HTTP 302 Redirection**: Prevents client browsers from locally caching redirects (which is done on HTTP 301), ensuring every single hit communicates with our server to log analytics.
* **Sparse Indexing**: Resolves MongoDB index collisions on optional unique fields like `customAlias` using sparse indices, ignoring null records.
* **Compound Indexing**: Click events utilize a compound index `{ urlId: 1, clickedAt: -1 }` to maximize range query speeds during dashboard statistics aggregation.

---

## API Documentation

### Authentication Endpoints

#### Register User
* **Endpoint**: `POST /api/auth/register`
* **Access**: Public
* **Payload**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "token": "<JWT_TOKEN>",
    "data": { "user": { "_id": "...", "name": "Jane Doe", "email": "jane@example.com" } }
  }
  ```

#### Login User
* **Endpoint**: `POST /api/auth/login`
* **Access**: Public
* **Payload**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
* **Response (200 OK)**: Sets an HTTP-only cookie and returns the user payload.

#### Get Current Profile
* **Endpoint**: `GET /api/auth/profile`
* **Access**: Private (Requires Authorization Cookie or `Authorization: Bearer <token>` header)
* **Response (200 OK)**: Returns the current logged-in user profile.

---

### URL Management Endpoints

#### Create Short URL
* **Endpoint**: `POST /api/url`
* **Access**: Private
* **Payload**:
  ```json
  {
    "originalUrl": "https://news.ycombinator.com",
    "customAlias": "hacker-news",
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
  ```
* **Response (201 Created)**: Returns the shortened URL metadata and the generated QR code (base64 string).

#### List User URLs (With Search, Filtering & Pagination)
* **Endpoint**: `GET /api/url`
* **Access**: Private
* **Query Parameters**:
  * `page` (default 1)
  * `limit` (default 10)
  * `sort` (`newest`, `oldest`, `most-clicked`, `least-clicked`, `alphabetical`)
  * `search` (Search keywords matching originalUrl or alias)
  * `isFavorite` (`true`, `false`)
  * `status` (`active`, `expired`)
* **Response (200 OK)**: Returns a paginated list of URL documents.

#### Get URL Details
* **Endpoint**: `GET /api/url/:id`
* **Access**: Private

#### Update Custom Alias
* **Endpoint**: `PUT /api/url/:id`
* **Access**: Private
* **Payload**: `{ "customAlias": "new-alias-name" }`

#### Delete Short URL
* **Endpoint**: `DELETE /api/url/:id`
* **Access**: Private

---

### Analytics & Redirection Endpoints

#### Redirect Short Link
* **Endpoint**: `GET /:shortCode`
* **Access**: Public
* **Action**: Resolves the code/alias, increments click tracking, registers visitor analytics in the background, and returns an HTTP 302 redirect.

#### Get Specific Link Analytics
* **Endpoint**: `GET /api/analytics/:id`
* **Access**: Private
* **Response (200 OK)**: Returns aggregate metrics (today's clicks, weekly, monthly) and OS, Browser, Device, and Country distributions.

#### Export Analytics to CSV
* **Endpoint**: `GET /api/analytics/:id/csv`
* **Access**: Private
* **Response (200 OK)**: Triggers download of a CSV file containing raw visitor click logs.

---

## Installation & Setup Guide

### 1. Prerequisites
Ensure you have installed:
* [Node.js](https://nodejs.org/) (Version $\ge 18$)
* [MongoDB](https://www.mongodb.com/) (Local server or MongoDB Atlas URI)

### 2. Clone and Configure
Navigate to the directory and configure the environment settings:
```bash
# Setup environment parameters
copy .env.example .env
```
Open the `.env` file and edit the connection keys:
* Update `MONGO_URI` with your connection string.
* Choose a secure random string for `JWT_SECRET`.

### 3. Install Dependencies
Run the installation script:
```bash
npm install
```

### 4. Running the Application

#### Development Mode (With Nodemon Auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

Open your browser and navigate to `http://localhost:5000` to interact with the frontend.

---

## Security Mitigations

* **Helmet Integration**: Attaches secure HTTP headers to mitigate cross-site scripting (XSS) and clickjacking attacks.
* **CORS Policies**: Explicitly restricts API access to authorized domains configured in `.env`.
* **Rate Limiting**: Defends endpoints against brute-force attacks and DDoS by enforcing transaction ceilings per IP window.
* **NoSQL Injection Prevention**: Sanitizes request arguments against query indicators like `$gt` using `express-mongo-sanitize`.
* **XSS Defense**: Sanitizes body values and stores user session parameters in secure, `HttpOnly`, `SameSite: Lax` cookies.
#   U R L - S h o r t e n e r  
 