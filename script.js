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
        transaction: 'transactionPage',
            settings: 'settingsPage',
            support: 'supportPage'
};

let currentPage = 'welcome';
let selectedInvestment = null;
let forgotPasswordState = { email: '', verificationCode: '', resetToken: '' };

// EmailJS configuration (set from user-provided values)
const EMAILJS_PUBLIC_KEY = 'bkOlw6TLOWjJAs5aW';
const EMAILJS_SERVICE_ID = 'service_mdx02ak';
const EMAILJS_TEMPLATE_ID = 'template_support'; // update if you use a different template
// Helper to read configured template id from current user prefs or localStorage
function getConfiguredTemplateId() {
    const cur = JSON.parse(localStorage.getItem('currentUser')) || {};
    return cur.preferences?.emailjsTemplateId || localStorage.getItem('emailjsTemplateId') || EMAILJS_TEMPLATE_ID;
}

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
        on('quickTransferBtn', 'click', () => showPage('transfer'));
        on('quickCardBtn', 'click', () => { showPage('card'); initCardPage(); });
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

            // Settings page
            on('backFromSettingsBtn', 'click', () => showPage('dashboard'));
            on('settingsMenuBtn', 'click', () => { showPage('settings'); closeMenu(); loadSettingsData(); });

        // Hamburger menu & overlay
        on('hamburgerBtn', 'click', openMenu);
        on('closeMenuBtn', 'click', closeMenu);
        on('menuOverlay', 'click', closeMenu);

        // Support page navigation + contact form
        on('supportMenuBtn', 'click', () => { showPage('support'); closeMenu(); });
        on('backFromSupportBtn', 'click', () => showPage('settings'));
        if (get('contactForm')) get('contactForm').addEventListener('submit', handleContactForm);

        // Theme toggle
        if (get('themeToggle')) get('themeToggle').addEventListener('change', e => {
            const theme = e.target.checked ? 'dark' : 'light';
            saveSettingsPreference('theme', theme);
            applyTheme(theme);
        });

        // EmailJS Template ID save
        if (get('saveEmailJsTemplateBtn')) get('saveEmailJsTemplateBtn').addEventListener('click', () => {
            const val = (get('emailjsTemplateId') && get('emailjsTemplateId').value) || '';
            saveSettingsPreference('emailjsTemplateId', val);
            localStorage.setItem('emailjsTemplateId', val);
            showNotification('Template ID saved');
        });

        // Sidebar menu items
        on('dashboardMenuBtn', 'click', () => { showPage('dashboard'); closeMenu(); });
        on('transferMenuBtn', 'click', () => { showPage('transfer'); closeMenu(); });
        on('beneficiaryMenuBtn', 'click', () => { showPage('beneficiary'); closeMenu(); });
        on('cardMenuBtn', 'click', () => { showPage('card'); closeMenu(); initCardPage(); });
        on('loanMenuBtn', 'click', () => { showPage('loan'); closeMenu(); });
        on('investmentMenuBtn', 'click', () => { showPage('investment'); closeMenu(); });
        on('transactionMenuBtn', 'click', () => { showPage('transaction'); closeMenu(); });
        on('settingsMenuBtn', 'click', () => { showPage('settings'); closeMenu(); loadSettingsData(); });
        on('logoutMenuBtn', 'click', handleLogout);

        // Market live toggle (if present)
        if (get('marketToggleBtn')) get('marketToggleBtn').addEventListener('click', toggleMarketLive);

        // Beneficiary select change to update bank name/autofill
        if (get('beneficiarySelect')) get('beneficiarySelect').addEventListener('change', updateBeneficiaryBankName);
        // Transfer inputs change to lookup account bearer name
        if (get('accountNumber')) get('accountNumber').addEventListener('input', updateAccountBearerByDetails);
        if (get('routingNumber')) get('routingNumber').addEventListener('input', updateAccountBearerByDetails);
        if (get('bankSelect')) get('bankSelect').addEventListener('change', updateAccountBearerByDetails);

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
    
    // Show/hide hamburger menu and sidebar based on page
    const hamburger = get('hamburgerBtn');
    const sidebar = get('sidebarMenu');
    const overlay = get('menuOverlay');
    const authPages = ['welcome', 'login', 'signup', 'forgotPassword'];
    
    if (hamburger) {
        if (authPages.includes(name)) {
            hamburger.style.display = 'none';
        } else {
            hamburger.style.display = 'flex';
        }
    }
    
    // Also hide sidebar and overlay on auth pages
    if (authPages.includes(name)) {
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
}

