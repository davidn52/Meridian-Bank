/**
 * Meridian Bank - Clean Professional JavaScript
 * Mobile banking application with authentication,
 * transfers, and account management
 */

'use strict';

// =================== STATE & CONFIG ===================

const app = {
    currentUser: null,
    users: {},
    transactions: [],
};

const pageMap = new Map([
    ['welcome', 'welcomePage'],
    ['signup', 'signupPage'],
    ['login', 'loginPage'],
    ['forgotPassword', 'forgotPasswordPage'],
    ['dashboard', 'dashboardPage'],
    ['transfer', 'transferPage'],
    ['addFunds', 'addFundsPage'],
    ['settings', 'settingsPage'],
    ['transactionHistory', 'transactionHistoryPage'],
    ['forex', 'forexPage'],
    ['cardManagement', 'cardManagementPage'],
    ['investment', 'investmentPage'],
    ['loan', 'loanPage'],
    // placeholder page ids for nav entries (sections may be added later)
    ['accounts', 'accountsPage'],
    ['transactions', 'transactionHistoryPage'],
    ['transfers', 'transferPage'],
    ['payments', 'paymentsPage'],
    ['cards', 'cardManagementPage'],
    ['beneficiaries', 'beneficiariesPage'],
    ['statements', 'statementsPage'],
    ['notifications', 'notificationsPage'],
    ['messages', 'messagesPage'],
    ['securityCenter', 'securityCenterPage'],
    ['documents', 'documentsPage'],
    ['profile', 'profilePage'],
    ['support', 'supportPage'],
    ['logout', 'logout'],
]);

// =================== HELPERS ===================

function $(id) {
    return document.getElementById(id);
}

function $$(selector) {
    return document.querySelector(selector);
}

