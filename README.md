# LoanIQ — Setup Guide

## FILES IN THIS FOLDER

```
loaniq/
  server.js           ← Start this to run the app
  db.js               ← MySQL connection
  scoring.js          ← Loan prediction logic
  authMiddleware.js   ← JWT auth check
  routeAuth.js        ← Signup / Login API
  routePredictions.js ← Loan submission + history API
  routeUsers.js       ← User profile API
  package.json        ← Node.js dependencies
  .env                ← ⚠️ Edit your MySQL password here
  database.sql        ← Run this once to create DB tables

  index.html          ← Redirects to login
  login.html
  signup.html
  home.html           ← Loan application form
  result.html         ← Prediction result
  profile.html
  history.html
  admin.html          ← Admin dashboard
  style.css
  script.js           ← All frontend logic
```

---

## HOW TO RUN

### Step 1 — Create the database
```bash
mysql -u root -p < database.sql
```
Or open phpMyAdmin → Import → select `database.sql` → Go.

### Step 2 — Edit .env
Open `.env` and set your MySQL password:
```
DB_PASSWORD=your_actual_mysql_password
```

### Step 3 — Install packages
```bash
npm install
```

### Step 4 — Start server
```bash
node server.js
```

### Step 5 — Open browser
```
http://localhost:5000
```

---

## LOGIN CREDENTIALS

| Role  | Email            | Password |
|-------|------------------|----------|
| Admin | admin@loan.com   | admin123 |
| User  | (register first) | —        |
