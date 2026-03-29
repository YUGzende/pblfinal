/* ============================================================
   LoanIQ — script.js (MySQL/API version)
   All data goes to the Node.js backend.
   Only the JWT token is kept in sessionStorage.
   ============================================================ */

'use strict';

// ============================================================
// 1. CONFIG
// ============================================================

const API = 'http://localhost:5000/api';   // backend base URL

const PAGES = {
  SIGNUP:  'signup.html',
  LOGIN:   'login.html',
  HOME:    'home.html',
  RESULT:  'result.html',
  PROFILE: 'profile.html',
  HISTORY: 'history.html',
  ADMIN:   'admin.html',
};

// ============================================================
// 2. SESSION HELPERS (token only — no user data in localStorage)
// ============================================================

const Session = {
  setToken:  (t)  => sessionStorage.setItem('liq_token', t),
  getToken:  ()   => sessionStorage.getItem('liq_token'),
  setUser:   (u)  => sessionStorage.setItem('liq_user', JSON.stringify(u)),
  getUser:   ()   => { try { return JSON.parse(sessionStorage.getItem('liq_user')); } catch { return null; } },
  clear:     ()   => { sessionStorage.removeItem('liq_token'); sessionStorage.removeItem('liq_user'); },
  isLoggedIn:()   => !!sessionStorage.getItem('liq_token'),
  isAdmin:   ()   => { const u = Session.getUser(); return u && u.isAdmin; },

  // Last result is just kept in memory for the result page redirect
  setLastResult: (r) => sessionStorage.setItem('liq_last_result', JSON.stringify(r)),
  getLastResult: ()  => { try { return JSON.parse(sessionStorage.getItem('liq_last_result')); } catch { return null; } },
};

// ============================================================
// 3. API HELPER
// ============================================================

async function apiFetch(endpoint, options = {}) {
  const token = Session.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Surface a human-readable error
    const msg = data.error || (data.errors && data.errors[0]?.msg) || 'Something went wrong.';
    throw new Error(msg);
  }
  return data;
}

// ============================================================
// 4. ROUTE GUARD — runs immediately on every page
// ============================================================

(function routeGuard() {
  const page    = window.location.pathname.split('/').pop() || 'index.html';
  const authed  = Session.isLoggedIn();
  const isAdmin = Session.isAdmin();

  const publicPages = ['index.html', 'signup.html', 'login.html', ''];
  const adminPages  = ['admin.html'];
  const userPages   = ['home.html', 'result.html', 'profile.html', 'history.html'];

  if (publicPages.includes(page)) {
    if (authed) window.location.href = isAdmin ? PAGES.ADMIN : PAGES.HOME;
    return;
  }
  if (!authed)                                    { window.location.href = PAGES.LOGIN; return; }
  if (adminPages.includes(page) && !isAdmin)      { window.location.href = PAGES.HOME;  return; }
  if (userPages.includes(page)  && isAdmin)       { window.location.href = PAGES.ADMIN; return; }
})();

// ============================================================
// 5. PAGE INIT DISPATCHER
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  // Wire logout on every app page
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', e => {
    e.preventDefault();
    Session.clear();
    window.location.href = PAGES.LOGIN;
  });

  // Mark active nav link
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });

  if (page === 'signup.html')  initSignup();
  if (page === 'login.html')   initLogin();
  if (page === 'home.html')    initHome();
  if (page === 'result.html')  initResult();
  if (page === 'profile.html') initProfile();
  if (page === 'history.html') initHistory();
  if (page === 'admin.html')   initAdmin();
  if (page === 'index.html' || page === '') window.location.href = PAGES.LOGIN;
});

// ============================================================
// 6A. SIGNUP
// ============================================================

function initSignup() {
  document.getElementById('signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();

    const name     = val('su_name');
    const email    = val('su_email');
    const username = val('su_username');
    const password = val('su_password');
    const confirm  = val('su_confirm');

    // Client-side validation
    let ok = true;
    if (!name)    { showError('su_name',    'Name is required.');            ok = false; }
    if (!isEmail(email)) { showError('su_email','Valid email is required.'); ok = false; }
    if (username.length < 3) { showError('su_username','Min 3 characters.'); ok = false; }
    if (password.length < 6) { showError('su_password','Min 6 characters.'); ok = false; }
    if (password !== confirm) { showError('su_confirm','Passwords do not match.'); ok = false; }
    if (!ok) return;

    setLoading('signupBtn', true);
    try {
      await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, username, password }),
      });
      showAlert('alertBox', 'Account created! Redirecting to login…', 'success');
      setTimeout(() => window.location.href = PAGES.LOGIN, 1400);
    } catch (err) {
      showAlert('alertBox', err.message);
    } finally {
      setLoading('signupBtn', false);
    }
  });
}

// ============================================================
// 6B. LOGIN
// ============================================================

