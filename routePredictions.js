// ============================================================
// routePredictions.js
//   POST /api/predictions         — submit loan application
//   GET  /api/predictions         — user's own history
//   GET  /api/predictions/admin   — all predictions (admin)
//   GET  /api/predictions/stats   — dashboard stats (admin)
// ============================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const db      = require('./db.js');
const { evaluateLoan }            = require('./scoring.js');
const { requireAuth, requireAdmin } = require('./authMiddleware.js');

const router = express.Router();

// ---- POST /api/predictions ----
router.post('/', requireAuth,
  [
    body('applicantIncome').isFloat({ min: 0 }),
    body('coApplicantIncome').optional().isFloat({ min: 0 }),
    body('employmentType').notEmpty(),
    body('age').isInt({ min: 18, max: 80 }),
    body('dependents').isInt({ min: 0 }),
    body('maritalStatus').notEmpty(),
    body('education').notEmpty(),
    body('gender').notEmpty(),
    body('employerType').notEmpty(),
    body('propertyArea').notEmpty(),
    body('savings').isFloat({ min: 0 }),
    body('existingLoans').isInt({ min: 0 }),
    body('creditScore').isInt({ min: 300, max: 900 }),
    body('dtiRatio').isFloat({ min: 0, max: 100 }),
    body('loanAmount').isFloat({ min: 1 }),
    body('loanTerm').isInt({ min: 1 }),
    body('loanPurpose').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const data = req.body;
    const { approved, score, percentage, reasons } = evaluateLoan(data);
    const result = approved ? 'Approved' : 'Rejected';

    try {
      const [ins] = await db.query(
        `INSERT INTO predictions
          (user_id, applicant_income, co_applicant_income, employment_type,
           age, dependents, marital_status, education, gender, employer_type,
           property_area, savings, existing_loans, credit_score, dti_ratio,
           loan_amount, loan_term, loan_purpose, result, score, percentage, reasons)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          req.user.id,
          data.applicantIncome, data.coApplicantIncome || 0,
          data.employmentType, data.age, data.dependents,
          data.maritalStatus, data.education, data.gender,
          data.employerType, data.propertyArea, data.savings,
          data.existingLoans, data.creditScore, data.dtiRatio,
          data.loanAmount, data.loanTerm, data.loanPurpose,
          result, score, percentage, JSON.stringify(reasons),
        ]
      );
      return res.status(201).json({ id: ins.insertId, result, score, percentage, reasons, loanAmount: data.loanAmount, creditScore: data.creditScore });
    } catch (err) {
      console.error('Prediction error:', err);
      return res.status(500).json({ error: 'Could not save prediction.' });
    }
  }
);

// ---- GET /api/predictions (user history) ----
// NOTE: /admin and /stats must be defined BEFORE this generic GET
// to avoid Express matching them as /:id

// ---- GET /api/predictions/admin ----
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, u.username, p.loan_amount, p.credit_score,
              p.loan_purpose, p.score, p.percentage, p.result, p.created_at
       FROM predictions p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC LIMIT 100`
    );
    return res.json(rows);
  } catch (err) {
    console.error('Admin predictions error:', err);
    return res.status(500).json({ error: 'Could not fetch predictions.' });
  }
});

// ---- GET /api/predictions/stats ----
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [[totals]] = await db.query(
      `SELECT
         COUNT(*)                                  AS total,
         SUM(result = 'Approved')                  AS approved,
         SUM(result = 'Rejected')                  AS rejected,
         ROUND(AVG(result = 'Approved') * 100, 1)  AS approvalRate
       FROM predictions`
    );
    const [buckets] = await db.query(
      `SELECT
         SUM(percentage BETWEEN 0  AND 20)  AS b0_20,
         SUM(percentage BETWEEN 21 AND 40)  AS b21_40,
         SUM(percentage BETWEEN 41 AND 60)  AS b41_60,
         SUM(percentage BETWEEN 61 AND 80)  AS b61_80,
         SUM(percentage BETWEEN 81 AND 100) AS b81_100
       FROM predictions`
    );
    return res.json({ totals, distribution: buckets[0] });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

// ---- GET /api/predictions (own history) ----
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, loan_amount, credit_score, loan_purpose, score, percentage, result, reasons, created_at
       FROM predictions WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    const records = rows.map(r => ({
      ...r,
      reasons: typeof r.reasons === 'string' ? JSON.parse(r.reasons) : r.reasons,
    }));
    return res.json(records);
  } catch (err) {
    console.error('History error:', err);
    return res.status(500).json({ error: 'Could not fetch history.' });
  }
});

module.exports = router;
