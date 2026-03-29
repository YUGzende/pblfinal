// ============================================================
// scoring.js — Rule-Based Financial Scoring Engine
// No ML libraries. Pure JavaScript business rules.
// Approval threshold: score >= 60 out of 100
// ============================================================

function evaluateLoan(data) {
  let score = 0;
  const maxScore = 100;
  const reasons  = [];

  // (A) CREDIT SCORE — 25 pts
  const credit = parseInt(data.creditScore);
  if      (credit >= 750) { score += 25; reasons.push({ text: 'Excellent credit score (750+)',        positive: true  }); }
  else if (credit >= 700) { score += 20; reasons.push({ text: 'Good credit score (700–749)',          positive: true  }); }
  else if (credit >= 650) { score += 12; reasons.push({ text: 'Fair credit score (650–699)',          positive: true  }); }
  else if (credit >= 600) { score += 5;  reasons.push({ text: 'Poor credit score (600–649)',          positive: false }); }
  else                    { score += 0;  reasons.push({ text: 'Very low credit score (below 600)',    positive: false }); }

  // (B) DTI RATIO — 20 pts
  const dti = parseFloat(data.dtiRatio);
  if      (dti <= 20) { score += 20; reasons.push({ text: 'Very low debt-to-income ratio (≤20%)',     positive: true  }); }
  else if (dti <= 35) { score += 15; reasons.push({ text: 'Acceptable debt-to-income ratio (21–35%)', positive: true  }); }
  else if (dti <= 50) { score += 7;  reasons.push({ text: 'High debt-to-income ratio (36–50%)',       positive: false }); }
  else                { score += 0;  reasons.push({ text: 'Very high debt-to-income ratio (>50%)',    positive: false }); }

  // (C) INCOME vs LOAN AMOUNT — 15 pts
  const income      = parseFloat(data.applicantIncome) + parseFloat(data.coApplicantIncome || 0);
  const loanAmt     = parseFloat(data.loanAmount);
  const incomeRatio = income / loanAmt;
  if      (incomeRatio >= 0.5)  { score += 15; reasons.push({ text: 'Strong income relative to loan amount',    positive: true  }); }
  else if (incomeRatio >= 0.25) { score += 10; reasons.push({ text: 'Adequate income relative to loan amount',  positive: true  }); }
  else if (incomeRatio >= 0.1)  { score += 5;  reasons.push({ text: 'Moderate income relative to loan amount',  positive: false }); }
  else                          { score += 0;  reasons.push({ text: 'Low income relative to loan amount',       positive: false }); }

  // (D) EMPLOYMENT TYPE — 10 pts
  if      (data.employmentType === 'salaried')     { score += 10; reasons.push({ text: 'Stable salaried employment',              positive: true  }); }
  else if (data.employmentType === 'self-employed') { score += 6;  reasons.push({ text: 'Self-employed (moderate stability)',      positive: true  }); }
  else if (data.employmentType === 'contract')      { score += 4;  reasons.push({ text: 'Contract employment (lower stability)',   positive: false }); }
  else                                              { score += 0;  reasons.push({ text: 'Unemployed or unstable employment',      positive: false }); }

  // (E) SAVINGS vs LOAN — 10 pts
  const savingsRatio = parseFloat(data.savings) / loanAmt;
  if      (savingsRatio >= 0.5)  { score += 10; reasons.push({ text: 'High savings relative to loan amount', positive: true  }); }
  else if (savingsRatio >= 0.2)  { score += 6;  reasons.push({ text: 'Moderate savings',                     positive: true  }); }
  else if (savingsRatio >= 0.05) { score += 3;  reasons.push({ text: 'Low savings',                          positive: false }); }
  else                           { score += 0;  reasons.push({ text: 'Insufficient savings',                 positive: false }); }

  // (F) EXISTING LOANS — 8 pts
  const existingLoans = parseInt(data.existingLoans);
  if      (existingLoans === 0) { score += 8; reasons.push({ text: 'No existing loan obligations',    positive: true  }); }
  else if (existingLoans === 1) { score += 5; reasons.push({ text: 'One existing loan',               positive: true  }); }
  else if (existingLoans === 2) { score += 2; reasons.push({ text: 'Two existing loans',              positive: false }); }
  else                          { score += 0; reasons.push({ text: 'Multiple existing loans (3+)',    positive: false }); }

  // (G) EDUCATION — 5 pts
  if      (['postgraduate','graduate'].includes(data.education)) { score += 5; reasons.push({ text: 'Graduate or higher education',     positive: true  }); }
  else if (data.education === 'undergraduate')                   { score += 3; reasons.push({ text: 'Undergraduate education',          positive: true  }); }
  else                                                           { score += 1; reasons.push({ text: 'Below undergraduate education',    positive: false }); }

  // (H) AGE — 4 pts
  const age = parseInt(data.age);
  if      (age >= 25 && age <= 55) { score += 4; reasons.push({ text: 'Prime working age (25–55)',      positive: true  }); }
  else if (age >= 22 && age <= 60) { score += 2; reasons.push({ text: 'Acceptable age range',           positive: true  }); }
  else                             { score += 0; reasons.push({ text: 'Age outside preferred range',    positive: false }); }

  // (I) DEPENDENTS — 3 pts
  const dep = parseInt(data.dependents);
  if      (dep === 0) { score += 3; reasons.push({ text: 'No dependents',                                      positive: true  }); }
  else if (dep <= 2)  { score += 2; reasons.push({ text: `${dep} dependent(s) — manageable`,                   positive: true  }); }
  else                { score += 0; reasons.push({ text: `${dep} dependents — high financial obligation`,       positive: false }); }

  // (J) EMPLOYER TYPE — bonus
  if      (data.employerType === 'government') { score = Math.min(maxScore, score + 2); reasons.push({ text: 'Government employer — high job security', positive: true }); }
  else if (data.employerType === 'mnc')        { score = Math.min(maxScore, score + 1); reasons.push({ text: 'MNC employer — good stability',          positive: true }); }

  const approved   = score >= 60;
  const percentage = Math.round((score / maxScore) * 100);
  return { approved, score, maxScore, percentage, reasons };
}

module.exports = { evaluateLoan };