function showNotification(message, type = 'success') {
    const container = $('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function showPage(pageName) {
    const pageId = pageMap.get(pageName);
    if (!pageId) return console.warn(`Unknown page: ${pageName}`);

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show requested page
    const page = $(pageId);
    if (page) {
        page.classList.add('active');
    }

    // Close any open menus
    closeNavMenu();
}

function closeNavMenu() {
    const menu = $('navMenu');
    if (menu) menu.classList.remove('active');
}

function generateAccountNumber() {
    return 'ACC' + Math.random().toString().substr(2, 10);
}

function getCurrentUser() {
    const storage = localStorage.getItem('currentUser');
    return storage ? JSON.parse(storage) : null;
}

function saveCurrentUser(userData) {
    app.currentUser = userData;
    localStorage.setItem('currentUser', JSON.stringify(userData));
}

function loadUsers() {
    const storage = localStorage.getItem('users');
    app.users = storage ? JSON.parse(storage) : {};
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(app.users));
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

// =================== INITIALIZATION ===================

function initializeApp() {
    loadUsers();
    app.currentUser = getCurrentUser();

    if (app.currentUser) {
        showPage('dashboard');
        updateDashboard();
    } else {
        showPage('welcome');
    }

    attachEventListeners();
}

function updateDashboard() {
    if (!app.currentUser) return;

    const balance = $('dashboardBalance');
    const acctNum = $('dashboardAcctNum');

    if (balance) balance.textContent = `$${(app.currentUser.balance || 0).toFixed(2)}`;
    if (acctNum) acctNum.textContent = app.currentUser.accountNumber || '—';

    // linked accounts and currencies
    const linkedList = $('linkedAccountsList');
    if (linkedList) {
        linkedList.innerHTML = '';
        const linked = app.currentUser.linkedAccounts || ['Primary checking'];
        linked.forEach(a => {
            const li = document.createElement('li'); li.textContent = a;
            linkedList.appendChild(li);
        });
        if (linked.length === 0) linkedList.innerHTML = '<li>No linked accounts</li>';
    }
    const currencyList = $('currencyBalancesList');
    if (currencyList) {
        currencyList.innerHTML = '';
        const currs = app.currentUser.currencies || [];
        currs.forEach(c => {
            const li = document.createElement('li'); li.textContent = `${c.code} ${c.amount.toFixed(2)}`;
            currencyList.appendChild(li);
        });
        if (currs.length === 0) currencyList.innerHTML = '<li>No additional currencies</li>';
    }

    renderTransactions();
}

// filtering/history
function applyHistoryFilters() {
    const from = $('historyFromDate').value;
    const to = $('historyToDate').value;
    const min = parseFloat($('historyMinAmount').value) || 0;
    const max = parseFloat($('historyMaxAmount').value) || Infinity;
    const type = $('historyType').value;
    const list = $('historyTransactionsList');
    if (!list) return;

    let txs = (app.currentUser.transactions || []).slice();
    if (from) txs = txs.filter(t => new Date(t.date) >= new Date(from));
    if (to) txs = txs.filter(t => new Date(t.date) <= new Date(to));
    txs = txs.filter(t => t.amount >= min && t.amount <= max);
    if (type && type !== 'all') txs = txs.filter(t => t.type === type);

    if (!txs.length) {
        list.innerHTML = '<p class="empty-state">No transactions found</p>';
        return;
    }
    list.innerHTML = txs.map(t => `<div class="transaction-item"><div class="description">${t.description || ''}</div><div class="amount">${t.type==='sent'?'-':'+'}$${t.amount.toFixed(2)}</div><small>${new Date(t.date).toLocaleString()}</small></div>`).join('');
}

function downloadStatement() {
    const txs = (app.currentUser.transactions || []);
    if (!txs.length) return showNotification('No transactions to download', 'error');
    // generate CSV for simplicity
    let csv = 'date,type,amount,description\n';
    txs.forEach(t => {
        csv += `${t.date},${t.type},${t.amount},"${(t.description||'').replace(/"/g,'""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statement.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// forex
function performConversion() {
    const from = $('convertFrom').value.trim().toUpperCase();
    const to = $('convertTo').value.trim().toUpperCase();
    const amt = parseFloat($('convertAmount').value);
    if (!from || !to || !amt) return showNotification('Enter source, target and amount', 'error');
    const rate = getExchangeRate(from, to);
    if (!rate) return showNotification('Rate unavailable', 'error');
    const result = amt * rate;
    $('conversionResult').textContent = `${amt} ${from} = ${result.toFixed(2)} ${to} (rate ${rate.toFixed(4)})`;
}

function getExchangeRate(from, to) {
    // dummy static rates
    const rates = {
        'USD_EUR': 0.9,
        'EUR_USD': 1.1,
        'USD_GBP': 0.78,
        'GBP_USD': 1.28
    };
    return rates[`${from}_${to}`] || null;
}


function renderTransactions() {
    const list = $('recentTransactionsList');
    if (!list) return;

    const userTransactions = (app.currentUser.transactions || []).slice(-5).reverse();

    if (userTransactions.length === 0) {
        list.innerHTML = '<p class="empty-state">No transactions yet</p>';
        return;
    }

    list.innerHTML = userTransactions
        .map(t => `
            <div class="transaction-item">
                <div class="description">${t.description || 'Transfer'}</div>
                <div class="amount">${t.type === 'sent' ? '-' : '+'}$${t.amount.toFixed(2)}</div>
                <small>${new Date(t.date).toLocaleDateString()}</small>
            </div>
        `)
        .join('');
}

function updateSettings() {
    if (!app.currentUser) return;

    const email = $('settingEmail');
    const phone = $('settingPhone');

    if (email) email.textContent = app.currentUser.email || '—';
    if (phone) phone.textContent = app.currentUser.phone || '—';
}

// =================== AUTH HANDLERS ===================

function handleSignup(e) {
    e.preventDefault();

    const firstName = $('signupFirstName').value.trim();
    const lastName = $('signupLastName').value.trim();
    const email = $('signupEmail').value.trim();
    const password = $('signupPassword').value;
    const passwordConfirm = $('signupPasswordConfirm').value;

    // Validation
    if (!firstName || !lastName) {
        showNotification('Please enter your full name', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showNotification('Please enter a valid email', 'error');
        return;
    }

    if (!validatePassword(password)) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    if (app.users[email]) {
        showNotification('Email already registered', 'error');
        return;
    }

    // Create user
    const newUser = {
        email,
        firstName,
        lastName,
        password, // In production, NEVER store plaintext!
        phone: $('signupPhone').value.trim(),
        dateOfBirth: $('signupDob').value,
        address: $('signupAddress').value.trim(),
        city: $('signupCity').value.trim(),
        country: $('signupCountry').value.trim(),
        accountNumber: generateAccountNumber(),
        balance: 1000, // Starting balance
        transactions: [],
        // additional fields
        transactionPin: $('signupTransactionPin').value,
        securityQuestion: $('signupSecurityQuestion').value,
        securityAnswer: $('signupSecurityAnswer').value,
        kyc: {
            passportFile: $('signupPassportFile')?.files[0] ? URL.createObjectURL($('signupPassportFile').files[0]) : null,
            govIdFile: $('signupGovIdFile')?.files[0] ? URL.createObjectURL($('signupGovIdFile').files[0]) : null,
            proofAddressFile: $('signupProofAddressFile')?.files[0] ? URL.createObjectURL($('signupProofAddressFile').files[0]) : null,
        },
        financial: {
            employmentStatus: $('signupEmploymentStatus').value,
            sourceOfIncome: $('signupSourceIncome').value,
            annualIncome: $('signupAnnualIncome').value,
            accountPurpose: $('signupPurposeAccount').value,
        },
        tax: {
            residency: $('signupTaxResidency').value,
            fatca: $('signupFatca').checked,
            crsForm: $('signupCrsFormFile')?.files[0] ? URL.createObjectURL($('signupCrsFormFile').files[0]) : null,
            tin: $('signupTin').value,
        },
        emailVerified: false,
        createdAt: new Date().toISOString(),
    };

    app.users[email] = newUser;
    saveUsers();

    saveCurrentUser(newUser);
    showNotification('Account created successfully!', 'success');
    showPage('dashboard');
    updateDashboard();

    // Clear form
    $('signupForm').reset();
}

function handleLogin(e) {
    e.preventDefault();

    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;

    if (!validateEmail(email)) {
        showNotification('Please enter a valid email', 'error');
        return;
    }

    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }

    const user = app.users[email];

    if (!user || user.password !== password) {
        showNotification('Invalid email or password', 'error');
        return;
    }

    saveCurrentUser(user);
    showNotification('Logged in successfully!', 'success');
    showPage('dashboard');
    updateDashboard();

    $('loginForm').reset();
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    app.currentUser = null;
    showPage('welcome');
    showNotification('Logged out', 'success');
}

function handleForgotPassword(e) {
    e.preventDefault();

    const email = $('forgotEmail').value.trim();

    if (!validateEmail(email)) {
        showNotification('Please enter a valid email', 'error');
        return;
    }

    const user = app.users[email];

    if (!user) {
        // For security, don't reveal if email exists
        showNotification('If that email exists, we\'ll send a reset link', 'success');
        $('forgotPasswordForm').reset();
        setTimeout(() => showPage('login'), 2000);
        return;
    }

    // Simulate sending reset email
    showNotification('Reset link sent to your email!', 'success');
    $('forgotPasswordForm').reset();
    setTimeout(() => showPage('login'), 2000);
}

// =================== TRANSACTION HANDLERS ===================

function handleTransfer(e) {
    e.preventDefault();

    if (!app.currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }

    const recipient = $('transferRecipientName').value.trim();
    const amount = parseFloat($('transferAmount').value);

    if (!recipient) {
        showNotification('Please enter recipient name', 'error');
        return;
    }

    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    if (amount > app.currentUser.balance) {
        showNotification('Insufficient balance', 'error');
        return;
    }

    // Process transfer
    app.currentUser.balance -= amount;
    if (!app.currentUser.transactions) app.currentUser.transactions = [];
    app.currentUser.transactions.push({
        type: 'sent',
        amount,
        recipient,
        description: $('transferDescription').value || `Transfer to ${recipient}`,
        date: new Date().toISOString(),
    });

    saveCurrentUser(app.currentUser);
    saveUsers();

    showNotification('Transfer completed!', 'success');
    $('transferForm').reset();
    showPage('dashboard');
    updateDashboard();
}

function handleAddFunds(e) {
    e.preventDefault();

    if (!app.currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }

    const amount = parseFloat($('addFundsAmount').value);
    const method = $('addFundsMethod').value;

    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    if (!method) {
        showNotification('Please select a payment method', 'error');
        return;
    }

    // Process funds
    app.currentUser.balance += amount;
    if (!app.currentUser.transactions) app.currentUser.transactions = [];
    app.currentUser.transactions.push({
        type: 'received',
        amount,
        description: `Funds added via ${method}`,
        date: new Date().toISOString(),
    });

    saveCurrentUser(app.currentUser);
    saveUsers();

    showNotification('Funds added successfully!', 'success');
    $('addFundsForm').reset();
    showPage('dashboard');
    updateDashboard();
}

// =================== PASSWORD TOGGLE ===================

function attachPasswordToggle() {
    const btn = $('togglePasswordBtn');
    const input = $('loginPassword');

    if (btn && input) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.textContent = isPassword ? '🙈' : '👁';
        });
    }
}

// =================== NAV MENU ===================

function attachNavMenu() {
    const menuBtn = $('navMenuBtn');
    const menu = $('navMenu');
    const closeBtn = $('closeMenuBtn');

    if (menuBtn && menu) {
        menuBtn.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }

    if (closeBtn && menu) {
        closeBtn.addEventListener('click', () => {
            menu.classList.remove('active');
        });
    }

    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;

            if (page === 'logout') {
                handleLogout();
            } else if (page && pageMap.has(page)) {
                showPage(page);
            }

            closeNavMenu();
        });
    });
}

// =================== BACK BUTTONS ===================

function attachBackButtons() {
    const backButtons = [
        { id: 'backFromSignupBtn', page: 'welcome' },
        { id: 'backFromLoginBtn', page: 'welcome' },
        { id: 'backFromForgotBtn', page: 'login' },
        { id: 'backFromTransferBtn', page: 'dashboard' },
        { id: 'backFromAddFundsBtn', page: 'dashboard' },
        { id: 'backFromSettingsBtn', page: 'dashboard' },
        { id: 'backFromHistoryBtn', page: 'dashboard' },
        { id: 'backFromForexBtn', page: 'dashboard' },
        { id: 'backFromCardBtn', page: 'dashboard' },
        { id: 'backFromInvestmentBtn', page: 'dashboard' },
        { id: 'backFromLoanBtn', page: 'dashboard' },
    ];

    backButtons.forEach(({ id, page }) => {
        const btn = $(id);
        if (btn) {
            btn.addEventListener('click', () => showPage(page));
        }
    });
}

// =================== PAGE NAVIGATION LINKS ===================

function attachPageLinks() {
    const pageLinks = [
        { id: 'toSignupBtn', page: 'signup' },
        { id: 'toLoginBtn', page: 'login' },
        { id: 'signupToLoginLink', page: 'login' },
        { id: 'loginToSignupLink', page: 'signup' },
        { id: 'forgotPasswordLink', page: 'forgotPassword' },
        { id: 'resetToLoginLink', page: 'login' },
        { id: 'toTransferBtn', page: 'transfer' },
        { id: 'toAddFundsBtn', page: 'addFunds' },
        { id: 'toCardMgmtBtn', page: 'cardManagement' },
        { id: 'toInvestmentBtn', page: 'investment' },
        { id: 'toLoanBtn', page: 'loan' },
        { id: 'toForexBtn', page: 'forex' },
        { id: 'toHistoryBtn', page: 'transactionHistory' },
        { id: 'navMenuBtn', page: 'navMenu' },
        // nav menu items
        { id: 'navDashboard', page: 'dashboard' },
        { id: 'navAccounts', page: 'accounts' },
        { id: 'navTransactions', page: 'transactions' },
        { id: 'navTransfers', page: 'transfers' },
        { id: 'navPayments', page: 'payments' },
        { id: 'navCards', page: 'cards' },
        { id: 'navBeneficiaries', page: 'beneficiaries' },
        { id: 'navInvestments', page: 'investment' },
        { id: 'navForex', page: 'forex' },
        { id: 'navLoans', page: 'loan' },
        { id: 'navStatements', page: 'statements' },
        { id: 'navNotifications', page: 'notifications' },
        { id: 'navMessages', page: 'messages' },
        { id: 'navSecurity', page: 'securityCenter' },
        { id: 'navDocuments', page: 'documents' },
        { id: 'navProfile', page: 'profile' },
        { id: 'navSettings', page: 'settings' },
        { id: 'navSupport', page: 'support' },
        { id: 'navLogout', page: 'logout' },
    ];

    pageLinks.forEach(({ id, page }) => {
        const el = $(id);
        if (!el) return;
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (page === 'navMenu') return;
            if (page === 'logout') {
                if (typeof handleLogout === 'function') handleLogout();
                closeNavMenu();
                return;
            }
            if (pageMap.has(page)) showPage(page);
            closeNavMenu();
        });
    });
}

// =================== FORM HANDLERS ===================

function attachFormHandlers() {
    const signupForm = $('signupForm');
    const loginForm = $('loginForm');
    const transferForm = $('transferForm');
    const addFundsForm = $('addFundsForm');
    const forgotPasswordForm = $('forgotPasswordForm');
    const logoutBtn = $('logoutBtn');

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (transferForm) {
        transferForm.addEventListener('submit', handleTransfer);
    }

    if (addFundsForm) {
        addFundsForm.addEventListener('submit', handleAddFunds);
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// =================== SETTINGS PAGE ===================

function attachSettingsHandlers() {
    const twoFactorBtn = $('twoFactorToggle');
    const notificationBtn = $('notificationToggle');

    if (twoFactorBtn) {
        twoFactorBtn.addEventListener('change', () => {
            if (app.currentUser) {
                app.currentUser.twoFactor = twoFactorBtn.checked;
                saveCurrentUser(app.currentUser);
                showNotification('Settings saved', 'success');
            }
        });
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('change', () => {
            if (app.currentUser) {
                app.currentUser.notificationsEnabled = notificationBtn.checked;
                saveCurrentUser(app.currentUser);
                showNotification('Settings saved', 'success');
            }
        });
    }
}

// =================== MAIN EVENT ATTACHMENT ===================

function attachEventListeners() {
    try {
        attachFormHandlers();
        attachPasswordToggle();
        attachPageLinks();
        attachBackButtons();
        attachNavMenu();
        attachSettingsHandlers();
        // additional dashboard-specific controls
        const applyFiltersBtn = $('applyHistoryFilters');
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyHistoryFilters);

        const downloadStmtBtn = $('downloadStatement');
        if (downloadStmtBtn) downloadStmtBtn.addEventListener('click', downloadStatement);

        const convertBtn = $('performConversion');
        if (convertBtn) convertBtn.addEventListener('click', performConversion);
    } catch (e) {
        console.error('Error attaching listeners:', e);
    }
}

// =================== APP STARTUP ===================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
