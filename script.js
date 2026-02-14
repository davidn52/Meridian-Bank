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
            support: 'supportPage',
            me: 'mePage',
            admin: 'adminPage'
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
    // generate a 10-digit numeric account number
    let a = '';
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
        // Robust fallback handlers + quick feedback (in case addEventListener didn't bind)
        const _showLoginBtn = get('showLoginBtn');
        if (_showLoginBtn) {
            _showLoginBtn.onclick = () => { console.log('showLoginBtn onclick'); showNotification('Opening login'); showPage('login'); };
        }
        const _showSignupBtn = get('showSignupBtn');
        if (_showSignupBtn) {
            _showSignupBtn.onclick = () => { console.log('showSignupBtn onclick'); showNotification('Opening signup'); showPage('signup'); };
        }

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
        // KYC file input previews
        const idFileEl = get('signupIdFile'); if (idFileEl) idFileEl.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0]; const disp = get('signupIdFileName'); if (disp) disp.textContent = f ? f.name : '';
        });
        const proofFileEl = get('signupProofFile'); if (proofFileEl) proofFileEl.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0]; const disp = get('signupProofFileName'); if (disp) disp.textContent = f ? f.name : '';
        });
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

        // Dashboard floating support & bottom nav
        on('dashboardSupportBtn', 'click', () => { showPage('support'); });
        on('navInvestBtn', 'click', () => { showPage('investment'); });
        on('navLoanBtn', 'click', () => { showPage('loan'); });
        on('navCardBtn', 'click', () => { showPage('card'); initCardPage(); });
        // When Me button is clicked, show Me page and expose quick actions panel
        on('navMeBtn', 'click', (e) => { showPage('me'); updateUserHeaderAndMePage(); showMeQuickActions(); });
        on('backFromMeBtn', 'click', () => { showPage('dashboard'); });
        // Me page interactions
        const saveProfileBtn = get('saveProfileBtn'); if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfileUpdates);
        const biometricToggle = get('biometricToggle'); if (biometricToggle) biometricToggle.addEventListener('change', () => toggleBiometric(biometricToggle.checked));
        const manageDevicesBtn = get('manageDevicesBtn'); if (manageDevicesBtn) manageDevicesBtn.addEventListener('click', () => showNotification('Open device management (demo)'));
        const openSupportChatBtn = get('openSupportChatBtn'); if (openSupportChatBtn) openSupportChatBtn.addEventListener('click', openSupportChat);
        const addTravelNoticeBtn = get('addTravelNoticeBtn'); if (addTravelNoticeBtn) addTravelNoticeBtn.addEventListener('click', () => showNotification('Travel notice added (demo)'));
        const downloadStatementBtn = get('downloadStatementBtn'); if (downloadStatementBtn) downloadStatementBtn.addEventListener('click', downloadStatement);
        const feedbackForm = get('feedbackForm'); if (feedbackForm) feedbackForm.addEventListener('submit', submitFeedback);

        // Copy account/routing clipboard
        if (get('copyAccountBtn')) get('copyAccountBtn').addEventListener('click', () => copyToClipboard(get('meAccountNumber')?.value || ''));
        if (get('copyRoutingBtn')) get('copyRoutingBtn').addEventListener('click', () => copyToClipboard(get('meRoutingNumber')?.value || ''));
        function saveAccountLimits(notify=true) {
            try {
                const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
                if (!cur) return notify && showNotification('Login first', 'error');
                if (!cur.preferences) cur.preferences = {};
                const t = Number(get('meTransferLimit')?.value) || 0;
                const w = Number(get('meWithdrawLimit')?.value) || 0;
                cur.preferences.dailyTransferLimit = t;
                cur.preferences.dailyWithdrawalLimit = w;
                localStorage.setItem('currentUser', JSON.stringify(cur));
                const users = JSON.parse(localStorage.getItem('users')) || {};
                if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
                if (notify) showNotification('Account limits saved');
                updateUserHeaderAndMePage();
                const btn = get('saveAccountLimitsBtn'); if (btn) { btn.disabled = false; btn.classList.remove('btn-saving'); }
            } catch (e) { console.warn(e); notify && showNotification('Save failed', 'error'); }
        }
        if (get('saveAccountLimitsBtn')) get('saveAccountLimitsBtn').addEventListener('click', () => saveAccountLimits(true));
        // live responsiveness: enable save when inputs change and debounce auto-save
        {
            let _saveT = null;
            const inputs = ['meTransferLimit','meWithdrawLimit'];
            inputs.forEach(id => {
                const el = get(id); if (!el) return;
                el.addEventListener('input', () => {
                    const btn = get('saveAccountLimitsBtn'); if (btn) { btn.disabled = false; btn.classList.add('btn-saving'); }
                    clearTimeout(_saveT);
                    _saveT = setTimeout(() => { saveAccountLimits(true); if (btn) btn.classList.remove('btn-saving'); }, 1200);
                });
            });
        }
        if (get('resetAccountNumberBtn')) get('resetAccountNumberBtn').addEventListener('click', () => {
            const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
            if (!cur) return showNotification('Login first', 'error');
            cur.accountNumber = generateAccountNumber();
            localStorage.setItem('currentUser', JSON.stringify(cur));
            const users = JSON.parse(localStorage.getItem('users')) || {};
            if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
            updateUserHeaderAndMePage();
            showNotification('Account number regenerated');
        });
        if (get('meLogoutBtn')) get('meLogoutBtn').addEventListener('click', () => { handleLogout(); });

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

        // Settings -> Account Limit quick open
        if (get('settingsOpenLimitBtn')) get('settingsOpenLimitBtn').addEventListener('click', () => {
            // reuse the openAccountLimit button if present
            if (get('openAccountLimitBtn')) get('openAccountLimitBtn').click();
            else {
                const m = get('limitModal'); if (m) m.classList.add('active');
            }
        });

        // Admin menu (simple simulator) wiring
        on('adminMenuBtn', 'click', () => { showPage('admin'); renderAdminRequests(); closeMenu(); });
        on('backFromAdminBtn', 'click', () => { showPage('settings'); });

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
        if (get('marketToggleBtn')) {
            const mt = get('marketToggleBtn');
            mt.setAttribute('aria-pressed', 'false');
            mt.setAttribute('aria-label', 'Start live market updates');
            mt.addEventListener('click', toggleMarketLive);
        }

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

// --- Me page helpers ---
function saveProfileUpdates(e) {
    e && e.preventDefault();
    try {
        const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (!cur) return showNotification('Please log in first', 'error');
        const email = get('meEditEmail') && get('meEditEmail').value;
        const phone = get('meEditPhone') && get('meEditPhone').value;
        if (email) cur.email = email;
        if (phone) cur.phone = phone;
        localStorage.setItem('currentUser', JSON.stringify(cur));
        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
        updateUserHeaderAndMePage();
        showNotification('Profile saved');
    } catch (e) { console.warn(e); showNotification('Save failed', 'error'); }
}

function toggleBiometric(enabled) {
    const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
    if (!cur) return showNotification('Log in to change biometric settings', 'error');
    if (!cur.preferences) cur.preferences = {};
    cur.preferences.biometric = !!enabled;
    localStorage.setItem('currentUser', JSON.stringify(cur));
    showNotification(enabled ? 'Biometric enabled' : 'Biometric disabled');
}

function openSupportChat() {
    showNotification('Opening secure chat (demo)');
    // In a real app this would open a secure messaging channel
}

function downloadStatement() {
    const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
    if (!cur) return showNotification('Login to download statements', 'error');
    // generate a small CSV as demo
    const csv = 'date,description,amount\n2026-02-01,Opening deposit,2000.00';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'statement.csv'; a.click();
    URL.revokeObjectURL(url);
    showNotification('Statement downloaded');
}