function initLogin() {
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();

    const email    = val('l_email');
    const password = val('l_password');

    let ok = true;
    if (!isEmail(email))  { showError('l_email',    'Valid email is required.'); ok = false; }
    if (!password)        { showError('l_password', 'Password is required.');    ok = false; }
    if (!ok) return;

    setLoading('loginBtn', true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      Session.setToken(data.token);
      Session.setUser(data.user);
      window.location.href = data.user.isAdmin ? PAGES.ADMIN : PAGES.HOME;
    } catch (err) {
      showAlert('alertBox', err.message);
    } finally {
      setLoading('loginBtn', false);
    }
  });
}

// ============================================================
// 6C. HOME — Loan Application Form
// ============================================================

function initHome() {
  const user = Session.getUser();
  const nameEl = document.getElementById('welcomeName');
  if (nameEl && user) nameEl.textContent = user.name.split(' ')[0];

  document.getElementById('applyNowBtn')?.addEventListener('click', () => {
    document.getElementById('loanFormSection').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('loanForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateLoanForm()) return;

    const formData = {
      applicantIncome:   val('applicantIncome'),
      coApplicantIncome: val('coApplicantIncome') || '0',
      employmentType:    val('employmentType'),
      age:               val('age'),
      dependents:        val('dependents'),
      maritalStatus:     val('maritalStatus'),
      education:         val('education'),
      gender:            val('gender'),
      employerType:      val('employerType'),
      propertyArea:      val('propertyArea'),
      savings:           val('savings'),
      existingLoans:     val('existingLoans'),
      creditScore:       val('creditScore'),
      dtiRatio:          val('dtiRatio'),
      loanAmount:        val('loanAmount'),
      loanTerm:          val('loanTerm'),
      loanPurpose:       val('loanPurpose'),
    };

    setLoading('submitLoanBtn', true);
    try {
      const result = await apiFetch('/predictions', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      // Store result temporarily for the result page
      Session.setLastResult(result);
      window.location.href = PAGES.RESULT;
    } catch (err) {
      showAlert('formAlert', err.message);
    } finally {
      setLoading('submitLoanBtn', false);
    }
  });
}

function validateLoanForm() {
  clearErrors();
  let valid = true;

  const required = [
    ['applicantIncome','Applicant income is required.'],
    ['employmentType','Employment type is required.'],
    ['age','Age is required.'],
    ['dependents','Dependents is required.'],
    ['maritalStatus','Marital status is required.'],
    ['education','Education is required.'],
    ['gender','Gender is required.'],
    ['employerType','Employer type is required.'],
    ['propertyArea','Property area is required.'],
    ['savings','Savings is required.'],
    ['existingLoans','Existing loans is required.'],
    ['creditScore','Credit score is required.'],
    ['dtiRatio','DTI ratio is required.'],
    ['loanAmount','Loan amount is required.'],
    ['loanTerm','Loan term is required.'],
    ['loanPurpose','Loan purpose is required.'],
  ];

  required.forEach(([id, msg]) => { if (!val(id)) { showError(id, msg); valid = false; } });

  const credit = parseInt(val('creditScore'));
  if (credit && (credit < 300 || credit > 900)) { showError('creditScore','Must be 300–900.'); valid = false; }

  const dti = parseFloat(val('dtiRatio'));
  if (dti && (dti < 0 || dti > 100)) { showError('dtiRatio','Must be 0–100%.'); valid = false; }

  const age = parseInt(val('age'));
  if (age && (age < 18 || age > 80)) { showError('age','Must be 18–80.'); valid = false; }

  return valid;
}

// ============================================================
// 6D. RESULT PAGE
// ============================================================

function initResult() {
  const pred = Session.getLastResult();
  if (!pred) { window.location.href = PAGES.HOME; return; }

  const approved = pred.result === 'Approved';

  document.getElementById('resultIcon').textContent  = approved ? '✓' : '✗';
  document.getElementById('resultIcon').className    = `result-icon ${approved ? 'approved' : 'rejected'}`;
  document.getElementById('resultStatus').textContent = approved ? 'Loan Approved' : 'Loan Rejected';
  document.getElementById('resultStatus').className  = `result-status ${approved ? 'approved' : 'rejected'}`;

  document.getElementById('resultLoanAmt').textContent =
    `Loan Amount: ₹${Number(pred.loanAmount).toLocaleString('en-IN')}  ·  Risk Score: ${pred.score}/100 (${pred.percentage}%)`;

  const bar = document.getElementById('scoreBarFill');
  bar.className = `score-bar-fill ${approved ? 'approved' : 'rejected'}`;
  setTimeout(() => { bar.style.width = pred.percentage + '%'; }, 100);
  document.getElementById('scorePercent').textContent = pred.percentage + '%';

  const container = document.getElementById('reasonsList');
  container.innerHTML = (pred.reasons || []).map(r => `
    <div class="reason-item">
      <div class="reason-dot ${r.positive ? 'pos' : 'neg'}">${r.positive ? '✓' : '✗'}</div>
      <span>${r.text}</span>
    </div>`).join('');

  document.getElementById('applyAgainBtn').addEventListener('click', () => {
    window.location.href = PAGES.HOME;
  });
}

// ============================================================
// 6E. PROFILE
// ============================================================

async function initProfile() {
  try {
    const data = await apiFetch('/users/me');

    document.getElementById('profileAvatar').textContent =
      data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    document.getElementById('profileName').textContent   = data.name;
    document.getElementById('profileEmail').textContent  = data.email;
    document.getElementById('metaUsername').textContent  = data.username;
    document.getElementById('metaEmail').textContent     = data.email;
    document.getElementById('metaTotal').textContent     = data.counts.total    || 0;
    document.getElementById('metaApproved').textContent  = data.counts.approved || 0;
    document.getElementById('metaRejected').textContent  = data.counts.rejected || 0;

    const joined = new Date(data.created_at).toLocaleDateString('en-IN',
      { day:'2-digit', month:'short', year:'numeric' });
    document.getElementById('metaJoined').textContent = joined;
  } catch (err) {
    showAlert('profileAlert', err.message);
  }
}

// ============================================================
// 6F. HISTORY
// ============================================================

async function initHistory() {
  const tbody = document.getElementById('historyTbody');
  const empty = document.getElementById('historyEmpty');

  try {
    const records = await apiFetch('/predictions');

    if (!records.length) {
      tbody.closest('table').classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    tbody.innerHTML = records.map(p => `
      <tr>
        <td><strong>₹${Number(p.loan_amount).toLocaleString('en-IN')}</strong></td>
        <td>${p.credit_score}</td>
        <td>${p.loan_purpose || '—'}</td>
        <td>${p.percentage}%</td>
        <td><span class="badge ${p.result === 'Approved' ? 'badge-success' : 'badge-danger'}">${p.result}</span></td>
        <td>${new Date(p.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
      </tr>`).join('');
  } catch (err) {
    tbody.closest('table').classList.add('hidden');
    empty.innerHTML = `<div class="empty-icon">⚠️</div><p>${err.message}</p>`;
    empty.classList.remove('hidden');
  }
}

// ============================================================
// 6G. ADMIN DASHBOARD
// ============================================================

async function initAdmin() {
  try {
    // Stats
    const { totals, distribution } = await apiFetch('/predictions/stats');

    document.getElementById('adminTotal').textContent    = totals.total    || 0;
    document.getElementById('adminApproved').textContent = totals.approved || 0;
    document.getElementById('adminRejected').textContent = totals.rejected || 0;
    document.getElementById('adminRate').textContent     = (totals.approvalRate || 0) + '%';

    // Score bar chart
    renderScoreChart(distribution);

    // Recent applications table
    const records = await apiFetch('/predictions/admin');
    const tbody   = document.getElementById('adminTbody');
    const empty   = document.getElementById('adminEmpty');

    if (!records.length) {
      tbody.closest('table').classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = records.map(p => `
      <tr>
        <td>${p.username}</td>
        <td><strong>₹${Number(p.loan_amount).toLocaleString('en-IN')}</strong></td>
        <td>${p.credit_score}</td>
        <td>${p.percentage}%</td>
        <td><span class="badge ${p.result === 'Approved' ? 'badge-success' : 'badge-danger'}">${p.result}</span></td>
        <td>${new Date(p.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
      </tr>`).join('');
  } catch (err) {
    showAlert('adminAlert', err.message);
  }
}

function renderScoreChart(dist) {
  const chart = document.getElementById('scoreChart');
  if (!chart || !dist) return;

  const buckets = [
    { label: '0–20',   val: dist.b0_20   || 0, color: '#ef4444' },
    { label: '21–40',  val: dist.b21_40  || 0, color: '#f97316' },
    { label: '41–60',  val: dist.b41_60  || 0, color: '#f59e0b' },
    { label: '61–80',  val: dist.b61_80  || 0, color: '#3b82f6' },
    { label: '81–100', val: dist.b81_100 || 0, color: '#10b981' },
  ];

  const maxVal = Math.max(...buckets.map(b => b.val), 1);
  chart.innerHTML = buckets.map(b => `
    <div class="bar-col">
      <div class="bar-fill" style="height:${Math.round((b.val/maxVal)*70)}px;background:${b.color};opacity:0.85;"></div>
      <div class="bar-label">${b.label}</div>
    </div>`).join('');
}

// ============================================================
// 7. UTILITIES
// ============================================================

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function showError(id, msg) {
  const el  = document.getElementById(id);
  const err = document.getElementById(id + '_err');
  if (el)  el.classList.add('error');
  if (err) { err.textContent = msg; err.classList.add('visible'); }
}

function clearErrors() {
  document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
  document.querySelectorAll('.error-msg').forEach(e => { e.textContent=''; e.classList.remove('visible'); });
  ['alertBox','formAlert','profileAlert','adminAlert'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function showAlert(boxId, msg, type = 'error') {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.textContent = msg;
  box.className   = `alert alert-${type}`;
  box.classList.remove('hidden');
}

function isEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>';
  } else {
    btn.textContent = btn.dataset.orig || btn.textContent;
  }
}
