// ============================================================
// server.js — LoanIQ Express Server (flat structure)
// All route logic is in separate files in the SAME folder:
//   db.js, scoring.js, authMiddleware.js,
//   routeAuth.js, routePredictions.js, routeUsers.js
// Run: node server.js   OR   npm run dev
// ============================================================

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes        = require('./routeAuth.js');
const predictionRoutes  = require('./routePredictions.js');
const userRoutes        = require('./routeUsers.js');

const app  = express();
const PORT = process.env.PORT || 5000;

// ---- Middleware ----
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'null',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Serve all HTML/CSS/JS from the SAME folder ----
app.use(express.static(__dirname));

// ---- API Routes ----
app.use('/api/auth',        authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/users',       userRoutes);

// ---- Health check ----
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ---- Fallback ----
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`\n🚀  LoanIQ running at http://localhost:${PORT}`);
  console.log(`📊  Admin login: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
  console.log(`🗄️   MySQL DB: ${process.env.DB_NAME} @ ${process.env.DB_HOST}\n`);
});