function submitFeedback(e) {
    e.preventDefault();
    const txt = get('feedbackText') && get('feedbackText').value;
    if (!txt) return showNotification('Please enter feedback', 'error');
    // store feedback locally for demo
    const feedback = JSON.parse(localStorage.getItem('feedback')) || [];
    feedback.push({ id: Date.now(), text: txt, createdAt: new Date().toISOString() });
    localStorage.setItem('feedback', JSON.stringify(feedback));
    get('feedbackText').value = '';
    showNotification('Feedback sent — thank you');
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

    // Show/hide bottom nav and floating support (hide on auth pages)
    const bottomNav = get('dashboardBottomNav');
    const floatSupport = get('dashboardSupportBtn');
    if (bottomNav) bottomNav.style.display = authPages.includes(name) ? 'none' : 'flex';
    if (floatSupport) floatSupport.style.display = authPages.includes(name) ? 'none' : 'flex';
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
    const name = (get('signupFullName') && get('signupFullName').value) || '';
    const dob = (get('signupDob') && get('signupDob').value) || '';
    const email = (get('signupEmail') && get('signupEmail').value) || '';
    const phone = (get('signupPhone') && get('signupPhone').value) || '';
    const password = (get('signupPassword') && get('signupPassword').value) || '';
    const confirm = (get('signupConfirmPassword') && get('signupConfirmPassword').value) || '';
    if (password !== confirm) return showNotification('Passwords do not match', 'error');

    // basic validation
    if (!name || !email || !phone || !password) return showNotification('Please fill required personal fields', 'error');

    const idFileInput = get('signupIdFile');
    const proofFileInput = get('signupProofFile');
    if (!idFileInput || !idFileInput.files || !idFileInput.files[0]) return showNotification('Please upload an ID document', 'error');
    if (!proofFileInput || !proofFileInput.files || !proofFileInput.files[0]) return showNotification('Please upload a proof of address', 'error');

    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email]) return showNotification('Email already registered or application exists', 'error');

    // helper to read small files as dataURL (limit 512KB)
    function readFileData(file) {
        const LIMIT = 512 * 1024;
        return new Promise((resolve) => {
            if (!file) return resolve({ name: '', size: 0, type: '', data: null });
            const reader = new FileReader();
            reader.onload = () => {
                const data = file.size <= LIMIT ? reader.result : null; // store data for small files only
                resolve({ name: file.name, size: file.size, type: file.type, data });
            };
            reader.onerror = () => resolve({ name: file.name, size: file.size, type: file.type, data: null });
            reader.readAsDataURL(file);
        });
    }

    Promise.all([readFileData(idFileInput.files[0]), readFileData(proofFileInput.files[0])]).then(([idFileData, proofFileData]) => {
        const accountNumber = generateAccountNumber();
        const routingNumber = generateRoutingNumber();
        const kyc = {
            idType: (get('signupIdType') && get('signupIdType').value) || '',
            idNumber: (get('signupIdNumber') && get('signupIdNumber').value) || '',
            idFile: { name: idFileData.name, size: idFileData.size, type: idFileData.type, dataUrl: idFileData.data },
            proofOfAddress: { name: proofFileData.name, size: proofFileData.size, type: proofFileData.type, dataUrl: proofFileData.data }
        };

        const userData = {
            fullName: name,
            dob,
            email,
            phone,
            password,
            accountNumber,
            routingNumber,
            balance: parseFloat((get('signupInitialDeposit') && get('signupInitialDeposit').value) || 0),
            kyc,
            kycStatus: 'pending',
            taxId: (get('signupTin') && get('signupTin').value) || '',
            taxCountry: (get('signupTaxCountry') && get('signupTaxCountry').value) || '',
            employment: (get('signupEmployment') && get('signupEmployment').value) || '',
            employer: (get('signupEmployer') && get('signupEmployer').value) || '',
            annualIncome: (get('signupIncome') && parseFloat(get('signupIncome').value)) || 0,
            sourceOfFunds: (get('signupSourceOfFunds') && get('signupSourceOfFunds').value) || '',
            notarized: (get('signupNotarized') && get('signupNotarized').checked) || false,
            address: (get('signupAddress') && get('signupAddress').value) || '',
            notifications: [], transactions: [], beneficiaries: [], cards: [], loans: [], investments: [],
            preferences: { dailyTransferLimit: 20000, dailyWithdrawalLimit: 50000, emailNotif: true, smsNotif: false, transactionAlert: true, twoFactorAuth: false },
            createdAt: new Date().toISOString(),
            applicationAt: new Date().toISOString()
        };

        users[email] = userData;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(userData));
        sendEmailNotification(email, 'Application Received', `Thank you ${name}, your application (${accountNumber}) has been received and is pending KYC review.`);
        form.reset();
        updateDashboardDisplay();
        updateBeneficiarySelect();
        loadRecentTransactions();
        showPage('dashboard');
        showNotification('Application submitted — KYC pending review');
    });
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
    // Use filters if present
    const from = (get('txFromDate') && get('txFromDate').value) ? new Date(get('txFromDate').value).getTime() : null;
    const to = (get('txToDate') && get('txToDate').value) ? (new Date(get('txToDate').value).getTime() + (24*60*60*1000 -1)) : null;
    const typeFilter = (get('txTypeFilter') && get('txTypeFilter').value) || 'all';

    el.innerHTML = '';
    if (cur && cur.transactions && cur.transactions.length) {
        const all = cur.transactions.slice().reverse().filter(tx => {
            if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
            if (from && new Date(tx.date).getTime() < from) return false;
            if (to && new Date(tx.date).getTime() > to) return false;
            return true;
        });
        if (all.length === 0) el.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No transactions match the filter</p>';
        all.forEach(tx => {
            const t = document.createElement('div');
            t.className = 'transaction-item';
            const isCredit = tx.type === 'credit';
            t.innerHTML = `
        <div class="transaction-icon ${isCredit ? 'received' : 'sent'}"><i class="fas ${isCredit ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></div>
        <div class="transaction-details"><p class="transaction-title">${tx.title}</p><p class="transaction-date">${new Date(tx.date).toLocaleDateString()}</p><p class="transaction-ref">Ref: TXN${tx.id}</p></div>
        <p class="transaction-amount ${isCredit ? 'positive' : 'negative'}">${isCredit ? '+' : '-'}$${Number(tx.amount).toFixed(2)}</p>
      `;
            el.appendChild(t);
        });
    } else {
        el.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No transactions yet</p>';
    }
}