// --- Menu ---
function openMenu() {
    const s = get('sidebarMenu'), o = get('menuOverlay'), h = get('hamburgerBtn');
    if (s) s.classList.add('active');
    if (o) o.classList.add('active');
    if (h) {
        // hide the floating hamburger when the sidebar is open
        h.style.display = 'none';
        h.classList.add('active');
    }
}
function closeMenu() {
    const s = get('sidebarMenu'), o = get('menuOverlay'), h = get('hamburgerBtn');
    if (s) s.classList.remove('active');
    if (o) o.classList.remove('active');
    if (h) {
        h.classList.remove('active');
        // restore hamburger visibility only on non-auth pages
        const authPages = ['welcome', 'login', 'signup', 'forgotPassword'];
        if (authPages.includes(currentPage)) h.style.display = 'none';
        else h.style.display = 'flex';
    }
}

// --- Add Funds modal ---
function openAddFundsModal() { const m = get('addFundsModal'); if (m) m.classList.add('active'); }
function closeAddFundsModal() { const m = get('addFundsModal'); if (m) { m.classList.remove('active'); const f = get('addFundsForm'); if (f) f.reset(); } }

// --- Email helper (EmailJS optional) ---
function sendEmailNotification(email, subject, message) {
    try {
        console.log('Email request', { email, subject, message });
        if (typeof emailjs !== 'undefined') {
            // Use configured service/template constants
            emailjs.send(EMAILJS_SERVICE_ID, getConfiguredTemplateId(), {
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
    // Transfers are currently disabled — account on hold message
    const form = e.target;
    const amount = parseFloat(form.querySelector('input[type="number"]').value);
    if (!(amount > 0)) return showNotification('Enter a valid amount', 'error');
    // show account on hold message and do not process the transfer
    showNotification('Account on hold. Transfers are temporarily disabled.', 'error');
    // Optionally, reveal a visible message on the transfer page
    const existing = document.getElementById('transferHoldNotice');
    if (!existing) {
        const notice = document.createElement('div');
        notice.id = 'transferHoldNotice';
        notice.style.cssText = 'margin-top:12px;padding:12px;border-radius:8px;background:#fff3cd;color:#856404;border:1px solid #ffeeba;';
        notice.textContent = 'Account on hold — transfers are temporarily unavailable. Please contact support.';
        form.appendChild(notice);
    }
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
    
    // Hide preview and show saved cards list
    const preview = get('cardPreview');
    if (preview) preview.style.display = 'none';
    loadSavedCards();
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
    // Ensure EmailJS is initialized with provided public key (safe if already init'ed in HTML)
    try { if (typeof emailjs !== 'undefined' && emailjs.init) emailjs.init(EMAILJS_PUBLIC_KEY); } catch (e) { /* ignore */ }
    checkLoginStatus();
    // initialize market display even if not started
    updateMarketDisplay();
    // populate bank list for transfer page
    populateBankSelect();
    // Apply saved theme preference (user or localStorage)
    try {
        const cur = JSON.parse(localStorage.getItem('currentUser')) || {};
        const themePref = cur.preferences?.theme || localStorage.getItem('theme') || 'light';
        if (get('themeToggle')) get('themeToggle').checked = (themePref === 'dark');
        applyTheme(themePref);
        // fill EmailJS template id field if present
        const tpl = cur.preferences?.emailjsTemplateId || localStorage.getItem('emailjsTemplateId') || '';
        if (get('emailjsTemplateId')) get('emailjsTemplateId').value = tpl;
    } catch (e) { console.warn('theme init', e); }
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

// Add spending overview and goal spending to live values
lastRates.SpendingOverview = 0;
lastRates.GoalSpending = 500; // default monthly goal

function formatMoney(n) {
    if (isNaN(n)) return '$-';
    return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

    // Ensure we have initial spending numbers based on current user data
    try {
        if ((!lastRates.SpendingOverview || lastRates.SpendingOverview === 0) && JSON.parse(localStorage.getItem('currentUser'))) {
            computeInitialSpending();
        }
    } catch (e) { /* ignore */ }

    // Update spending overview and goal UI
    const spendEl = get('rate-spend-overview');
    const goalEl = get('rate-goal-spending');
    const progEl = get('goalProgress');
    if (spendEl) spendEl.textContent = formatMoney(lastRates.SpendingOverview);
    if (goalEl) goalEl.textContent = formatMoney(lastRates.GoalSpending);
    if (progEl) {
        const pct = lastRates.GoalSpending > 0 ? Math.min(100, (lastRates.SpendingOverview / lastRates.GoalSpending) * 100) : 0;
        progEl.style.width = pct + '%';
    }
}

function simulateMarketTick() {
    lastRates.EURUSD *= (1 + (Math.random() - 0.5) * 0.002);
    lastRates.GBPUSD *= (1 + (Math.random() - 0.5) * 0.002);
    lastRates.BTCUSD *= (1 + (Math.random() - 0.5) * 0.01);
    // Small simulated fluctuations for spending overview (real values come from transactions)
    if (typeof lastRates.SpendingOverview === 'number') {
        const change = (Math.random() - 0.4) * 5; // -2 to +3 dollars approx per tick
        lastRates.SpendingOverview = Math.max(0, lastRates.SpendingOverview + change);
    }
    // Allow small drift in goal target (user may update via settings normally)
    if (typeof lastRates.GoalSpending === 'number') {
        lastRates.GoalSpending = Math.max(1, lastRates.GoalSpending + (Math.random() - 0.5) * 2);
    }
    updateMarketDisplay();
}

// Compute initial spending overview from user's recent debit transactions (30 days)
function computeInitialSpending() {
    try {
        const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (!cur) return;
        const now = Date.now();
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        let sum = 0;
        if (Array.isArray(cur.transactions)) {
            cur.transactions.forEach(tx => {
                try {
                    if (tx && tx.type === 'debit' && tx.amount) {
                        const tDate = tx.date ? new Date(tx.date).getTime() : now;
                        if ((now - tDate) <= THIRTY_DAYS) sum += Number(tx.amount) || 0;
                    }
                } catch (e) { /* ignore per-tx parse errors */ }
            });
        }
        lastRates.SpendingOverview = Math.max(0, sum);
        // Goal: read from preferences or user object
        const goal = cur.preferences?.spendingGoal || cur.spendingGoal || 500;
        lastRates.GoalSpending = Number(goal) || 500;
    } catch (e) { console.warn('computeInitialSpending error', e); }
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

// Lookup and display account bearer name based on entered account number, routing number and bank
function updateAccountBearerByDetails() {
    const accEl = get('accountNumber');
    const routEl = get('routingNumber');
    const bankSel = get('bankSelect');
    const bearerEl = get('accountBearerName');
    const bankNameEl = get('beneficiaryBankName');

    const acc = accEl ? accEl.value.trim() : '';
    const rout = routEl ? routEl.value.trim() : '';
    const bank = bankSel ? bankSel.value : (bankNameEl ? bankNameEl.value : '');

    const noticeEl = get('accountLookupNotice');
    if (!acc || !rout || !bank) {
        if (bearerEl) bearerEl.value = '';
        if (noticeEl) { noticeEl.style.display = 'none'; noticeEl.textContent = ''; }
        return;
    }

    let found = null;
    const cur = JSON.parse(localStorage.getItem('currentUser')) || {};
    // Search in current user's beneficiaries first
    if (cur.beneficiaries && cur.beneficiaries.length) {
        found = cur.beneficiaries.find(b => String(b.accountNumber) === String(acc) && String(b.routingNumber) === String(rout) && (b.bankName === bank || b.bankName === (bankNameEl ? bankNameEl.value : '')));
        if (found) {
            // select the beneficiary in the dropdown
            const sel = get('beneficiarySelect');
            if (sel) {
                sel.value = found.id;
                updateBeneficiaryBankName();
            }
        }
    }

    // If not found in user's beneficiaries, search all users (best-effort)
    if (!found) {
        const users = JSON.parse(localStorage.getItem('users')) || {};
        Object.values(users).some(u => {
            if (String(u.accountNumber) === String(acc) && String(u.routingNumber) === String(rout)) {
                found = { name: u.fullName || u.name || u.email, isExternal: true };
                return true;
            }
            return false;
        });
        // If found externally, add a temporary option to beneficiarySelect
        if (found && found.isExternal) {
            const sel = get('beneficiarySelect');
            if (sel) {
                // remove any previous temporary option
                const prevTmp = sel.querySelector('option[data-temp]');
                if (prevTmp) prevTmp.remove();
                const tmpVal = 'tmp-' + Date.now();
                const opt = document.createElement('option');
                opt.value = tmpVal;
                opt.textContent = `Matched: ${found.name}`;
                opt.setAttribute('data-temp', '1');
                sel.appendChild(opt);
                sel.value = tmpVal;
                // autofill bank name display
                if (bankNameEl) bankNameEl.value = bank;
            }
        }
    }

    if (found) {
        if (bearerEl) bearerEl.value = found.name || found.cardholder || 'Account Holder';
        if (noticeEl) { noticeEl.style.display = 'block'; noticeEl.textContent = `Matched account holder: ${bearerEl.value}`; noticeEl.style.background = '#e8f6ef'; noticeEl.style.color = '#1b5e20'; noticeEl.style.border = '1px solid #c8e6c9'; }
    } else {
        if (bearerEl) bearerEl.value = '';
        if (noticeEl) { noticeEl.style.display = 'block'; noticeEl.textContent = 'No match found — proceed with caution'; noticeEl.style.background = '#fff3cd'; noticeEl.style.color = '#856404'; noticeEl.style.border = '1px solid #ffeeba'; }
        // if there was a previous temporary option, remove it
        const sel = get('beneficiarySelect');
        if (sel) { const prevTmp = sel.querySelector('option[data-temp]'); if (prevTmp) prevTmp.remove(); }
    }
}

// Update card preview UI while user types
function updateCardPreview() {
    const form = get('cardForm');
    const preview = get('cardPreview');
    const img = get('cardPreviewImage');
    const pNumber = get('previewNumber');
    const pName = get('previewName');
    const pExpiry = get('previewExpiry');
    if (!form || !preview) return;
    const inputs = form.querySelectorAll('input[type="text"]');
    // inputs ordering in form: cardNumber, expiry, cvv, cardholder (may vary)
    const cardNumber = inputs[0] ? inputs[0].value.replace(/\s+/g, '') : '';
    const expiry = inputs[1] ? inputs[1].value : '';
    const cardholder = inputs[3] ? inputs[3].value : '';

    // Mask and format card number into groups of 4
    let displayNumber = '';
    if (!cardNumber) displayNumber = '•••• •••• •••• ••••';
    else {
        const groups = []; for (let i = 0; i < cardNumber.length; i += 4) groups.push(cardNumber.substring(i, i + 4));
        displayNumber = groups.join(' ');
        if (cardNumber.length < 16) displayNumber += ' ' + '•'.repeat( Math.max(0, 19 - displayNumber.length) );
    }
    if (pNumber) pNumber.textContent = displayNumber;
    if (pName) pName.textContent = cardholder ? cardholder.toUpperCase() : 'CARDHOLDER NAME';
    if (pExpiry) pExpiry.textContent = expiry || 'MM/YY';

    // Simple detection: start with 4 or 5 -> credit, otherwise debit
    const first = cardNumber ? cardNumber.charAt(0) : '';
    const creditPrefixes = ['4','5'];
    if (img) img.src = creditPrefixes.includes(first) ? 'images/creditcard.jpg' : 'images/debitcard.webp';
    preview.setAttribute('aria-hidden', 'false');
}

// Populate bank select if present (ensures dynamic content can be extended)
function populateBankSelect() {
    const sel = get('bankSelect');
    if (!sel) return;
    // If options already exist, don't overwrite — but ensure a default exists
    if (sel.options && sel.options.length > 1) return;
    const banks = {
        'US Banks': ['Bank of America','Chase','Wells Fargo','Citibank'],
        'Offshore Banks': ['Cayman Trust','Isle Finance'],
        'International Banks': ['HSBC','Standard Chartered','Deutsche Bank']
    };
    // clear except first
    sel.innerHTML = '<option value="">Choose bank</option>';
    Object.keys(banks).forEach(group => {
        const og = document.createElement('optgroup'); og.label = group;
        banks[group].forEach(b => { const o = document.createElement('option'); o.value = b; o.text = b; og.appendChild(o); });
        sel.appendChild(og);
    });
    sel.addEventListener('change', () => {
        const bn = get('beneficiaryBankName'); if (bn && sel.value) bn.value = sel.value;
    });
}

// Initialize card page: show preview and set up input listeners
function initCardPage() {
    const cardFormEl = get('cardForm');
    const preview = get('cardPreview');
    const savedCardsList = get('savedCardsList');
    
    // Show preview
    if (preview) preview.style.display = 'flex';
    
    // Wire up input listeners
    if (cardFormEl) {
        const cardInputs = cardFormEl.querySelectorAll('input');
        cardInputs.forEach(i => i.addEventListener('input', updateCardPreview));
        updateCardPreview();
    }
    
    // Load saved cards
    loadSavedCards();
}

// Load and display saved cards
function loadSavedCards() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    const container = get('savedCardsList');
    if (!container) return;
    
    container.innerHTML = '';
    if (cur && cur.cards && cur.cards.length) {
        const title = document.createElement('h3');
        title.textContent = 'Your Cards';
        title.style.marginTop = '25px';
        container.appendChild(title);
        
        cur.cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'saved-card-item';
            cardEl.id = `card-${card.id}`;
            const lastFour = card.cardNumber.slice(-4);
            const first = card.cardNumber.charAt(0);
            const isCredit = ['4','5'].includes(first);
            const cardType = isCredit ? 'Credit Card' : 'Debit Card';
            
            cardEl.innerHTML = `
                <div class="saved-card-display">
                    <img src="${isCredit ? 'images/creditcard.jpg' : 'images/debitcard.webp'}" alt="${cardType}" class="saved-card-image" />
                    <div class="saved-card-info">
                        <p class="saved-card-type">${cardType}</p>
                        <p class="saved-card-number">•••• •••• •••• ${lastFour}</p>
                        <p class="saved-card-holder">${card.cardholder.toUpperCase()}</p>
                        <p class="saved-card-expiry">Expires: ${card.expiry}</p>
                    </div>
                    <button class="delete-card-btn" data-id="${card.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(cardEl);
            
            const deleteBtn = cardEl.querySelector('.delete-card-btn');
            if (deleteBtn) deleteBtn.addEventListener('click', () => deleteCard(card.id));
        });
    }
}

// Delete a saved card
function deleteCard(id) {
    const cur = requireLogin();
    if (!cur) return;
    cur.cards = (cur.cards || []).filter(c => c.id !== id);
    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
    const el = get(`card-${id}`);
    if (el) el.remove();
    loadSavedCards();
    showNotification('Card deleted');
}

// Load settings page data
function loadSettingsData() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    if (!cur) return;
    
    // Populate account info
    const fullName = get('settingFullName');
    const email = get('settingEmail');
    const phone = get('settingPhone');
    if (fullName) fullName.textContent = cur.fullName || '-';
    if (email) email.textContent = cur.email || '-';
    if (phone) phone.textContent = cur.phone || '-';
    
    // Load notification preferences
    const emailNotif = get('emailNotifToggle');
    const smsNotif = get('smsNotifToggle');
    const txnAlert = get('transactionAlertToggle');
    if (emailNotif) emailNotif.checked = cur.preferences?.emailNotif !== false;
    if (smsNotif) smsNotif.checked = cur.preferences?.smsNotif || false;
    if (txnAlert) txnAlert.checked = cur.preferences?.transactionAlert !== false;
    
    // Load 2FA
    const twoFactor = get('twoFactorToggle');
    if (twoFactor) twoFactor.checked = cur.preferences?.twoFactorAuth || false;
    
    // Wire up toggle change listeners
    if (emailNotif) emailNotif.addEventListener('change', () => saveSettingsPreference('emailNotif', emailNotif.checked));
    if (smsNotif) smsNotif.addEventListener('change', () => saveSettingsPreference('smsNotif', smsNotif.checked));
    if (txnAlert) txnAlert.addEventListener('change', () => saveSettingsPreference('transactionAlert', txnAlert.checked));
    if (twoFactor) twoFactor.addEventListener('change', () => { saveSettingsPreference('twoFactorAuth', twoFactor.checked); showNotification(twoFactor.checked ? '2FA enabled' : '2FA disabled'); });
    
    // Wire action buttons
    const editProfileBtn = get('editProfileBtn');
    const changePasswordBtn = get('changePasswordBtn');
    const requestLimitBtn = get('requestLimitChangeBtn');
    const linkAccountBtn = get('linkAccountBtn');
    const downloadDataBtn = get('downloadDataBtn');
    const deactivateBtn = get('deactivateAccountBtn');
    
    if (editProfileBtn) editProfileBtn.addEventListener('click', () => showNotification('Profile editing coming soon', 'info'));
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', () => showNotification('Password change feature coming soon', 'info'));
    if (requestLimitBtn) requestLimitBtn.addEventListener('click', () => showNotification('Request submitted to support team', 'success'));
    if (linkAccountBtn) linkAccountBtn.addEventListener('click', () => showNotification('Account linking coming soon', 'info'));
    if (downloadDataBtn) downloadDataBtn.addEventListener('click', downloadUserData);
    if (deactivateBtn) deactivateBtn.addEventListener('click', deactivateAccount);
}

// Save settings preference
function saveSettingsPreference(key, value) {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    if (!cur) return;
    if (!cur.preferences) cur.preferences = {};
    cur.preferences[key] = value;
    localStorage.setItem('currentUser', JSON.stringify(cur));
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
}

// Apply theme to the document body
function applyTheme(theme) {
    try {
        if (theme === 'dark') {
            document.documentElement.style.setProperty('--bg-gradient-1', '#0f172a');
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    } catch (e) { console.warn('applyTheme error', e); }
}

// Download user data
function downloadUserData() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    if (!cur) return;
    const dataStr = JSON.stringify(cur, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank-data-${cur.email}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Data downloaded successfully');
}

// Deactivate account
function deactivateAccount() {
    const confirmed = confirm('Are you sure you want to deactivate your account? This action cannot be undone.');
    if (!confirmed) return;
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    if (cur) {
        cur.status = 'deactivated';
        cur.deactivatedAt = new Date().toISOString();
        localStorage.setItem('currentUser', JSON.stringify(cur));
        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
        showNotification('Account deactivated');
        setTimeout(() => { localStorage.removeItem('currentUser'); showPage('welcome'); }, 1500);
    }
}

// Handle contact support form submit
function handleContactForm(e) {
    e.preventDefault();
    const name = (get('contactName') && get('contactName').value) || '';
    const email = (get('contactEmail') && get('contactEmail').value) || '';
    const subject = (get('contactSubject') && get('contactSubject').value) || 'Support Request';
    const message = (get('contactMessage') && get('contactMessage').value) || '';
    const sendCopy = !!(get('contactSendCopy') && get('contactSendCopy').checked);

    if (!subject || !message) return showNotification('Please fill subject and message', 'error');

    const templateParams = {
        from_name: name || 'Anonymous',
        from_email: email || (JSON.parse(localStorage.getItem('currentUser'))?.email || ''),
        subject,
        message,
        send_copy: sendCopy ? 'yes' : 'no'
    };

    // Try sending via EmailJS, fallback to storing locally
    if (typeof emailjs !== 'undefined') {
        emailjs.send(EMAILJS_SERVICE_ID, getConfiguredTemplateId(), templateParams)
            .then(() => {
                showNotification('Message sent to support');
                if (sendCopy && email) showNotification('A copy was sent to your email');
                e.target.reset();
            }).catch(err => {
                console.warn('EmailJS send failed', err);
                // fallback: store in currentUser.supportMessages
                const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
                if (cur) {
                    if (!cur.supportMessages) cur.supportMessages = [];
                    cur.supportMessages.push({ id: Date.now(), name, email, subject, message, createdAt: new Date().toISOString(), sent: false });
                    localStorage.setItem('currentUser', JSON.stringify(cur));
                    const users = JSON.parse(localStorage.getItem('users')) || {};
                    if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
                }
                showNotification('Support message saved locally (send failed)', 'error');
            });
    } else {
        // EmailJS not available — store locally
        const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (cur) {
            if (!cur.supportMessages) cur.supportMessages = [];
            cur.supportMessages.push({ id: Date.now(), name, email, subject, message, createdAt: new Date().toISOString(), sent: false });
            localStorage.setItem('currentUser', JSON.stringify(cur));
            const users = JSON.parse(localStorage.getItem('users')) || {};
            if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
        }
        showNotification('Support message saved locally (Email service not configured)', 'info');
        e.target.reset();
    }
}