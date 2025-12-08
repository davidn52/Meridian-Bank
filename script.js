// script.js
// Mobile Bank — single-file frontend logic (localStorage-backed)
// Includes: guarded listeners, signup/login, add-funds, beneficiaries, transfer,
// cards, loans, investments, transactions, forgot-password, market live simulation,
// and beneficiary-bank autofill.

// Use strict mode
'use strict';

// Page IDs map
const pages = {
    welcome: 'welcomePage',
    login: 'loginPage',
    signup: 'signupPage',
    forgotPassword: 'forgotPasswordPage',
    dashboard: 'dashboardPage',
    transfer: 'transferPage',
    beneficiary: 'beneficiaryPage',
    card: 'cardPage',
    loan: 'loanPage',
    investment: 'investmentPage',
    transaction: 'transactionPage'
};

let currentPage = 'welcome';
let selectedInvestment = null;
let forgotPasswordState = { email: '', verificationCode: '', resetToken: '' };

// --- Helpers ---
function get(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }
function showNotification(msg, type = 'success') {
    const n = document.createElement('div');
    n.textContent = msg;
    n.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: ${type === 'error' ? '#f44336' : '#4CAF50'};
    color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: sans-serif;
  `;
    document.body.appendChild(n);
    setTimeout(() => { n.remove(); }, 3000);
}
function requireLogin() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    if (!cur || !cur.email) { showNotification('Please log in first', 'error'); return null; }
    return cur;
}

// Account & routing generator
function generateAccountNumber() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let a = '';
    for (let i = 0; i < 4; i++) a += letters.charAt(Math.floor(Math.random() * letters.length));
    for (let i = 0; i < 10; i++) a += Math.floor(Math.random() * 10);
    return a;
}
function generateRoutingNumber() {
    let r = '';
    for (let i = 0; i < 9; i++) r += Math.floor(Math.random() * 10);
    return r;
}

// --- Event listeners (guarded) ---
function initializeEventListeners() {
    function on(id, event, handler) {
        const el = get(id);
        if (el) el.addEventListener(event, handler);
    }

    try {
        // Welcome
        on('showLoginBtn', 'click', () => showPage('login'));
        on('showSignupBtn', 'click', () => showPage('signup'));

        // Login
        on('loginForm', 'submit', handleLogin);
        on('backFromLoginBtn', 'click', () => showPage('welcome'));
        const switchToSignup = get('switchToSignup');
        if (switchToSignup) switchToSignup.addEventListener('click', e => { e.preventDefault(); showPage('signup'); });

        // Forgot password
        const showForgot = get('showForgotPassword');
        if (showForgot) showForgot.addEventListener('click', e => { e.preventDefault(); showPage('forgotPassword'); });
        on('backFromForgotPasswordBtn', 'click', () => showPage('login'));
        const backToLogin = get('backToLogin');
        if (backToLogin) backToLogin.addEventListener('click', e => { e.preventDefault(); resetForgotPasswordForm(); showPage('login'); });
        on('forgotPasswordForm', 'submit', handleForgotPasswordSubmit);
        on('verifyCodeForm', 'submit', handleVerifyCode);
        on('resetPasswordForm', 'submit', handleResetPassword);

        // Signup
        on('signupForm', 'submit', handleSignup);
        on('backFromSignupBtn', 'click', () => showPage('welcome'));
        const switchToLogin = get('switchToLogin');
        if (switchToLogin) switchToLogin.addEventListener('click', e => { e.preventDefault(); showPage('login'); });

        // Dashboard quick actions
        on('dashboardMenuToggle', 'click', openMenu);
        on('quickTransferBtn', 'click', () => showPage('transfer'));
        on('quickCardBtn', 'click', () => showPage('card'));
        on('quickLoanBtn', 'click', () => showPage('loan'));
        on('quickInvestBtn', 'click', () => showPage('investment'));

        // Add Funds modal
        if (get('addFundsBtn')) get('addFundsBtn').addEventListener('click', openAddFundsModal);
        if (get('closeAddFundsModal')) get('closeAddFundsModal').addEventListener('click', closeAddFundsModal);
        if (get('cancelAddFundsBtn')) get('cancelAddFundsBtn').addEventListener('click', closeAddFundsModal);
        if (get('addFundsForm')) get('addFundsForm').addEventListener('submit', handleAddFunds);
        if (get('addFundsModal')) get('addFundsModal').addEventListener('click', e => { if (e.target.id === 'addFundsModal') closeAddFundsModal(); });

        // Transfer
        on('transferForm', 'submit', handleTransfer);
        on('backFromTransferBtn', 'click', () => showPage('dashboard'));

        // Beneficiaries
        on('beneficiaryForm', 'submit', handleAddBeneficiary);
        on('backFromBeneficiaryBtn', 'click', () => showPage('dashboard'));

        // Card
        on('cardForm', 'submit', handleAddCard);
        on('backFromCardBtn', 'click', () => showPage('dashboard'));

        // Loan
        on('loanForm', 'submit', handleLoan);
        on('backFromLoanBtn', 'click', () => showPage('dashboard'));

        // Investments
        const invBtns = document.querySelectorAll('.investment-card .btn');
        if (invBtns && invBtns.length) {
            invBtns.forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    const card = e.target.closest('.investment-card');
                    const title = card ? card.querySelector('h4') : null;
                    const name = title ? title.textContent : 'Investment';
                    const type = btn.dataset.investment || btn.getAttribute('data-investment');
                    selectInvestment(type, name);
                });
            });
        }
        on('cancelInvestmentBtn', 'click', cancelInvestment);
        on('investmentForm', 'submit', handleInvestment);
        on('backFromInvestmentBtn', 'click', () => showPage('dashboard'));

        // Transaction page
        on('backFromTransactionBtn', 'click', () => showPage('dashboard'));

        // Hamburger menu & overlay
        on('hamburgerBtn', 'click', openMenu);
        on('closeMenuBtn', 'click', closeMenu);
        on('menuOverlay', 'click', closeMenu);

        // Sidebar menu items
        on('dashboardMenuBtn', 'click', () => { showPage('dashboard'); closeMenu(); });
        on('transferMenuBtn', 'click', () => { showPage('transfer'); closeMenu(); });
        on('beneficiaryMenuBtn', 'click', () => { showPage('beneficiary'); closeMenu(); });
        on('cardMenuBtn', 'click', () => { showPage('card'); closeMenu(); });
        on('loanMenuBtn', 'click', () => { showPage('loan'); closeMenu(); });
        on('investmentMenuBtn', 'click', () => { showPage('investment'); closeMenu(); });
        on('transactionMenuBtn', 'click', () => { showPage('transaction'); closeMenu(); });
        on('logoutMenuBtn', 'click', handleLogout);

        // Market live toggle (if present)
        if (get('marketToggleBtn')) get('marketToggleBtn').addEventListener('click', toggleMarketLive);

        // Beneficiary select change to update bank name/autofill
        if (get('beneficiarySelect')) get('beneficiarySelect').addEventListener('change', updateBeneficiaryBankName);

        console.log('Event listeners initialized (guarded).');
    } catch (err) {
        console.error('init listeners error', err);
    }
}

// --- Navigation ---
function showPage(name) {
    Object.values(pages).forEach(pid => {
        const el = get(pid);
        if (el) el.classList.remove('active');
    });
    const pid = pages[name];
    if (pid) {
        const el = get(pid);
        if (el) el.classList.add('active');
        currentPage = name;
    }
    if (name === 'transaction') loadFullTransactionHistory();
}

// --- Menu ---
function openMenu() {
    const s = get('sidebarMenu'), o = get('menuOverlay'), h = get('hamburgerBtn');
    if (s) s.classList.add('active');
    if (o) o.classList.add('active');
    if (h) h.classList.add('active');
}
function closeMenu() {
    const s = get('sidebarMenu'), o = get('menuOverlay'), h = get('hamburgerBtn');
    if (s) s.classList.remove('active');
    if (o) o.classList.remove('active');
    if (h) h.classList.remove('active');
}

// --- Add Funds modal ---
function openAddFundsModal() { const m = get('addFundsModal'); if (m) m.classList.add('active'); }
function closeAddFundsModal() { const m = get('addFundsModal'); if (m) { m.classList.remove('active'); const f = get('addFundsForm'); if (f) f.reset(); } }

// --- Email helper (EmailJS optional) ---
function sendEmailNotification(email, subject, message) {
    try {
        console.log('Email request', { email, subject, message });
        if (typeof emailjs !== 'undefined') {
            emailjs.send('service_YOUR_SERVICE_ID', 'template_YOUR_TEMPLATE_ID', {
                to_email: email, subject, message
            }).then(r => console.log('email sent', r)).catch(e => console.warn('email err', e));
        }
    } catch (e) { console.warn(e); }

    // store in currentUser.notifications
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    if (cur) {
        if (!cur.notifications) cur.notifications = [];
        cur.notifications.push({ type: 'email', subject, message, timestamp: new Date().toISOString() });
        localStorage.setItem('currentUser', JSON.stringify(cur));
        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
    }
}

// --- Forgot password flow (demo-only via localStorage) ---
function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    const email = (get('forgotEmail') && get('forgotEmail').value) || '';
    if (!email) return showNotification('Enter email', 'error');
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (!users[email]) return showNotification('Email not found', 'error');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    forgotPasswordState.email = email;
    forgotPasswordState.resetToken = code;
    localStorage.setItem('resetCode_' + email, JSON.stringify({ code, ts: Date.now(), expiresIn: 10 * 60 * 1000 }));
    sendEmailNotification(email, 'Password Reset Code', `Your code: ${code}`);
    showNotification('Verification code sent to your email');
    const s1 = qs('.step-1'), s2 = qs('.step-2');
    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'block';
}
function handleVerifyCode(e) {
    e.preventDefault();
    const entered = (get('verificationCode') && get('verificationCode').value) || '';
    const email = forgotPasswordState.email;
    const stored = JSON.parse(localStorage.getItem('resetCode_' + email) || 'null');
    if (!stored) { showNotification('Code expired', 'error'); resetForgotPasswordForm(); showPage('login'); return; }
    if (Date.now() - stored.ts > stored.expiresIn) { localStorage.removeItem('resetCode_' + email); showNotification('Code expired', 'error'); resetForgotPasswordForm(); showPage('login'); return; }
    if (stored.code !== entered) return showNotification('Invalid code', 'error');
    showNotification('Code verified');
    const s2 = qs('.step-2'), s3 = qs('.step-3');
    if (s2) s2.style.display = 'none';
    if (s3) s3.style.display = 'block';
}
function handleResetPassword(e) {
    e.preventDefault();
    const np = (get('newPassword') && get('newPassword').value) || '';
    const cp = (get('confirmNewPassword') && get('confirmNewPassword').value) || '';
    if (np.length < 6) return showNotification('Password must be 6+ chars', 'error');
    if (np !== cp) return showNotification('Passwords do not match', 'error');
    const email = forgotPasswordState.email;
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email]) {
        users[email].password = np;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.removeItem('resetCode_' + email);
        sendEmailNotification(email, 'Password Reset', 'Your password has been changed');
        showNotification('Password reset successful');
        resetForgotPasswordForm();
        setTimeout(() => showPage('login'), 1200);
    }
}
function resetForgotPasswordForm() {
    if (get('forgotPasswordForm')) get('forgotPasswordForm').reset();
    if (get('verifyCodeForm')) get('verifyCodeForm').reset();
    if (get('resetPasswordForm')) get('resetPasswordForm').reset();
    const s1 = qs('.step-1'), s2 = qs('.step-2'), s3 = qs('.step-3');
    if (s1) s1.style.display = 'block';
    if (s2) s2.style.display = 'none';
    if (s3) s3.style.display = 'none';
    forgotPasswordState = { email: '', verificationCode: '', resetToken: '' };
}

// --- Login / Signup ---
function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const pass = form.querySelector('input[type="password"]').value;
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email] && users[email].password === pass) {
        const userData = users[email];
        localStorage.setItem('currentUser', JSON.stringify(userData));
        form.reset();
        updateDashboardDisplay();
        updateBeneficiarySelect();
        loadRecentTransactions();
        showPage('dashboard');
        showNotification('Login successful');
    } else {
        showNotification('Invalid email or password', 'error');
    }
}
function handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const phone = form.querySelector('input[type="tel"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const confirm = form.querySelectorAll('input[type="password"]')[1] ? form.querySelectorAll('input[type="password"]')[1].value : password;
    if (password !== confirm) return showNotification('Passwords do not match', 'error');

    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email]) return showNotification('Email already registered', 'error');

    const accountNumber = generateAccountNumber();
    const routingNumber = generateRoutingNumber();
    const userData = {
        fullName: name, email, phone, password,
        accountNumber, routingNumber, balance: 0,
        notifications: [], transactions: [], beneficiaries: [], cards: [], loans: [], investments: [],
        createdAt: new Date().toISOString()
    };
    users[email] = userData;
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(userData));
    sendEmailNotification(email, 'Welcome', `Welcome ${name}!\nAccount: ${accountNumber}\nRouting: ${routingNumber}`);
    form.reset();
    updateDashboardDisplay();
    updateBeneficiarySelect();
    loadRecentTransactions();
    showPage('dashboard');
    showNotification('Account created');
}
function handleLogout() {
    localStorage.removeItem('currentUser');
    closeMenu();
    showPage('welcome');
    showNotification('Logged out');
}

// --- Add Funds ---
function handleAddFunds(e) {
    e.preventDefault();
    const cur = requireLogin();
    if (!cur) return;
    const amountEl = get('fundAmount');
    const methodEl = get('paymentMethod');
    const notifyEl = get('notifyEmail');
    const amount = amountEl ? parseFloat(amountEl.value) : NaN;
    const method = methodEl ? methodEl.value : '';
    const notify = notifyEl ? notifyEl.checked : false;
    if (!(amount > 0) || !method) return showNotification('Enter amount and method', 'error');

    cur.balance = (cur.balance || 0) + amount;
    if (!cur.transactions) cur.transactions = [];
    cur.transactions.push({ id: Date.now(), type: 'credit', title: 'Funds Added', amount, date: new Date().toISOString(), paymentMethod: method });

    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }

    if (notify) sendEmailNotification(cur.email, 'Funds Added', `Amount: $${amount}\nBalance: $${cur.balance.toFixed(2)}`);
    updateDashboardDisplay();
    loadRecentTransactions();
    closeAddFundsModal();
    showNotification(`$${amount.toFixed(2)} added`);
}

// --- Transfer ---
function handleTransfer(e) {
    e.preventDefault();
    const cur = requireLogin();
    if (!cur) return;
    const form = e.target;
    const amount = parseFloat(form.querySelector('input[type="number"]').value);
    const beneficiaryId = (get('beneficiarySelect') && get('beneficiarySelect').value) || '';
    if (!(amount > 0) || !beneficiaryId) return showNotification('Enter amount and beneficiary', 'error');
    if ((cur.balance || 0) < amount) return showNotification('Insufficient balance', 'error');

    const beneficiary = (cur.beneficiaries || []).find(b => b.id == beneficiaryId) || { name: 'Recipient' };
    cur.balance -= amount;
    if (!cur.transactions) cur.transactions = [];
    cur.transactions.push({ id: Date.now(), type: 'debit', title: `Transfer to ${beneficiary.name}`, amount, date: new Date().toISOString() });

    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }

    sendEmailNotification(cur.email, 'Transfer Complete', `To: ${beneficiary.name}\nAmount: $${amount}`);
    showNotification(`Transfer of $${amount.toFixed(2)} successful`);
    form.reset();
    showPage('dashboard');
    updateDashboardDisplay();
    loadRecentTransactions();
}

// --- Beneficiaries ---
function handleAddBeneficiary(e) {
    e.preventDefault();
    const cur = requireLogin();
    if (!cur) return;
    const form = e.target;
    const inputs = form.querySelectorAll('input[type="text"]');
    const name = inputs[0]?.value || '';
    const accountNumber = inputs[1]?.value || '';
    const routingNumber = inputs[2]?.value || '';
    const bankName = inputs[3]?.value || '';
    if (!name || !accountNumber || !routingNumber || !bankName) return showNotification('Fill all fields', 'error');

    if (!cur.beneficiaries) cur.beneficiaries = [];
    const b = { id: Date.now(), name, accountNumber, routingNumber, bankName };
    cur.beneficiaries.push(b);

    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }

    addBeneficiaryToList(b);
    updateBeneficiarySelect();
    form.reset();
    showNotification(`Beneficiary ${name} added`);
}
function addBeneficiaryToList(b) {
    const container = get('beneficiaryListContainer');
    if (!container) return;
    const p = container.querySelector('p');
    if (p) p.remove();
    const card = document.createElement('div');
    card.className = 'beneficiary-card';
    card.id = `beneficiary-${b.id}`;
    card.innerHTML = `
    <div class="beneficiary-info">
      <h4>${b.name}</h4>
      <p>Account: ****${b.accountNumber.slice(-4)}</p>
      <p>Bank: ${b.bankName}</p>
    </div>
    <button class="delete-btn" data-id="${b.id}"><i class="fas fa-trash"></i></button>
  `;
    container.appendChild(card);
    const btn = card.querySelector('.delete-btn');
    if (btn) btn.addEventListener('click', () => deleteBeneficiary(b.id));
}
function deleteBeneficiary(id) {
    const cur = requireLogin();
    if (!cur) return;
    cur.beneficiaries = (cur.beneficiaries || []).filter(x => x.id !== id);
    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
    const el = get(`beneficiary-${id}`);
    if (el) el.remove();
    updateBeneficiarySelect();
    const container = get('beneficiaryListContainer');
    if (container && container.children.length === 0) container.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No beneficiaries added yet</p>';
    showNotification('Beneficiary deleted');
}

// --- Cards, loans, investments ---
function handleAddCard(e) {
    e.preventDefault();
    const cur = requireLogin(); if (!cur) return;
    const inputs = e.target.querySelectorAll('input[type="text"]');
    const cardNumber = inputs[0]?.value, expiry = inputs[1]?.value, cardholder = inputs[2]?.value;
    if (!cardNumber || !expiry || !cardholder) return showNotification('Fill card details', 'error');
    if (!cur.cards) cur.cards = [];
    cur.cards.push({ id: Date.now(), cardNumber, expiry, cardholder });
    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
    sendEmailNotification(cur.email, 'Card Added', `Card ending ${cardNumber.slice(-4)} added`);
    showNotification('Card added');
    e.target.reset();
    showPage('dashboard');
}
function handleLoan(e) {
    e.preventDefault();
    const cur = requireLogin(); if (!cur) return;
    const selects = e.target.querySelectorAll('select'); const inputs = e.target.querySelectorAll('input[type="number"]');
    const loanType = selects[0]?.value, amount = inputs[0]?.value, duration = selects[1]?.value;
    if (!loanType || !amount || !duration) return showNotification('Fill loan info', 'error');
    if (!cur.loans) cur.loans = [];
    cur.loans.push({ id: Date.now(), loanType, amount, duration, status: 'pending', appliedAt: new Date().toISOString() });
    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
    sendEmailNotification(cur.email, 'Loan Application', `Applied for ${amount}`);
    showNotification('Loan application submitted');
    e.target.reset();
    showPage('dashboard');
}
function selectInvestment(type, name) {
    selectedInvestment = { type, name };
    const opts = document.querySelector('.investment-options'); const form = get('investmentForm');
    if (opts) opts.style.display = 'none';
    if (form) { form.style.display = 'block'; const title = get('investmentTitle'); if (title) title.textContent = `Invest in ${name}`; }
}
function cancelInvestment() {
    selectedInvestment = null;
    const opts = document.querySelector('.investment-options'); const form = get('investmentForm');
    if (opts) opts.style.display = 'grid';
    if (form) { form.style.display = 'none'; form.reset(); }
}
function handleInvestment(e) {
    e.preventDefault();
    const cur = requireLogin(); if (!cur) return;
    const amount = parseFloat(e.target.querySelector('input[type="number"]').value);
    if (!selectedInvestment || !(amount > 0)) return showNotification('Enter amount', 'error');
    if ((cur.balance || 0) < amount) return showNotification('Insufficient balance', 'error');
    cur.balance -= amount;
    if (!cur.investments) cur.investments = [];
    cur.investments.push({ id: Date.now(), type: selectedInvestment.type, name: selectedInvestment.name, amount, investedAt: new Date().toISOString() });
    if (!cur.transactions) cur.transactions = [];
    cur.transactions.push({ id: Date.now(), type: 'debit', title: `Investment in ${selectedInvestment.name}`, amount, date: new Date().toISOString() });
    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
    showNotification(`Investment of $${amount} confirmed`);
    e.target.reset();
    cancelInvestment();
    updateDashboardDisplay();
    loadRecentTransactions();
    showPage('dashboard');
}

// --- Dashboard display & transactions ---
function updateDashboardDisplay() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    const userBalance = get('userBalance') || qs('.balance-amount');
    const accountNumberEl = qs('.account-number');
    if (userBalance) userBalance.textContent = '$' + ((cur && cur.balance) ? cur.balance.toFixed(2) : '0.00');
    if (accountNumberEl) {
        if (cur && cur.accountNumber) accountNumberEl.textContent = 'Savings Account • ****' + cur.accountNumber.slice(-4);
        else accountNumberEl.textContent = 'Savings Account • ****----';
    }
}

function updateBeneficiarySelect() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    const sel = get('beneficiarySelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Choose a beneficiary</option>';
    if (cur && cur.beneficiaries && cur.beneficiaries.length) {
        cur.beneficiaries.forEach(b => {
            const option = document.createElement('option');
            option.value = b.id;
            option.textContent = b.name;
            sel.appendChild(option);
        });
    }
    // update bank name autofill if selection exists
    updateBeneficiaryBankName();
}

function loadRecentTransactions() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    const el = get('recentTransactionsList');
    if (!el) return;
    el.innerHTML = '';
    if (cur && cur.transactions && cur.transactions.length) {
        const recent = cur.transactions.slice(-5).reverse();
        recent.forEach(tx => {
            const t = document.createElement('div');
            t.className = 'transaction-item';
            const isCredit = tx.type === 'credit';
            t.innerHTML = `
        <div class="transaction-icon ${isCredit ? 'received' : 'sent'}"><i class="fas ${isCredit ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></div>
        <div class="transaction-details"><p class="transaction-title">${tx.title}</p><p class="transaction-date">${new Date(tx.date).toLocaleDateString()}</p></div>
        <p class="transaction-amount ${isCredit ? 'positive' : 'negative'}">${isCredit ? '+' : '-'}$${tx.amount.toFixed(2)}</p>
      `;
            el.appendChild(t);
        });
    } else {
        el.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No transactions yet</p>';
    }
}

function loadFullTransactionHistory() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    const el = get('transactionHistoryList');
    if (!el) return;
    el.innerHTML = '';
    if (cur && cur.transactions && cur.transactions.length) {
        const all = cur.transactions.slice().reverse();
        all.forEach(tx => {
            const t = document.createElement('div');
            t.className = 'transaction-item';
            const isCredit = tx.type === 'credit';
            t.innerHTML = `
        <div class="transaction-icon ${isCredit ? 'received' : 'sent'}"><i class="fas ${isCredit ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></div>
        <div class="transaction-details"><p class="transaction-title">${tx.title}</p><p class="transaction-date">${new Date(tx.date).toLocaleDateString()}</p><p class="transaction-ref">Ref: TXN${tx.id}</p></div>
        <p class="transaction-amount ${isCredit ? 'positive' : 'negative'}">${isCredit ? '+' : '-'}$${tx.amount.toFixed(2)}</p>
      `;
            el.appendChild(t);
        });
    } else {
        el.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No transactions yet</p>';
    }
}

// --- Startup ---
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkLoginStatus();
    // initialize market display even if not started
    updateMarketDisplay();
});

// --- Check login status ---
function checkLoginStatus() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    if (cur && cur.email) {
        updateDashboardDisplay();
        updateBeneficiarySelect();
        loadRecentTransactions();
        showPage('dashboard');
    } else {
        showPage('welcome');
    }
}

// ------- Market live simulation & beneficiary bank display -------

let marketLiveInterval = null;
let lastRates = {
    'EURUSD': 1.08,
    'GBPUSD': 1.25,
    'BTCUSD': 38000
};

function formatRate(n, digits = 4) {
    if (n >= 1000) return n.toFixed(0);
    return n.toFixed(digits);
}

function updateMarketDisplay() {
    const e = get('rate-eur-usd');
    const g = get('rate-gbp-usd');
    const b = get('rate-btc-usd');
    const ts = get('marketTimestamp');
    if (e) e.textContent = formatRate(lastRates.EURUSD, 4);
    if (g) g.textContent = formatRate(lastRates.GBPUSD, 4);
    if (b) b.textContent = formatRate(lastRates.BTCUSD, 0);
    if (ts) ts.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
}

function simulateMarketTick() {
    lastRates.EURUSD *= (1 + (Math.random() - 0.5) * 0.002);
    lastRates.GBPUSD *= (1 + (Math.random() - 0.5) * 0.002);
    lastRates.BTCUSD *= (1 + (Math.random() - 0.5) * 0.01);
    updateMarketDisplay();
}

function startMarketLive(intervalMs = 5000) {
    if (marketLiveInterval) return;
    simulateMarketTick();
    marketLiveInterval = setInterval(simulateMarketTick, intervalMs);
    const btn = get('marketToggleBtn');
    if (btn) { btn.textContent = 'Stop Live'; btn.classList.add('active'); }
}

function stopMarketLive() {
    if (!marketLiveInterval) return;
    clearInterval(marketLiveInterval);
    marketLiveInterval = null;
    const btn = get('marketToggleBtn');
    if (btn) { btn.textContent = 'Start Live'; btn.classList.remove('active'); }
}

function toggleMarketLive() {
    if (marketLiveInterval) stopMarketLive();
    else startMarketLive();
}

// Update beneficiary bank name and optionally autofill account/routing
function updateBeneficiaryBankName() {
    const sel = get('beneficiarySelect');
    const bankNameEl = get('beneficiaryBankName');
    const accEl = get('accountNumber');
    const routEl = get('routingNumber');

    if (!sel) return;
    const val = sel.value;
    if (!val) {
        if (bankNameEl) bankNameEl.value = '';
        if (accEl) accEl.value = '';
        if (routEl) routEl.value = '';
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.beneficiaries) return;
    const beneficiary = currentUser.beneficiaries.find(b => String(b.id) === String(val));
    if (!beneficiary) {
        if (bankNameEl) bankNameEl.value = '';
        return;
    }

    if (bankNameEl) bankNameEl.value = beneficiary.bankName || '';
    if (accEl && beneficiary.accountNumber) accEl.value = beneficiary.accountNumber;
    if (routEl && beneficiary.routingNumber) routEl.value = beneficiary.routingNumber;
}