// Transaction filter handlers
function wireTransactionFilters() {
    if (get('txFilterBtn')) get('txFilterBtn').addEventListener('click', e => { loadFullTransactionHistory(); showNotification('Filters applied', 'success'); });
    if (get('txClearFilterBtn')) get('txClearFilterBtn').addEventListener('click', e => { if (get('txFromDate')) get('txFromDate').value = ''; if (get('txToDate')) get('txToDate').value = ''; if (get('txTypeFilter')) get('txTypeFilter').value = 'all'; loadFullTransactionHistory(); showNotification('Filters cleared'); });
}

    // Account limit modal handlers
    if (get('openAccountLimitBtn')) get('openAccountLimitBtn').addEventListener('click', () => {
        const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (!cur || !cur.email) { showMeLoginBanner(); return; }
        const m = get('limitModal'); if (m) m.classList.add('active');
        // populate current values
        const t = cur.preferences?.dailyTransferLimit || cur.dailyTransferLimit || 20000;
        const w = cur.preferences?.dailyWithdrawalLimit || cur.dailyWithdrawalLimit || 50000;
        if (get('limitModalTransfer')) get('limitModalTransfer').textContent = '$' + Number(t).toLocaleString();
        if (get('limitModalWithdraw')) get('limitModalWithdraw').textContent = '$' + Number(w).toLocaleString();
        // set placeholders for quick increase
        if (get('reqTransfer')) { get('reqTransfer').placeholder = String(t); get('reqTransfer').value = ''; }
        if (get('reqWithdraw')) { get('reqWithdraw').placeholder = String(w); get('reqWithdraw').value = ''; }
    });

    // quick increase button (on Me page)
    if (get('increaseLimitQuickBtn')) get('increaseLimitQuickBtn').addEventListener('click', () => {
        const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (!cur || !cur.email) { showMeLoginBanner(); return; }
        // prefill suggested values (transfer 20k, withdraw 50k) and open the modal
        if (get('reqTransfer')) { get('reqTransfer').value = 20000; }
        if (get('reqWithdraw')) { get('reqWithdraw').value = 50000; }
        const m = get('limitModal'); if (m) m.classList.add('active');
        setTimeout(() => { if (get('reqGovId')) get('reqGovId').focus(); }, 150);
        showNotification('Prefilled suggested amounts. Attach government ID and submit.');
    });

    if (get('openUserInfoBtn')) get('openUserInfoBtn').addEventListener('click', () => { openUserInfoModal(); });
    if (get('openMeSettingsBtn')) get('openMeSettingsBtn').addEventListener('click', () => { showPage('settings'); loadSettingsData(); });

    // quick increase button (on Me page)
    if (get('increaseLimitQuickBtn')) get('increaseLimitQuickBtn').addEventListener('click', () => {
        // prefill suggested values (transfer 20k, withdraw 50k) and open the modal
        if (get('reqTransfer')) { get('reqTransfer').value = 20000; }
        if (get('reqWithdraw')) { get('reqWithdraw').value = 50000; }
        const m = get('limitModal'); if (m) m.classList.add('active');
        setTimeout(() => { if (get('reqGovId')) get('reqGovId').focus(); }, 150);
        showNotification('Prefilled suggested amounts. Attach government ID and submit.');
    });
    if (get('closeLimitModal')) get('closeLimitModal').addEventListener('click', () => { const m = get('limitModal'); if (m) m.classList.remove('active'); });
    if (get('cancelLimitRequest')) get('cancelLimitRequest').addEventListener('click', () => { const m = get('limitModal'); if (m) m.classList.remove('active'); });

    // submit limit request
    if (get('limitRequestForm')) get('limitRequestForm').addEventListener('submit', e => {
        e.preventDefault();
        const reqT = Number(get('reqTransfer')?.value) || 0;
        const reqW = Number(get('reqWithdraw')?.value) || 0;
        const note = get('reqNote')?.value || '';
        const fileEl = get('reqGovId');
        if (!fileEl || !fileEl.files || fileEl.files.length === 0) return showNotification('Attach government ID', 'error');
        const file = fileEl.files[0];

        // validation rules
        const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
        if (!cur) return showNotification('Login first', 'error');
        const curT = cur.preferences?.dailyTransferLimit || cur.dailyTransferLimit || 20000;
        const curW = cur.preferences?.dailyWithdrawalLimit || cur.dailyWithdrawalLimit || 50000;

        // must request a numeric positive value
        if (!(reqT > 0 || reqW > 0)) return showNotification('Enter a requested amount greater than zero', 'error');

        // require that requested values exceed current limits
        if (!(reqT > curT || reqW > curW)) return showNotification('Requested amounts must exceed current limits', 'error');

        // require at least 10% increase on any increased value
        const MIN_INCREASE_PCT = 0.10;
        let meetsPct = false;
        if (reqT > curT && reqT >= Math.ceil(curT * (1 + MIN_INCREASE_PCT))) meetsPct = true;
        if (reqW > curW && reqW >= Math.ceil(curW * (1 + MIN_INCREASE_PCT))) meetsPct = true;
        if (!meetsPct) return showNotification('Requested increase must be at least 10% above current limits', 'error');

        // prevent multiple pending requests
        const pending = (cur.limitRequests || []).filter(r => r.status === 'pending');
        if (pending.length) return showNotification('You already have a pending limit request', 'error');

        // 7-day cooldown since last request
        const lastReq = (cur.limitRequests || []).slice(-1)[0];
        if (lastReq) {
            const days = (Date.now() - new Date(lastReq.createdAt)) / (1000 * 60 * 60 * 24);
            if (days < 7) return showNotification('Please wait at least 7 days between requests', 'error');
        }

        // require a note explaining reason
        if (note.trim().length < 10) return showNotification('Provide a reason (at least 10 characters)', 'error');

        // max bounds
        const MAX_TRANSFER_REQUEST = 1000000;
        const MAX_WITHDRAW_REQUEST = 1000000;
        if (reqT > MAX_TRANSFER_REQUEST || reqW > MAX_WITHDRAW_REQUEST) return showNotification('Requested amount exceeds allowed maximum', 'error');

        // file type & size checks (<=5MB)
        const allowedTypes = ['image/png','image/jpeg','image/jpg','application/pdf'];
        if (file.size > 5 * 1024 * 1024) return showNotification('File too large (max 5MB)', 'error');
        if (file.type && !allowedTypes.includes(file.type)) return showNotification('Invalid file type (use PNG/JPEG/PDF)', 'error');

        // read file as data URL
        const reader = new FileReader();
        reader.onload = function(ev) {
            const dataUrl = ev.target.result;
            if (!cur) { showNotification('Login first', 'error'); return; }
            if (!cur.limitRequests) cur.limitRequests = [];
            const req = { id: Date.now(), requestedTransfer: reqT, requestedWithdraw: reqW, note, fileName: file.name, fileData: dataUrl, status: 'pending', createdAt: new Date().toISOString(), requestedBy: cur.email };
            cur.limitRequests.push(req);
            localStorage.setItem('currentUser', JSON.stringify(cur));
            const users = JSON.parse(localStorage.getItem('users')) || {};
            if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
            showNotification('Limit increase request submitted');
            const m = get('limitModal'); if (m) m.classList.remove('active');
            // refresh Me page display
            updateUserHeaderAndMePage();
        };
        reader.onerror = function() { showNotification('File read failed', 'error'); };
        reader.readAsDataURL(file);
    });

    // Open settings from Me page
    if (get('openMeSettingsBtn')) get('openMeSettingsBtn').addEventListener('click', () => { showPage('settings'); loadSettingsData(); });
    if (get('openUserInfoBtn')) get('openUserInfoBtn').addEventListener('click', () => { openUserInfoModal(); });
    if (get('settingsOpenUserInfoBtn')) get('settingsOpenUserInfoBtn').addEventListener('click', () => { openUserInfoModal(); showPage('settings'); loadSettingsData(); });

    // Me quick actions
    if (get('meQuickAccountLimit')) get('meQuickAccountLimit').addEventListener('click', () => { if (get('openAccountLimitBtn')) get('openAccountLimitBtn').click(); hideMeQuickActions(); });
    if (get('meQuickIncreaseLimit')) get('meQuickIncreaseLimit').addEventListener('click', () => { if (get('increaseLimitQuickBtn')) get('increaseLimitQuickBtn').click(); hideMeQuickActions(); setTimeout(() => { if (get('reqTransfer')) get('reqTransfer').focus(); }, 200); });
    if (get('meQuickUserInfo')) get('meQuickUserInfo').addEventListener('click', () => { openUserInfoModal(); hideMeQuickActions(); });
        // hide quick actions when clicking outside
        document.addEventListener('click', (ev) => {
            if (ev && ev.target && !ev.target.closest) return;
            if (!ev.target.closest('#meQuickActions') && !ev.target.closest('#navMeBtn')) hideMeQuickActions();
        });

        // Account Sessions buttons in Me page
        if (get('meSessionUserInfo')) get('meSessionUserInfo').addEventListener('click', () => openUserInfoModal());
        if (get('meSessionAccountLimits')) get('meSessionAccountLimits').addEventListener('click', () => { if (get('openAccountLimitBtn')) get('openAccountLimitBtn').click(); });
        if (get('meSessionSettings')) get('meSessionSettings').addEventListener('click', () => { showPage('settings'); loadSettingsData(); });
        if (get('meSessionMarketReader')) get('meSessionMarketReader').addEventListener('click', () => { const m = get('marketReaderModal'); if (m) m.classList.add('active'); renderProfessionalMarketReader(); });

        // Market reader modal controls
        if (get('refreshMarketReaderBtn')) get('refreshMarketReaderBtn').addEventListener('click', () => { simulateMarketTick(); renderProfessionalMarketReader(); showNotification('Market prediction refreshed'); });
        if (get('closeMarketReaderBtn')) get('closeMarketReaderBtn').addEventListener('click', () => { const m = get('marketReaderModal'); if (m) m.classList.remove('active'); });
        if (get('closeMarketReaderBtn2')) get('closeMarketReaderBtn2').addEventListener('click', () => { const m = get('marketReaderModal'); if (m) m.classList.remove('active'); });
        if (get('refreshMarketReaderBtn')) get('refreshMarketReaderBtn').addEventListener('click', () => { simulateMarketTick(); renderProfessionalMarketReader(); showNotification('Yearly prediction refreshed'); });
        if (get('mrInstrumentSelect')) get('mrInstrumentSelect').addEventListener('change', () => { drawYearlyPredictionChart('mr_yearly', get('mrInstrumentSelect').value, Number(get('mrTimeframeSelect').value || 365)); });
        if (get('mrTimeframeSelect')) get('mrTimeframeSelect').addEventListener('change', () => { drawYearlyPredictionChart('mr_yearly', get('mrInstrumentSelect').value, Number(get('mrTimeframeSelect').value || 365)); });

        // Market Forecast section controls
        if (get('mfRefresh')) get('mfRefresh').addEventListener('click', () => { simulateMarketTick(); renderProfessionalMarketReader(); drawYearlyPredictionChart('mr_forecast_chart', get('mfInstrument').value, Number(get('mfTimeframe').value || 365)); showNotification('Forecast refreshed'); });
        if (get('mfInstrument')) get('mfInstrument').addEventListener('change', () => { drawYearlyPredictionChart('mr_forecast_chart', get('mfInstrument').value, Number(get('mfTimeframe').value || 365)); });
        if (get('mfTimeframe')) get('mfTimeframe').addEventListener('change', () => { drawYearlyPredictionChart('mr_forecast_chart', get('mfInstrument').value, Number(get('mfTimeframe').value || 365)); });
        if (get('mfExport')) get('mfExport').addEventListener('click', () => { exportCanvasPNG('mr_forecast_chart', `market-forecast-${(get('mfInstrument')?.value||'EURUSD')}.png`); });
        if (get('mfExportCSV')) get('mfExportCSV').addEventListener('click', () => { exportMarketForecastCSV(); });

        // Admin decision modal controls
        if (get('closeAdminDecisionModal')) get('closeAdminDecisionModal').addEventListener('click', () => { const m = get('adminDecisionModal'); if (m) m.classList.remove('active'); });
        if (get('adminDecisionCancel')) get('adminDecisionCancel').addEventListener('click', () => { const m = get('adminDecisionModal'); if (m) m.classList.remove('active'); });
        if (get('adminDecisionConfirm')) get('adminDecisionConfirm').addEventListener('click', () => {
            const m = get('adminDecisionModal'); if (!m) return;
            const email = m.dataset.email; const id = Number(m.dataset.id);
            const actionEl = m.querySelector('input[name="adminDecisionAction"]:checked');
            const action = actionEl ? actionEl.value : 'deny';
            const note = (get('adminDecisionNote')||{}).value || '';
            if (action === 'approve') approveLimitRequest(email, id, note); else denyLimitRequest(email, id, note);
            m.classList.remove('active');
        });
    // Initialize event listeners so UI responds
    try { initializeEventListeners(); } catch (e) { console.warn('init listeners error', e); }

    // Cleanup any accidentally-open overlays or modals that may block clicks
    (function cleanupBlockingUI() {
        try {
            document.querySelectorAll('.modal.active, .menu-overlay.active, #menuOverlay.active').forEach(el => el.classList.remove('active'));
            // ensure modals hidden
            ['limitModal','userInfoModal','addFundsModal','adminDecisionModal'].forEach(id => { const m = get(id); if (m) m.classList.remove('active'); });
            document.body.style.pointerEvents = 'auto';
        } catch (e) { console.warn('cleanupBlockingUI', e); }
    })();

    // If opened with a hash or ?page= param, navigate to that page automatically
    (function handleInitialRoute() {
        try {
            const hash = (location.hash || '').replace('#', '').toLowerCase();
            const params = new URLSearchParams(location.search);
            const pageParam = (params.get('page') || '').toLowerCase();
            const route = hash || pageParam;
            const map = { login: 'login', signup: 'signup', dashboard: 'dashboard', transfer: 'transfer', me: 'me' };
            if (route && map[route]) {
                showPage(map[route]);
                // For login/signup, focus the first input for quick access
                setTimeout(() => {
                    const first = document.querySelector(`#${map[route]}Page input, #${map[route]}Page select, #${map[route]}Page textarea`);
                    if (first) first.focus();
                }, 150);
            }
        } catch (e) { /* ignore */ }
    })();

    // Temporary click feedback for first 10s to help debug unresponsive UI
    (function transientClickFeedback() {
        const showBox = (txt) => {
            const b = document.createElement('div'); b.textContent = txt;
            b.style.cssText = 'position:fixed;left:10px;top:10px;z-index:99999;background:#111;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;opacity:0.95';
            document.body.appendChild(b); setTimeout(() => b.remove(), 1600);
        };
        function onClick(e) {
            try {
                const t = e.target; const id = t.id ? `#${t.id}` : ''; const cls = t.className ? `.${String(t.className).split(' ')[0]}` : '';
                showBox(`Clicked ${t.tagName}${id}${cls}`);
            } catch (err) { /* ignore */ }
        }
        document.addEventListener('click', onClick, true);
        setTimeout(() => document.removeEventListener('click', onClick, true), 10000);
    })();

    // Add robust fallback onclick handlers for key navigation and Me controls
    (function addFallbackOnClicks() {
        try {
            const f = (id, fn) => { const el = get(id); if (el && !el.onclick) el.onclick = fn; };
            f('hamburgerBtn', openMenu);
            f('dashboardMenuBtn', () => { showPage('dashboard'); closeMenu(); });
            f('transferMenuBtn', () => { showPage('transfer'); closeMenu(); });
            f('beneficiaryMenuBtn', () => { showPage('beneficiary'); closeMenu(); });
            f('cardMenuBtn', () => { showPage('card'); closeMenu(); initCardPage(); });
            f('loanMenuBtn', () => { showPage('loan'); closeMenu(); });
            f('investmentMenuBtn', () => { showPage('investment'); closeMenu(); });
            f('transactionMenuBtn', () => { showPage('transaction'); closeMenu(); });
            f('settingsMenuBtn', () => { showPage('settings'); closeMenu(); loadSettingsData(); });
            f('supportMenuBtn', () => { showPage('support'); closeMenu(); });
            f('logoutMenuBtn', handleLogout);
            f('dashboardSupportBtn', () => { showPage('support'); });
            f('navInvestBtn', () => { showPage('investment'); });
            f('navLoanBtn', () => { showPage('loan'); });
            f('navCardBtn', () => { showPage('card'); initCardPage(); });
            f('navMeBtn', () => { showPage('me'); updateUserHeaderAndMePage(); showMeQuickActions(); });
            f('openUserInfoBtn', openUserInfoModal);
            f('openAccountLimitBtn', () => { const m = get('limitModal'); if (m) m.classList.add('active'); });
        } catch (e) { console.warn('addFallbackOnClicks', e); }
    })();

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
    // wire transaction filters
    wireTransactionFilters();
    // initial sparkline render
    renderSpendingSparkline();

// --- Check login status ---
function checkLoginStatus() {
    const cur = JSON.parse(localStorage.getItem('currentUser'));
    if (cur && cur.email) {
        updateDashboardDisplay();
        updateBeneficiarySelect();
        loadRecentTransactions();
        showPage('dashboard');
        updateUserHeaderAndMePage();
    } else {
        showPage('welcome');
    }
}

function updateUserHeaderAndMePage() {
    try {
        const cur = JSON.parse(localStorage.getItem('currentUser')) || {};
        if (get('headerUserName')) get('headerUserName').textContent = cur.fullName || cur.name || cur.email || 'Guest';
        if (get('headerAvatar')) {
            const initials = (cur.fullName || cur.name || 'G').split(' ').map(n => n.charAt(0)).slice(0,2).join('').toUpperCase();
            get('headerAvatar').textContent = initials;
        }
        if (get('meFullName')) get('meFullName').textContent = cur.fullName || cur.name || 'Your Name';
        if (get('meEmail')) get('meEmail').textContent = cur.email || '';
        if (get('mePhone')) get('mePhone').textContent = cur.phone || '';
        if (get('meAccountNumber')) get('meAccountNumber').value = String(cur.accountNumber || '');
        if (get('meRoutingNumber')) get('meRoutingNumber').value = String(cur.routingNumber || '');
        // admin menu visibility
        const adminBtn = get('adminMenuBtn'); if (adminBtn) adminBtn.style.display = cur.isAdmin ? 'block' : 'none';
        // ensure Me page controls are visible and clickable for all users (make UI discoverable)
        const meControls = ['openAccountLimitBtn','openMeSettingsBtn','saveAccountLimitsBtn','resetAccountNumberBtn','meLogoutBtn','copyAccountBtn','copyRoutingBtn'];
        meControls.forEach(id => {
            const el = get(id);
            if (!el) return;
            el.style.display = ''; // show control
            try { el.disabled = false; } catch (e) { /* not all elements have disabled */ }
            el.style.cursor = 'pointer';
        });
        // populate limits
        const t = cur.preferences?.dailyTransferLimit || cur.dailyTransferLimit || '';
        const w = cur.preferences?.dailyWithdrawalLimit || cur.dailyWithdrawalLimit || '';
        if (get('meTransferLimit')) get('meTransferLimit').value = t;
        if (get('meWithdrawLimit')) get('meWithdrawLimit').value = w;
        // update Me page current limit summaries
        if (get('meCurrentTransfer')) get('meCurrentTransfer').textContent = '$' + Number(t).toLocaleString();
        if (get('meCurrentWithdraw')) get('meCurrentWithdraw').textContent = '$' + Number(w).toLocaleString();
        // hide login banner when user is present
        const meBanner = get('meLoginBanner'); if (meBanner) { meBanner.style.display = (cur && cur.email) ? 'none' : 'block'; }
        // ensure save button is clickable (allow user to interact even when not logged in)
        const saveBtnEl = get('saveAccountLimitsBtn'); if (saveBtnEl) { saveBtnEl.disabled = false; saveBtnEl.classList.remove('btn-saving'); }
        // render previous limit requests
        const list = get('meLimitRequestsList');
        if (list) {
            list.innerHTML = '';
            const reqs = cur.limitRequests || [];
            if (!reqs.length) list.innerHTML = '<p style="color:#6b7280">No limit requests yet</p>';
            reqs.slice().reverse().forEach(r => {
                const item = document.createElement('div'); item.className = 'limit-request';
                item.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>Requested:</strong> Transfer $${Number(r.requestedTransfer).toLocaleString()} / Withdraw $${Number(r.requestedWithdraw).toLocaleString()}</div><div class="meta">${new Date(r.createdAt).toLocaleString()}</div></div><div style="margin-top:6px">${r.note ? `<div>${r.note}</div>` : ''}${r.fileData ? `<div style="margin-top:8px"><a class="btn btn-secondary" href="${r.fileData}" target="_blank">View ID</a></div>` : ''}<div style="margin-top:8px;color:#374151">Status: <span class="status">${r.status}</span></div></div>`;
                list.appendChild(item);
            });
        }
    } catch (e) { console.warn('updateUserHeaderAndMePage', e); }
}

// Me quick actions: show/hide
function showMeQuickActions() {
    const qa = get('meQuickActions');
    const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
    if (!qa || !cur || !cur.email) return;
    qa.style.display = 'flex';
    qa.setAttribute('aria-hidden','false');
    // auto-hide after 7s
    setTimeout(() => { hideMeQuickActions(); }, 7000);
}
function hideMeQuickActions() { const qa = get('meQuickActions'); if (qa) { qa.style.display = 'none'; qa.setAttribute('aria-hidden','true'); } }

// User Info modal helpers
function openUserInfoModal() {
    const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
    if (!cur) { showNotification('Login first', 'error'); return; }
    if (get('userInfoFullName')) get('userInfoFullName').value = cur.fullName || cur.name || '';
    if (get('userInfoEmail')) get('userInfoEmail').value = cur.email || '';
    if (get('userInfoPhone')) get('userInfoPhone').value = cur.phone || '';
    if (get('userInfoAccount')) get('userInfoAccount').value = cur.accountNumber || '';
    if (get('userInfoRouting')) get('userInfoRouting').value = cur.routingNumber || '';
    const m = get('userInfoModal'); if (m) m.classList.add('active');
}
function closeUserInfoModal() { const m = get('userInfoModal'); if (m) m.classList.remove('active'); }

// Admin decision modal helpers
function openAdminDecisionModal(email, id, action) {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    const user = users[email];
    const req = user ? (user.limitRequests || []).find(r => r.id === id) : null;
    const m = get('adminDecisionModal'); if (!m) return;
    m.dataset.email = email; m.dataset.id = String(id);
    // summary
    if (req) {
        get('adminDecisionSummary').innerHTML = `<div><strong>${user.fullName || user.email}</strong> — Requested Transfer $${Number(req.requestedTransfer).toLocaleString()} / Withdraw $${Number(req.requestedWithdraw).toLocaleString()}</div><div style="margin-top:6px;color:#6b7280">Submitted: ${new Date(req.createdAt).toLocaleString()}</div>`;
        // populate history
        const h = (req.history || []).slice().reverse().map(hh => `<div style="margin-top:6px">${new Date(hh.at).toLocaleString()} — <strong>${hh.action}</strong> by ${hh.by}${hh.note ? ` — ${hh.note}` : ''}</div>`).join('');
        get('adminDecisionHistory').innerHTML = h || '<div style="opacity:0.8">No decision history</div>';
    } else {
        get('adminDecisionSummary').textContent = 'Request not found'; get('adminDecisionHistory').innerHTML = '';
    }
    // set action radio
    const actionEl = m.querySelector(`input[name="adminDecisionAction"][value="${action}"]`);
    if (actionEl) actionEl.checked = true;
    if (get('adminDecisionNote')) get('adminDecisionNote').value = '';
    m.classList.add('active');
}

function closeAdminDecisionModal() { const m = get('adminDecisionModal'); if (m) m.classList.remove('active'); }
// copy buttons for user info modal
if (get('userInfoCopyAccount')) get('userInfoCopyAccount').addEventListener('click', () => copyToClipboard(get('userInfoAccount')?.value || ''));
if (get('userInfoCopyRouting')) get('userInfoCopyRouting').addEventListener('click', () => copyToClipboard(get('userInfoRouting')?.value || ''));
if (get('closeUserInfoModal')) get('closeUserInfoModal').addEventListener('click', () => closeUserInfoModal());

function copyToClipboard(text) {
    if (!text) return showNotification('Nothing to copy', 'error');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showNotification('Copied to clipboard'))
            .catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showNotification('Copied to clipboard'); } catch (e) { showNotification('Copy failed', 'error'); }
    ta.remove();
}

// ------- Market live simulation & beneficiary bank display -------

let marketLiveInterval = null;
let lastRates = {
    'EURUSD': 1.08,
    'GBPUSD': 1.25,
    'BTCUSD': 38000
};
// previous snapshot used by professional reader heuristics
let lastRatesPrev = Object.assign({}, lastRates);
// simple history for rendering mini-graphs (seeded with small variations)
let lastRatesHistory = {
    EURUSD: new Array(24).fill(0).map((_,i) => 1.06 + Math.sin(i/3)*0.002 + Math.random()*0.002),
    GBPUSD: new Array(24).fill(0).map((_,i) => 1.23 + Math.sin(i/4)*0.002 + Math.random()*0.002),
    BTCUSD: new Array(24).fill(0).map((_,i) => 37000 + Math.sin(i/2)*150 + Math.random()*80)
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
        // accessibility for screen readers
        progEl.setAttribute('role', 'progressbar');
        progEl.setAttribute('aria-valuemin', '0');
        progEl.setAttribute('aria-valuemax', '100');
        progEl.setAttribute('aria-valuenow', String(Math.round(pct)));
        progEl.setAttribute('aria-label', `Spending goal progress: ${Math.round(pct)}%`);
        // add descriptive label on the goal value element
        if (get('rate-goal-spending')) get('rate-goal-spending').setAttribute('aria-label', `Goal spending target: ${formatMoney(lastRates.GoalSpending)}`);
    }

    // render professional reader if present on page
    try { renderProfessionalMarketReader(); } catch (e) { /* ignore */ }
    try { drawYearlyPredictionChart('mr_forecast_chart', (get('mfInstrument')?.value || 'EURUSD'), Number(get('mfTimeframe')?.value || 365)); } catch (e) { /* ignore */ }
}

function simulateMarketTick() {
    // snapshot previous
    lastRatesPrev = Object.assign({}, lastRates);
    // apply small random ticks
    lastRates.EURUSD *= (1 + (Math.random() - 0.5) * 0.002);

// Show Me page login banner
function showMeLoginBanner() {
    const b = get('meLoginBanner'); if (!b) return;
    b.style.display = 'block';
    const btn = get('meBannerLoginBtn'); if (btn) btn.addEventListener('click', () => { showPage('login'); });
    const dismiss = get('meBannerDismissBtn'); if (dismiss) dismiss.addEventListener('click', () => { b.style.display = 'none'; });
}

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

    // update histories (rolling)
    const pushHistory = (k,v) => { const a = lastRatesHistory[k] || []; a.push(v); while (a.length > 40) a.shift(); lastRatesHistory[k] = a; };
    pushHistory('EURUSD', lastRates.EURUSD);
    pushHistory('GBPUSD', lastRates.GBPUSD);
    pushHistory('BTCUSD', lastRates.BTCUSD);
}

// Professional market reader — generates a short human-friendly summary/prediction
function renderProfessionalMarketReader() {
    const el = get('marketReaderContent') || get('meMarketReader');
    if (!el) return;
    const instruments = ['EURUSD','GBPUSD','BTCUSD'];
    const lines = [];
    instruments.forEach(k => {
        const prev = lastRatesPrev[k] || lastRates[k];
        const now = lastRates[k];
        const pct = ((now - prev) / prev) * 100;
        const dir = pct > 0.05 ? 'rising' : pct < -0.05 ? 'falling' : 'stable';
        const advice = pct > 0.2 ? 'strong upward momentum' : (pct < -0.2 ? 'strong downward momentum' : 'mild movements');
        lines.push(`${k.replace('USD','/USD')}: ${formatRate(now, k==='BTCUSD'?0:4)} (${pct.toFixed(2)}%) — ${dir}; short-term: ${advice}.`);
    });
    // spending outlook
    lines.push(`Spending overview: ${formatMoney(lastRates.SpendingOverview)} (goal ${formatMoney(lastRates.GoalSpending)}).`);
    lines.push('Recommendation: monitor macro releases and set alerts for >0.5% moves. This is a simulated professional read for demo only.');
    el.innerHTML = lines.map(l => `<p style="margin:6px 0">${l}</p>`).join('');

    // compute a simple confidence score (0-100)
    try {
        const volSamples = instruments.map(k => {
            const h = lastRatesHistory[k] || [];
            if (h.length < 3) return 0.3;
            // compute average absolute pct change across history
            let sum = 0; for (let i=1;i<h.length;i++) sum += Math.abs((h[i]-h[i-1])/h[i-1]||0); return sum/(h.length-1);
        });
        const avgVol = volSamples.reduce((a,b)=>a+b,0)/volSamples.length;
        // direction coherence: if instruments move same sign vs prev, boost confidence
        const dirs = instruments.map(k => Math.sign(lastRates[k] - (lastRatesPrev[k]||lastRates[k])));
        const coherence = Math.abs(dirs.reduce((a,b)=>a+b,0))/instruments.length; // 0..1
        // confidence inversely proportional to volatility, scaled by coherence
        let score = Math.max(5, Math.round(100 - Math.min(90, avgVol * 1000) + coherence * 20));
        score = Math.min(100, Math.max(0, score));
        const label = score > 75 ? 'High' : score > 45 ? 'Medium' : 'Low';
        if (get('marketConfidence')) get('marketConfidence').textContent = score + '%';
        if (get('marketConfidenceLabel')) get('marketConfidenceLabel').textContent = label;
    } catch (e) { console.warn('confidence calc', e); }

    // draw small charts and set news links
    try {
        drawMiniSpark('mr_eurusd', lastRatesHistory.EURUSD, '#6366F1');
        drawMiniSpark('mr_gbpusd', lastRatesHistory.GBPUSD, '#10B981');
        drawMiniSpark('mr_btcusd', lastRatesHistory.BTCUSD, '#F59E0B');
        // draw the main prediction chart
        try { drawMarketPredictionChart('mr_prediction'); } catch (e) { /* ignore */ }
        // draw the yearly/higher-res prediction chart (instrument + timeframe controlled by UI)
        try { const inst = get('mrInstrumentSelect')?.value || 'EURUSD'; const tf = Number(get('mrTimeframeSelect')?.value) || 365; drawYearlyPredictionChart('mr_yearly', inst, tf); } catch (e) { /* ignore */ }
        // news links to Google news search
        if (get('mr_news_eur')) get('mr_news_eur').href = `https://www.google.com/search?q=EUR+USD+news&tbm=nws`;
        if (get('mr_news_gbp')) get('mr_news_gbp').href = `https://www.google.com/search?q=GBP+USD+news&tbm=nws`;
        if (get('mr_news_btc')) get('mr_news_btc').href = `https://www.google.com/search?q=BTC+USD+news&tbm=nws`;
    } catch (e) { /* ignore drawing errors */ }
}

function drawMiniSpark(canvasId, data, color) {
    const c = get(canvasId);
    if (!c || !c.getContext) return;
    const ctx = c.getContext('2d'); const w = c.width; const h = c.height; ctx.clearRect(0,0,w,h);
    if (!data || data.length === 0) return;
    const max = Math.max(...data); const min = Math.min(...data);
    ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = color;
    data.forEach((v,i) => { const x = (i/(data.length-1||1)) * w; const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.stroke();
    // fill subtle gradient
    ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0, color + '22'); g.addColorStop(1, color + '00'); ctx.fillStyle = g; ctx.fill();
}

function exportCanvasPNG(canvasId, filename) {
    const c = get(canvasId); if (!c) return;
    const url = c.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = filename || (canvasId + '.png'); document.body.appendChild(a); a.click(); a.remove();
}

function exportMarketForecastCSV() {
    const inst = get('mfInstrument')?.value || 'EURUSD';
    const days = Number(get('mfTimeframe')?.value) || 365;
    const meta = drawYearlyPredictionChart('mr_forecast_chart', inst, days);
    if (!meta || !meta.series || !meta.dates) { showNotification('No forecast data available for CSV export'); return; }
    let rows = 'date,value,type\n';
    for (let i=0;i<meta.series.length;i++) {
        rows += `${meta.dates[i].toISOString().split('T')[0]},${meta.series[i].toFixed(6)},historical\n`;
    }
    for (let i=0;i<meta.preds.length;i++) {
        rows += `${meta.predDates[i].toISOString().split('T')[0]},${meta.preds[i].toFixed(6)},predicted\n`;
    }
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `market-forecast-${inst}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showNotification('CSV exported');
}

function drawMarketPredictionChart(canvasId) {
    const c = get(canvasId); if (!c || !c.getContext) return;
    const ctx = c.getContext('2d');
    // handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const cw = c.clientWidth; const ch = c.clientHeight;
    c.width = Math.floor(cw * dpr); c.height = Math.floor(ch * dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cw,ch);
    // build merged normalized series from available instruments
    const eur = (lastRatesHistory.EURUSD || []).slice();
    const gbp = (lastRatesHistory.GBPUSD || []).slice();
    const btc = (lastRatesHistory.BTCUSD || []).slice();
    const len = Math.max(eur.length, gbp.length, btc.length);
    if (len === 0) return;
    const baseE = eur[0] || eur[eur.length-1] || 1;
    const baseG = gbp[0] || gbp[gbp.length-1] || 1;
    const baseB = btc[0] || btc[btc.length-1] || 1;
    const series = [];
    for (let i=0;i<len;i++) {
        const e = eur[i] || eur[eur.length-1] || baseE;
        const g = gbp[i] || gbp[gbp.length-1] || baseG;
        const b = btc[i] || btc[btc.length-1] || baseB;
        const norm = ((e/baseE) + (g/baseG) + (b/baseB)) / 3;
        series.push(norm);
    }
    const max = Math.max(...series); const min = Math.min(...series);
    // draw grid & ticks
    ctx.strokeStyle = 'rgba(15,23,42,0.06)'; ctx.lineWidth = 1;
    const gridLines = 3;
    for (let i=0;i<=gridLines;i++) { const y = 6 + (i/gridLines)*(ch-12); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke(); }
    // draw line
    ctx.beginPath(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#4f46e5';
    series.forEach((v,i) => { const x = (i/(series.length-1||1)) * cw; const y = ch - ((v - min)/(max - min || 1))*(ch - 14) - 7; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.stroke();
    // fill gradient
    ctx.lineTo(cw, ch); ctx.lineTo(0,ch); ctx.closePath(); const grad = ctx.createLinearGradient(0,0,0,ch); grad.addColorStop(0,'rgba(79,70,229,0.12)'); grad.addColorStop(1,'rgba(79,70,229,0.02)'); ctx.fillStyle = grad; ctx.fill();
    // compute simple linear prediction (next 8 steps using last delta)
    const last = series[series.length-1]; const prev = series[series.length-2] || last; const delta = last - prev; const predSteps = Math.min(8, Math.max(4, Math.floor(series.length/6)));
    const preds = []; for (let s=1;s<=predSteps;s++) preds.push(last + delta * s);
    // draw predicted dashed line
    ctx.beginPath(); ctx.setLineDash([6,4]); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2;
    preds.forEach((v,i) => { const idx = series.length - 1 + (i+1); const x = (idx/(series.length -1 + preds.length)) * cw; const y = ch - ((v - min)/(max - min || 1))*(ch - 14) - 7; if (i===0) ctx.moveTo((series.length-1)/(series.length -1 + preds.length)*cw, ch - ((last - min)/(max - min || 1))*(ch - 14) - 7); ctx.lineTo(x,y); });
    ctx.stroke(); ctx.setLineDash([]);
    // annotate prediction area
    ctx.fillStyle = 'rgba(16,185,129,0.06)';
    const startX = (series.length-1)/(series.length -1 + preds.length)*cw; ctx.fillRect(startX, 0, cw - startX, ch);
    ctx.fillStyle = '#064e3b'; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.fillText('Prediction', cw - 70, 18);
    // add crosshair support and tooltip (re-using existing helper by using a unique tooltip id per canvas)
    const tooltipId = canvasId + '_tooltip';
    let tooltip = document.getElementById(tooltipId);
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.id = tooltipId; document.body.appendChild(tooltip); }
    const rect = c.getBoundingClientRect();
    const snapshot = ctx.getImageData(0,0,cw,ch);
    c.onmousemove = function(ev) {
        ctx.putImageData(snapshot,0,0);
        const mx = ev.clientX - rect.left; if (mx < 0 || mx > cw) { tooltip.style.display='none'; return; }
        const rel = mx / cw; const idx = Math.round(rel * (series.length - 1)); const val = series[idx];
        const x = (idx/(series.length - 1 || 1)) * cw; const y = ch - ((val - min)/(max - min || 1))*(ch - 14) - 7;
        ctx.beginPath(); ctx.strokeStyle = 'rgba(2,6,23,0.12)'; ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke();
        ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); ctx.strokeStyle = '#4f46e5'; ctx.stroke();
        tooltip.style.display = 'block'; tooltip.style.left = ev.clientX + 'px'; tooltip.style.top = (ev.clientY - 12) + 'px'; tooltip.innerHTML = `<div style="font-weight:700">${val.toFixed(4)}</div>`;
    };
    c.onmouseleave = function() { tooltip.style.display='none'; };
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

// Render a simple sparkline from recent debit transactions
function renderSpendingSparkline() {
    const canvas = get('spendSparkline');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cur = JSON.parse(localStorage.getItem('currentUser')) || null;
    const data = [];
    if (cur && Array.isArray(cur.transactions)) {
        // take last 20 debits
        const debits = cur.transactions.filter(t => t.type === 'debit').slice(-20);
        debits.forEach(d => data.push(Number(d.amount) || 0));
    }
    // if no data, generate a small placeholder trend
    if (data.length === 0) {
        for (let i = 0; i < 12; i++) data.push(Math.random() * 40);
    }

    // draw
    const w = canvas.width; const h = canvas.height; ctx.clearRect(0,0,w,h);
    // scale
    const max = Math.max(...data, 1);
    ctx.strokeStyle = 'rgba(99,102,241,0.95)'; ctx.lineWidth = 2; ctx.beginPath();
    data.forEach((v,i) => {
        const x = (i/(data.length-1||1)) * w;
        const y = h - (v / max) * (h - 4) - 2;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    // fill gradient
    const grad = ctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,'rgba(99,102,241,0.12)'); grad.addColorStop(1,'rgba(99,102,241,0)');
    ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
}

function startMarketLive(intervalMs = 5000) {
    if (marketLiveInterval) return;
    simulateMarketTick();
    marketLiveInterval = setInterval(simulateMarketTick, intervalMs);
    const btn = get('marketToggleBtn');
    if (btn) {
        btn.textContent = 'Stop Live'; btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', 'Stop live market updates');
    }
}

function stopMarketLive() {
    if (!marketLiveInterval) return;
    clearInterval(marketLiveInterval);
    marketLiveInterval = null;
    const btn = get('marketToggleBtn');
    if (btn) {
        btn.textContent = 'Start Live'; btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Start live market updates');
    }
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

    // Simulate admin toggle (for testing/admin simulator)
    const simChk = get('simulateAdminChk');
    if (simChk) {
        simChk.checked = !!cur.isAdmin;
        simChk.addEventListener('change', e => {
            cur.isAdmin = e.target.checked;
            localStorage.setItem('currentUser', JSON.stringify(cur));
            const users = JSON.parse(localStorage.getItem('users')) || {};
            if (cur.email) { users[cur.email] = cur; localStorage.setItem('users', JSON.stringify(users)); }
            updateUserHeaderAndMePage();
            showNotification(e.target.checked ? 'Admin tools enabled' : 'Admin tools disabled');
        });
    }
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

// --- Admin helpers ---
function renderAdminRequests() {
    const container = get('adminRequestsList');
    if (!container) return;
    container.innerHTML = '';
    const users = JSON.parse(localStorage.getItem('users')) || {};
    const rows = [];
    Object.values(users).forEach(u => {
        (u.limitRequests || []).forEach(r => rows.push({ user: u, req: r }));
    });
    if (!rows.length) { container.innerHTML = '<p style="color:#6b7280">No requests yet</p>'; return; }
    rows.sort((a,b) => new Date(b.req.createdAt) - new Date(a.req.createdAt));
    rows.forEach(({ user, req }) => {
        const div = document.createElement('div'); div.className = 'admin-request';
        let historyHtml = '';
        if (req.history && req.history.length) {
            historyHtml = '<div style="margin-top:8px;font-size:13px;color:#4b5563"><strong>History:</strong><ul style="margin:6px 0 0 16px">' + req.history.slice().reverse().map(h => `<li>${new Date(h.at).toLocaleString()} — <strong>${h.action}</strong> by ${h.by}${h.note ? ` — ${h.note}` : ''}</li>`).join('') + '</ul></div>';
        }
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong>${user.fullName || user.email}</strong>
                    <div class="meta">${new Date(req.createdAt).toLocaleString()}</div>
                    <div>Requested: Transfer $${Number(req.requestedTransfer).toLocaleString()} / Withdraw $${Number(req.requestedWithdraw).toLocaleString()}</div>
                </div>
                <div><span class="status">${req.status}</span></div>
            </div>
            <div style="margin-top:8px">${req.note ? `<div>${req.note}</div>` : ''}
                <div style="margin-top:8px">
                    <a href="${req.fileData}" target="_blank" class="btn btn-secondary" style="margin-right:8px">View ID</a>
                    <button class="btn btn-primary admin-approve" data-email="${user.email}" data-id="${req.id}">Approve</button>
                    <button class="btn btn-danger admin-deny" data-email="${user.email}" data-id="${req.id}" style="margin-left:8px">Deny</button>
                </div>
                ${historyHtml}
            </div>`;
        container.appendChild(div);
    });

    // wire buttons
    container.querySelectorAll('.admin-approve').forEach(b => b.addEventListener('click', e => {
        const email = b.dataset.email; const id = Number(b.dataset.id);
        openAdminDecisionModal(email, id, 'approve');
    }));
    container.querySelectorAll('.admin-deny').forEach(b => b.addEventListener('click', e => {
        const email = b.dataset.email; const id = Number(b.dataset.id);
        openAdminDecisionModal(email, id, 'deny');
    }));
}

function approveLimitRequest(email, id, note) {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    const user = users[email];
    if (!user) return showNotification('User not found', 'error');
    const req = (user.limitRequests || []).find(r => r.id === id);
    if (!req) return showNotification('Request not found', 'error');
    if (req.status === 'approved') return showNotification('Already approved');
    req.status = 'approved';
    req.approvedAt = new Date().toISOString();
    req.approvedBy = (JSON.parse(localStorage.getItem('currentUser')) || {}).email || 'admin';
    if (note) req.decisionNote = note;
    // add audit history
    req.history = req.history || [];
    req.history.push({ action: 'approved', by: req.approvedBy, at: req.approvedAt, note: note || '' });
    if (!user.preferences) user.preferences = {};
    user.preferences.dailyTransferLimit = req.requestedTransfer;
    user.preferences.dailyWithdrawalLimit = req.requestedWithdraw;
    users[email] = user;
    localStorage.setItem('users', JSON.stringify(users));
    // update currentUser if needed
    const cur = JSON.parse(localStorage.getItem('currentUser')) || {};
    if (cur.email === email) { cur.preferences = user.preferences; localStorage.setItem('currentUser', JSON.stringify(cur)); updateUserHeaderAndMePage(); }
    renderAdminRequests();
    showNotification('Request approved');
    sendEmailNotification(email, 'Limit Increase Approved', `Your request has been approved. New limits - Transfer: $${req.requestedTransfer}, Withdraw: $${req.requestedWithdraw}`);
}

function denyLimitRequest(email, id, note) {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    const user = users[email];
    if (!user) return showNotification('User not found', 'error');
    const req = (user.limitRequests || []).find(r => r.id === id);
    if (!req) return showNotification('Request not found', 'error');
    if (req.status === 'denied') return showNotification('Already denied');
    const reason = note || '';
    req.status = 'denied';
    req.deniedAt = new Date().toISOString();
    req.deniedBy = (JSON.parse(localStorage.getItem('currentUser')) || {}).email || 'admin';
    if (reason) req.decisionNote = reason;
    // add audit history
    req.history = req.history || [];
    req.history.push({ action: 'denied', by: req.deniedBy, at: req.deniedAt, note: reason });
    users[email] = user;
    localStorage.setItem('users', JSON.stringify(users));
    renderAdminRequests();
    showNotification('Request denied');
    sendEmailNotification(email, 'Limit Increase Denied', `Your request has been denied. ${reason}`);
}

// Ensure user-facing list also renders history for their requests
// (update the user's 'me' page rendering to display history entries)
const _origUpdateUserHeaderAndMePage = updateUserHeaderAndMePage;
function updateUserHeaderAndMePage() {
    _origUpdateUserHeaderAndMePage();
    const cur = JSON.parse(localStorage.getItem('currentUser')) || {};
    const list = get('meLimitRequestsList'); if (!list) return;
    const reqs = cur.limitRequests || [];
    list.innerHTML = '';
    if (!reqs.length) { list.innerHTML = '<p style="color:#6b7280">No limit requests yet</p>'; return; }
    reqs.slice().reverse().forEach(r => {
        const item = document.createElement('div'); item.className = 'limit-request';
        let hist = '';
        if (r.history && r.history.length) hist = '<div style="margin-top:6px;color:#4b5563">History:<ul style="margin:6px 0 0 16px">' + r.history.slice().reverse().map(h => `<li>${new Date(h.at).toLocaleString()} — <strong>${h.action}</strong> by ${h.by}${h.note ? ` — ${h.note}` : ''}</li>`).join('') + '</ul></div>';
        item.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>Requested:</strong> Transfer $${Number(r.requestedTransfer).toLocaleString()} / Withdraw $${Number(r.requestedWithdraw).toLocaleString()}</div><div class="meta">${new Date(r.createdAt).toLocaleString()}</div></div><div style="margin-top:6px">${r.note ? `<div>${r.note}</div>` : ''}${r.fileData ? `<div style="margin-top:8px"><a class="btn btn-secondary" href="${r.fileData}" target="_blank">View ID</a></div>` : ''}<div style="margin-top:8px;color:#374151">Status: <span class="status">${r.status}</span></div>${hist}</div>`;
        list.appendChild(item);
    });
}

// Draw a higher-resolution historical + predicted chart for an instrument
function drawYearlyPredictionChart(canvasId, instrument='EURUSD', days=365) {
    // ensure recalc on resize for responsiveness
    const el = get(canvasId); if (!el) return; const resizeKey = `${canvasId}_lastSize`; const rect0 = el.getBoundingClientRect(); if (window[resizeKey] && window[resizeKey].w === rect0.width && window[resizeKey].h === rect0.height) { /*size unchanged*/ } else { window[resizeKey] = { w: rect0.width, h: rect0.height }; }

    const c = get(canvasId); if (!c || !c.getContext) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cw = c.clientWidth; const ch = c.clientHeight;
    c.width = Math.floor(cw * dpr); c.height = Math.floor(ch * dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cw,ch);
    // Build daily series by expanding existing history or simulating a daily series
    const raw = (lastRatesHistory[instrument] || []);
    // If we don't have enough samples, synthesize a longer series by random-walking from lastRates
    const series = [];
    if (raw.length >= Math.min(40, Math.max(12, Math.floor(days/30)))) {
        // use raw recent history and upsample with small noise to reach 'days'
        const last = raw[raw.length-1];
        // fill backward by mirroring & adding noise
        for (let i=0;i<days;i++) {
            const idx = Math.floor((i/Math.max(1,days-1))*(raw.length-1));
            const v = raw[idx] * (1 + (Math.random()*0.01 - 0.005));
            series.push(v);
        }
    } else {
        // seed from lastRates and simulate daily random walk
        const base = lastRates[instrument] || 1;
        let cur = base;
        for (let i=0;i<days;i++) {
            const step = (Math.random()*0.012 - 0.006);
            cur = cur * (1 + step);
            series.push(cur);
        }
    }
    // Dates: attach approximate dates for 'days' back from today
    const now = Date.now(); const DAY = 24*60*60*1000;
    const dates = new Array(days).fill(0).map((_,i) => new Date(now - (days-1-i)*DAY));

    // Compute simple linear regression on series to obtain trend line and residuals
    function linearReg(y) {
        const n = y.length; if (n === 0) return { slope:0, intercept:0 };
        const xs = y.map((_,i) => i);
        const xMean = (n-1)/2; const yMean = y.reduce((a,b)=>a+b,0)/n;
        let num = 0, den = 0; for (let i=0;i<n;i++) { num += (xs[i]-xMean)*(y[i]-yMean); den += (xs[i]-xMean)*(xs[i]-xMean); }
        const slope = den===0?0:num/den; const intercept = yMean - slope*xMean; return { slope, intercept };
    }

    const lr = linearReg(series);
    const trend = series.map((v,i) => lr.intercept + lr.slope * i);
    // residuals stdev
    const residuals = series.map((v,i) => v - trend[i]);
    const meanRes = residuals.reduce((a,b)=>a+b,0)/residuals.length;
    const sq = residuals.reduce((a,b)=>a+(b-meanRes)*(b-meanRes),0); const stdev = Math.sqrt(sq/(residuals.length-1||1));

    // Predict next 30 days using linear extrapolation - use stdev for confidence band
    const predDays = Math.max(30, Math.min(90, Math.floor(days*0.08)));
    const preds = []; for (let i=1;i<=predDays;i++) {
        const x = series.length - 1 + i; const pv = lr.intercept + lr.slope * x; preds.push(pv);
    }

    // scale
    const allVals = series.concat(preds);
    const min = Math.min(...allVals); const max = Math.max(...allVals);

    // draw grid
    ctx.strokeStyle = 'rgba(15,23,42,0.06)'; ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i=0;i<=gridLines;i++) {
        const y = 8 + (i/gridLines)*(ch-16);
        ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(cw-8,y); ctx.stroke();
    }

    // axes labels (left)
    ctx.fillStyle = '#6b7280'; ctx.font = '12px Inter, system-ui, sans-serif';
    for (let i=0;i<=gridLines;i++) { const v = max - (i/gridLines)*(max-min); ctx.fillText(v.toFixed(4), 6, 10 + (i/gridLines)*(ch-16)); }

    // draw historical line
    ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.moveTo(40,0);
    series.forEach((v,i) => {
        const x = 40 + (i/(series.length - 1 || 1)) * (cw - 56);
        const y = 8 + (1 - (v - min) / (max - min || 1)) * (ch - 16);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // draw predicted dashed line
    ctx.beginPath(); ctx.setLineDash([6,4]); ctx.lineWidth = 2; ctx.strokeStyle = '#10b981';
    preds.forEach((v,i) => {
        const idx = series.length - 1 + (i+1);
        const x = 40 + (idx/(series.length - 1 + preds.length)) * (cw - 56);
        const y = 8 + (1 - (v - min) / (max - min || 1)) * (ch - 16);
        if (i===0) ctx.moveTo(40 + ((series.length - 1)/(series.length - 1 + preds.length)) * (cw - 56), 8 + (1 - (preds[0] - min) / (max - min || 1)) * (ch - 16));
        ctx.lineTo(x,y);
    });
    ctx.stroke(); ctx.setLineDash([]);

    // draw confidence band for predictions
    const bandStd = stdev;
    ctx.beginPath(); ctx.fillStyle = 'rgba(16,185,129,0.08)';
    preds.forEach((v,i) => {
        const idx = series.length - 1 + (i+1);
        const x = 40 + (idx/(series.length - 1 + preds.length)) * (cw - 56);
        const yTop = 8 + (1 - ((v + bandStd) - min) / (max - min || 1)) * (ch - 16);
        const yBottom = 8 + (1 - ((v - bandStd) - min) / (max - min || 1)) * (ch - 16);
        if (i===0) ctx.moveTo(x,yTop); else ctx.lineTo(x,yTop);
    });
    // connect back along bottom
    for (let i=preds.length-1;i>=0;i--) {
        const v = preds[i]; const idx = series.length - 1 + (i+1);
        const x = 40 + (idx/(series.length - 1 + preds.length)) * (cw - 56);
        const yBottom = 8 + (1 - ((v - bandStd) - min) / (max - min || 1)) * (ch - 16);
        ctx.lineTo(x,yBottom);
    }
    ctx.closePath(); ctx.fill();

    // legend
    ctx.fillStyle = '#111'; ctx.font = '13px Inter, system-ui, sans-serif'; ctx.fillText(`${instrument} — Past ${days}d and ${preds.length}d prediction`, 44, 18);

    // draw net flow (pill) showing percent change over the displayed series
    try {
        const baseVal = series[0] || 1; const lastVal = series[series.length-1] || baseVal; const netChange = ((lastVal - baseVal) / (baseVal || 1)) * 100;
        const netUp = netChange >= 0;
        const pillText = `${netUp?'+':''}${netChange.toFixed(2)}%`;
        const pillW = Math.max(80, ctx.measureText(pillText).width + 18);
        const pillH = 22; const pillX = cw - pillW - 12; const pillY = 8;
        ctx.beginPath(); ctx.fillStyle = netUp ? 'rgba(16,185,129,0.09)' : 'rgba(239,68,68,0.09)'; ctx.strokeStyle = netUp ? '#10b981' : '#ef4444';
        // rounded rect
        const r = 6; ctx.moveTo(pillX+r, pillY); ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, r); ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, r); ctx.arcTo(pillX, pillY + pillH, pillX, pillY, r); ctx.arcTo(pillX, pillY, pillX + pillW, pillY, r); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = netUp ? '#065f46' : '#7f1d1d'; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.fillText(pillText, pillX + 10, pillY + 15);
    } catch (e) { /* ignore drawing pill on errors */ }

    // X axis ticks (5 ticks)
    ctx.fillStyle = '#6b7280'; ctx.font = '11px Inter, system-ui, sans-serif';
    const ticks = 5; for (let i=0;i<ticks;i++) {
        const idx = Math.round(i * (series.length-1) / (ticks-1)); const dd = dates[idx];
        const tx = 40 + (idx/(series.length - 1 || 1)) * (cw - 56);
        const label = dd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        ctx.fillText(label, tx - 18, ch - 2);
    }

    // preserve base image for overlay redraws
    const snapshot = ctx.getImageData(0,0,cw,ch);

    // attach improved tooltip & crosshair (unique per canvas)
    const rect = c.getBoundingClientRect();
    const tooltipId = canvasId + '_tooltip';
    let tooltip = document.getElementById(tooltipId);
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.id = tooltipId; tooltip.style.minWidth = '120px'; document.body.appendChild(tooltip); }
    c.onmousemove = function(ev) {
        // restore base
        ctx.putImageData(snapshot, 0, 0);
        const mx = ev.clientX - rect.left; const my = ev.clientY - rect.top;
        if (mx < 40 || mx > cw-8) { tooltip.style.display = 'none'; return; }
        // map mx to index across series+preds
        const total = series.length + preds.length;
        const rel = (mx - 40) / (cw - 56); let idx = Math.round(rel * (total - 1)); idx = Math.max(0, Math.min(total - 1, idx));
        let val, d; let isPred = false;
        if (idx < series.length) { val = series[idx]; d = dates[idx]; }
        else { val = preds[idx - series.length]; d = new Date(now + (idx - series.length + 1)*DAY); isPred = true; }
        // draw crosshair
        const x = 40 + (idx/(total - 1 || 1)) * (cw - 56);
        const y = 8 + (1 - (val - min) / (max - min || 1)) * (ch - 16);
        ctx.beginPath(); ctx.strokeStyle = 'rgba(15,23,42,0.12)'; ctx.lineWidth = 1; ctx.moveTo(x,8); ctx.lineTo(x,ch-8); ctx.stroke();
        ctx.beginPath(); ctx.fillStyle = isPred ? '#10b981' : '#2563eb'; ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();

        // draw left-axis live readout (value + delta from previous point)
        try {
            const prevIdx = Math.max(0, idx - 1);
            let prevVal;
            if (idx <= series.length - 1) prevVal = series[prevIdx];
            else prevVal = (idx - series.length - 1 >= 0) ? preds[idx - series.length - 1] : series[series.length-1];
            prevVal = prevVal || val;
            const delta = val - prevVal; const deltaPct = (prevVal? (delta / prevVal) * 100 : 0);
            const up = delta >= 0;
            // badge
            const badgeX = 8; const badgeY = 8; const badgeH = 28; const badgeW = Math.max(110, ctx.measureText(val.toFixed(4)).width + 60);
            ctx.beginPath(); ctx.fillStyle = up ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'; ctx.strokeStyle = up ? '#10b981' : '#ef4444';
            const br = 6; ctx.moveTo(badgeX + br, badgeY); ctx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeH, br); ctx.arcTo(badgeX + badgeW, badgeY + badgeH, badgeX, badgeY + badgeH, br); ctx.arcTo(badgeX, badgeY + badgeH, badgeX, badgeY, br); ctx.arcTo(badgeX, badgeY, badgeX + badgeW, badgeY, br); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#072f2a'; ctx.font = '12px Inter, system-ui, sans-serif';
            const deltaSign = up? '+' : '';
            ctx.fillText(`${val.toFixed(4)}  (${deltaSign}${delta.toFixed(4)} | ${deltaSign}${deltaPct.toFixed(2)}%)`, badgeX + 10, badgeY + 18);
        } catch (e) { /* ignore badge errors */ }

        // format tooltip content
        const dateStr = d.toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric' });
        const valStr = val.toFixed(4);
        tooltip.style.display = 'block';
        // position tooltip near cursor but avoid going offscreen
        const left = Math.min(window.innerWidth - 120, Math.max(8, ev.clientX));
        tooltip.style.left = (left) + 'px'; tooltip.style.top = (ev.clientY - 10) + 'px';
        tooltip.innerHTML = `<div style="font-weight:700">${instrument} ${isPred?'<span style="color:#10b981">(pred)</span>':''}</div><div style="font-size:12px">${dateStr}</div><div style="margin-top:6px;font-weight:800">${valStr}</div>`;
    };
    c.onmouseleave = function() { const t = document.getElementById(tooltipId); if (t) t.style.display = 'none'; ctx.putImageData(snapshot,0,0); };

    // prepare predDates
    const predDates = new Array(preds.length).fill(0).map((_,i)=> new Date(now + (i+1)*DAY));

    // return helpful metadata including full series for export
    return { min, max, seriesLength: series.length, predLength: preds.length, dates, predDates, series, preds };

}