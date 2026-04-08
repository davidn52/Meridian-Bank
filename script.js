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
    messages: {
        selectedCategory: 'all',
        selectedMessageId: null,
    },
    beneficiaries: {
        selectedBeneficiaryId: null,
    },
    support: {
        selectedFaqCategory: 'all',
        selectedChatMode: 'agent',
        selectedTicketId: null,
    },
};

const supportKnowledgeBase = [
    {
        id: 'faq-1',
        category: 'accounts',
        question: 'How do I check my available balance?',
        answer: 'Open the dashboard to view your checking available balance and savings balance. The Add Funds and Transfer pages also reflect the same live account balances.',
    },
    {
        id: 'faq-2',
        category: 'transfers',
        question: 'Why did my transfer fail?',
        answer: 'Transfers can fail if the selected source account does not have enough funds, the transaction PIN is incorrect, or the recipient details are incomplete.',
    },
    {
        id: 'faq-3',
        category: 'cards',
        question: 'How can I manage my card settings?',
        answer: 'Open the Cards page from the dashboard to review your card, adjust controls, and manage card-related actions.',
    },
    {
        id: 'faq-4',
        category: 'loans',
        question: 'Where can I see my loan status?',
        answer: 'Go to the Loans page to view application progress, repayment schedules, and current loan information.',
    },
    {
        id: 'faq-5',
        category: 'security',
        question: 'How do I improve account security?',
        answer: 'Use Settings to enable two-factor authentication, update your transaction PIN, review login alerts, and adjust privacy controls.',
    },
    {
        id: 'faq-6',
        category: 'transfers',
        question: 'Can I choose checking or savings for transfers?',
        answer: 'Yes. On the transfer page, use Select Source Account to choose either checking or savings before sending money.',
    },
];

const urlParams = new URLSearchParams(window.location.search);
const isLandingPreview = urlParams.get('preview') === 'landing';

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
    ['investFlow', 'investFlowPage'],
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

function roundCurrency(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function formatCurrency(value) {
    return `$${roundCurrency(value).toFixed(2)}`;
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

    if (app.currentUser) {
        refreshBalanceDisplays();
    }
    if (pageName === 'dashboard') updateDashboard();
    if (pageName === 'beneficiaries') updateBeneficiariesPage();
    if (pageName === 'messages') updateMessagesPage();
    if (pageName === 'settings') updateSettings();
    if (pageName === 'support') updateSupportPage();

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
    if (isLandingPreview) return null;
    const storage = localStorage.getItem('currentUser');
    return storage ? JSON.parse(storage) : null;
}

function saveCurrentUser(userData) {
    app.currentUser = userData;
    if (isLandingPreview) return;
    localStorage.setItem('currentUser', JSON.stringify(userData));
}

function loadUsers() {
    if (isLandingPreview) {
        app.users = {};
        return;
    }
    const storage = localStorage.getItem('users');
    app.users = storage ? JSON.parse(storage) : {};
}

function saveUsers() {
    if (isLandingPreview) return;
    localStorage.setItem('users', JSON.stringify(app.users));
}

function persistUserState(user = app.currentUser) {
    if (!user) return;
    syncUserFinancialState(user);
    if (user.email && app.users[user.email]) {
        app.users[user.email] = user;
    }
    saveCurrentUser(user);
    saveUsers();
}

function getLandingPreviewUser() {
    return {
        email: 'preview@meridianbank.com',
        firstName: 'Ava',
        lastName: 'Stone',
        phone: '+44 20 7946 0821',
        accountNumber: 'ACC4839201746',
        balance: 24850.75,
        checkingBalance: 18640.55,
        savingsBalance: 6210.20,
        linkedAccounts: ['Primary checking', 'USD investment wallet', 'Travel savings'],
        currencies: [
            { code: 'USD', amount: 24850.75 },
            { code: 'EUR', amount: 8240.40 },
            { code: 'GBP', amount: 3120.18 }
        ],
        transactions: [
            {
                type: 'received',
                amount: 4200.00,
                description: 'Salary deposit',
                date: '2026-03-24T09:00:00.000Z',
            },
            {
                type: 'sent',
                amount: 185.60,
                description: 'Utility payment',
                date: '2026-03-23T15:45:00.000Z',
            },
            {
                type: 'received',
                amount: 960.25,
                description: 'Investment dividend',
                date: '2026-03-22T12:10:00.000Z',
            },
            {
                type: 'sent',
                amount: 74.99,
                description: 'Streaming subscription',
                date: '2026-03-21T18:20:00.000Z',
            },
            {
                type: 'sent',
                amount: 520.00,
                description: 'Transfer to savings',
                date: '2026-03-20T08:35:00.000Z',
            },
        ],
    };
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
    app.currentUser = isLandingPreview ? getLandingPreviewUser() : getCurrentUser();

    if (app.currentUser) {
        syncUserFinancialState(app.currentUser);
        applyThemePreference(app.currentUser.theme || 'Light Mode');
        document.documentElement.lang = (app.currentUser.language || 'English').toLowerCase();
    } else {
        applyThemePreference('Light Mode');
        document.documentElement.lang = 'en';
    }

    if (app.currentUser) {
        showPage('dashboard');
        updateDashboard();
    } else {
        showPage('welcome');
    }

    attachEventListeners();
}

function getUserDisplayName(user) {
    if (!user) return 'Customer';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email || 'Customer';
}

function getAccountBalances(user) {
    const totalFromStoredBalance = typeof user?.balance === 'number' ? user.balance : 0;
    const hasChecking = typeof user?.checkingBalance === 'number';
    const hasSavings = typeof user?.savingsBalance === 'number';
    const checkingBalance = hasChecking
        ? user.checkingBalance
        : (hasSavings ? totalFromStoredBalance - user.savingsBalance : totalFromStoredBalance / 2);
    const savingsBalance = hasSavings
        ? user.savingsBalance
        : (hasChecking ? totalFromStoredBalance - user.checkingBalance : totalFromStoredBalance / 2);
    return {
        checkingBalance,
        savingsBalance,
        totalBalance: checkingBalance + savingsBalance,
    };
}

function syncUserFinancialState(user) {
    if (!user) return null;

    const { checkingBalance, savingsBalance, totalBalance } = getAccountBalances(user);
    user.checkingBalance = roundCurrency(checkingBalance);
    user.savingsBalance = roundCurrency(savingsBalance);
    user.balance = roundCurrency(totalBalance);

    const existingAccounts = Array.isArray(user.accounts) ? [...user.accounts] : [];
    const nonPrimaryAccounts = existingAccounts.filter(account => !['checking', 'savings'].includes(account?.id));

    user.accounts = [
        {
            id: 'checking',
            name: 'Checking Account',
            balance: user.checkingBalance,
            currency: 'USD',
        },
        {
            id: 'savings',
            name: 'Savings Account',
            balance: user.savingsBalance,
            currency: 'USD',
        },
        ...nonPrimaryAccounts,
    ];

    return user;
}

function getPrimaryAccounts(user) {
    const syncedUser = syncUserFinancialState(user);
    return syncedUser ? syncedUser.accounts.slice(0, 2) : [];
}

function updateAddFundsAccountDetails() {
    const targetAccount = $('addFundsTargetAccount');
    const selectedBalance = $('addFundsSelectedBalance');
    if (!targetAccount || !selectedBalance || !app.currentUser) return;

    const accountKey = targetAccount.value || 'checking';
    const amount = accountKey === 'savings' ? app.currentUser.savingsBalance : app.currentUser.checkingBalance;
    selectedBalance.textContent = formatCurrency(amount);
}

function updateTransferAccountOptions() {
    const senderSelect = $('senderAccount');
    if (!senderSelect || !app.currentUser) return;

    const selectedValue = senderSelect.value;
    const accounts = getPrimaryAccounts(app.currentUser);
    senderSelect.innerHTML = '<option value="">-- Choose --</option>';

    accounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = `${account.name} (${formatCurrency(account.balance)})`;
        senderSelect.appendChild(option);
    });

    const restoredValue = accounts.some(account => account.id === selectedValue)
        ? selectedValue
        : accounts[0]?.id || '';
    senderSelect.value = restoredValue;

    if (typeof updateSenderDetails === 'function') {
        updateSenderDetails();
    }
}

function updateInvestmentBalanceDisplays() {
    if (!app.currentUser) return;

    const investmentAvailableBalance = $('investmentAvailableBalance');
    if (investmentAvailableBalance) {
        investmentAvailableBalance.textContent = `${formatCurrency(app.currentUser.checkingBalance)} available`;
    }

    const investFundingAccount = $('investFundingAccount');
    if (investFundingAccount) {
        const selectedValue = investFundingAccount.value;
        const accounts = getPrimaryAccounts(app.currentUser);
        investFundingAccount.innerHTML = '';

        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.name} - ${formatCurrency(account.balance)}`;
            investFundingAccount.appendChild(option);
        });

        if (accounts.some(account => account.id === selectedValue)) {
            investFundingAccount.value = selectedValue;
        }
    }
}

function refreshBalanceDisplays() {
    if (!app.currentUser) return;
    syncUserFinancialState(app.currentUser);
    updateAddFundsAccountDetails();
    updateTransferAccountOptions();
    updateInvestmentBalanceDisplays();
}

function maskAccountNumber(value = '') {
    const raw = String(value);
    if (raw.length <= 4) return raw;
    return `****${raw.slice(-4)}`;
}

function getCountryFlag(countryCode = '') {
    const flags = {
        US: '🇺🇸',
        DE: '🇩🇪',
        FR: '🇫🇷',
        GB: '🇬🇧',
        IT: '🇮🇹',
        ES: '🇪🇸',
        NL: '🇳🇱',
        BE: '🇧🇪',
        AT: '🇦🇹',
        CH: '🇨🇭',
    };
    return flags[countryCode] || '🌍';
}

function ensureBeneficiaryState() {
    if (!app.currentUser) return;
    if (!Array.isArray(app.currentUser.beneficiaries) || !app.currentUser.beneficiaries.length) {
        app.currentUser.beneficiaries = [
            {
                id: 'BEN-001',
                name: 'Sophie Martin',
                bankName: 'BNP Paribas',
                accountNumber: 'FR7630004000031234567890143',
                swiftCode: 'BNPAFRPP',
                bankAddress: '16 Boulevard des Italiens, Paris',
                country: 'FR',
                tag: 'favorite',
                lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            },
            {
                id: 'BEN-002',
                name: 'Lukas Weber',
                bankName: 'Deutsche Bank',
                accountNumber: 'DE89370400440532013000',
                swiftCode: 'DEUTDEDD',
                bankAddress: 'Taunusanlage 12, Frankfurt',
                country: 'DE',
                tag: 'recent',
                lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            },
        ];
    }
}

function populateSavedBeneficiariesSelect() {
    const select = $('savedBeneficiarySelect');
    if (!select || !app.currentUser) return;

    ensureBeneficiaryState();
    const beneficiaries = app.currentUser.beneficiaries || [];
    select.innerHTML = '<option value="">-- Select Beneficiary --</option>';

    beneficiaries.forEach((beneficiary) => {
        const option = document.createElement('option');
        option.value = beneficiary.id;
        option.textContent = `${beneficiary.name} - ${beneficiary.bankName} (${maskAccountNumber(beneficiary.accountNumber)})`;
        select.appendChild(option);
    });
}

function applyBeneficiaryToTransferForm(beneficiaryId) {
    if (!app.currentUser) return;
    ensureBeneficiaryState();
    const beneficiary = (app.currentUser.beneficiaries || []).find((item) => item.id === beneficiaryId);
    if (!beneficiary) return;

    const recipientName = $('recipientName');
    const recipientBankName = $('recipientBankName');
    const recipientAccountNumber = $('recipientAccountNumber');
    const recipientSwiftCode = $('recipientSwiftCode');
    const recipientBankAddress = $('recipientBankAddress');
    const recipientCountry = $('recipientCountry');

    if (recipientName) recipientName.value = beneficiary.name || '';
    if (recipientAccountNumber) recipientAccountNumber.value = beneficiary.accountNumber || '';
    if (recipientSwiftCode) recipientSwiftCode.value = beneficiary.swiftCode || '';
    if (recipientBankAddress) recipientBankAddress.value = beneficiary.bankAddress || '';
    if (recipientCountry) recipientCountry.value = beneficiary.country || '';

    if (recipientBankName) {
        const existingOption = Array.from(recipientBankName.options).find((option) =>
            option.textContent.toLowerCase().includes((beneficiary.bankName || '').toLowerCase())
        );
        if (existingOption) {
            recipientBankName.value = existingOption.value;
        } else {
            const option = document.createElement('option');
            option.value = beneficiary.swiftCode || beneficiary.bankName || beneficiary.id;
            option.textContent = beneficiary.bankName || 'Saved Bank';
            recipientBankName.appendChild(option);
            recipientBankName.value = option.value;
        }
    }
}

function renderBeneficiariesList() {
    const list = $('beneficiariesList');
    if (!list || !app.currentUser) return;

    ensureBeneficiaryState();
    const beneficiaries = (app.currentUser.beneficiaries || []).slice().sort((a, b) => new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0));

    if (!beneficiaries.length) {
        list.innerHTML = '<p class="empty-state">No saved beneficiaries yet.</p>';
        return;
    }

    list.innerHTML = beneficiaries.map((beneficiary) => `
        <article class="beneficiary-list-item ${app.beneficiaries.selectedBeneficiaryId === beneficiary.id ? 'active' : ''}" data-beneficiary-id="${beneficiary.id}">
            <div class="beneficiary-list-top">
                <strong>${beneficiary.name}</strong>
                <span class="beneficiary-tag ${beneficiary.tag}">${beneficiary.tag}</span>
            </div>
            <p>${beneficiary.bankName}</p>
            <div class="beneficiary-meta-row">
                <span>${getCountryFlag(beneficiary.country)} ${beneficiary.country}</span>
                <span>${maskAccountNumber(beneficiary.accountNumber)}</span>
            </div>
        </article>
    `).join('');

    list.querySelectorAll('[data-beneficiary-id]').forEach((item) => {
        item.addEventListener('click', () => openBeneficiaryDetail(item.getAttribute('data-beneficiary-id')));
    });
}

function renderBeneficiaryDetail() {
    const detail = $('beneficiaryDetailView');
    if (!detail || !app.currentUser) return;

    ensureBeneficiaryState();
    const beneficiary = (app.currentUser.beneficiaries || []).find((item) => item.id === app.beneficiaries.selectedBeneficiaryId);
    if (!beneficiary) {
        detail.innerHTML = '<p class="empty-state">Select a beneficiary to view details.</p>';
        return;
    }

    const transferHistory = (app.currentUser.transactions || []).filter((transaction) =>
        (transaction.recipient || '').toLowerCase() === (beneficiary.name || '').toLowerCase()
    );

    detail.innerHTML = `
        <div class="beneficiary-detail-head">
            <div>
                <p class="beneficiaries-eyebrow">${getCountryFlag(beneficiary.country)} ${beneficiary.country}</p>
                <h3>${beneficiary.name}</h3>
                <small>${beneficiary.bankName}</small>
            </div>
            <button id="beneficiaryUseForTransferBtn" class="btn btn-primary" type="button">Use for Transfer</button>
        </div>
        <div class="beneficiary-detail-grid">
            <div class="beneficiary-detail-item"><span>Account Number</span><strong>${beneficiary.accountNumber}</strong></div>
            <div class="beneficiary-detail-item"><span>SWIFT / BIC</span><strong>${beneficiary.swiftCode || '-'}</strong></div>
            <div class="beneficiary-detail-item"><span>Bank Address</span><strong>${beneficiary.bankAddress || '-'}</strong></div>
            <div class="beneficiary-detail-item"><span>Tag</span><strong>${beneficiary.tag}</strong></div>
        </div>
        <div class="beneficiary-actions">
            <button id="editBeneficiaryBtn" class="btn btn-secondary" type="button">Edit Beneficiary</button>
            <button id="deleteBeneficiaryBtn" class="btn btn-danger" type="button">Delete Beneficiary</button>
        </div>
        <div class="beneficiary-history-block">
            <h4>Transfer History with this Beneficiary</h4>
            <div class="beneficiary-history-list">
                ${transferHistory.length
                    ? transferHistory.slice().reverse().map((transaction) => `
                        <div class="transaction-item">
                            <div class="description">${transaction.description || 'Transfer'}</div>
                            <div class="amount">-${formatCurrency(transaction.amount).replace('$', '')}</div>
                            <small>${new Date(transaction.date).toLocaleString()}</small>
                        </div>
                    `).join('')
                    : '<p class="empty-state">No transfers with this beneficiary yet.</p>'}
            </div>
        </div>
    `;

    $('beneficiaryUseForTransferBtn')?.addEventListener('click', () => {
        showPage('transfer');
        const savedToggle = $('useSavedBeneficiary');
        const savedSelect = $('savedBeneficiarySelect');
        if (savedToggle) {
            savedToggle.checked = true;
            savedToggle.dispatchEvent(new Event('change'));
        }
        populateSavedBeneficiariesSelect();
        if (savedSelect) {
            savedSelect.value = beneficiary.id;
            savedSelect.dispatchEvent(new Event('change'));
        }
    });

    $('editBeneficiaryBtn')?.addEventListener('click', () => openBeneficiaryForm(beneficiary.id));
    $('deleteBeneficiaryBtn')?.addEventListener('click', () => deleteBeneficiary(beneficiary.id));
}

function openBeneficiaryDetail(beneficiaryId) {
    app.beneficiaries.selectedBeneficiaryId = beneficiaryId;
    renderBeneficiariesList();
    renderBeneficiaryDetail();
}

function updateBeneficiariesPage() {
    if (!app.currentUser) return;
    ensureBeneficiaryState();
    populateSavedBeneficiariesSelect();

    if (!app.beneficiaries.selectedBeneficiaryId) {
        app.beneficiaries.selectedBeneficiaryId = app.currentUser.beneficiaries?.[0]?.id || null;
    }

    renderBeneficiariesList();
    renderBeneficiaryDetail();
}

function openBeneficiaryForm(beneficiaryId = '') {
    const panel = $('beneficiaryFormPanel');
    const title = $('beneficiaryFormTitle');
    const editId = $('beneficiaryEditId');
    const form = $('beneficiaryForm');
    if (!panel || !title || !editId || !form || !app.currentUser) return;

    ensureBeneficiaryState();
    form.reset();
    panel.hidden = false;

    if (!beneficiaryId) {
        title.textContent = 'Save Recipient';
        editId.value = '';
        $('beneficiaryFavorite').value = 'recent';
        return;
    }

    const beneficiary = (app.currentUser.beneficiaries || []).find((item) => item.id === beneficiaryId);
    if (!beneficiary) return;

    title.textContent = 'Edit Beneficiary';
    editId.value = beneficiary.id;
    $('beneficiaryRecipientName').value = beneficiary.name || '';
    $('beneficiaryBankName').value = beneficiary.bankName || '';
    $('beneficiaryAccountNumber').value = beneficiary.accountNumber || '';
    $('beneficiarySwiftCode').value = beneficiary.swiftCode || '';
    $('beneficiaryBankAddress').value = beneficiary.bankAddress || '';
    $('beneficiaryCountry').value = beneficiary.country || 'US';
    $('beneficiaryFavorite').value = beneficiary.tag || 'recent';
}

function saveBeneficiaryRecord(data) {
    if (!app.currentUser) return null;
    ensureBeneficiaryState();

    const editIndex = (app.currentUser.beneficiaries || []).findIndex((item) => item.id === data.id);
    const beneficiary = {
        id: data.id || `BEN-${String(app.currentUser.beneficiaries.length + 1).padStart(3, '0')}`,
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        swiftCode: data.swiftCode,
        bankAddress: data.bankAddress,
        country: data.country,
        tag: data.tag,
        lastUsedAt: data.lastUsedAt || new Date().toISOString(),
    };

    if (editIndex >= 0) {
        app.currentUser.beneficiaries[editIndex] = beneficiary;
    } else {
        app.currentUser.beneficiaries.unshift(beneficiary);
    }

    persistUserState(app.currentUser);
    populateSavedBeneficiariesSelect();
    app.beneficiaries.selectedBeneficiaryId = beneficiary.id;
    updateBeneficiariesPage();
    return beneficiary;
}

function deleteBeneficiary(beneficiaryId) {
    if (!app.currentUser) return;
    ensureBeneficiaryState();
    app.currentUser.beneficiaries = (app.currentUser.beneficiaries || []).filter((item) => item.id !== beneficiaryId);
    if (app.beneficiaries.selectedBeneficiaryId === beneficiaryId) {
        app.beneficiaries.selectedBeneficiaryId = app.currentUser.beneficiaries?.[0]?.id || null;
    }
    persistUserState(app.currentUser);
    populateSavedBeneficiariesSelect();
    updateBeneficiariesPage();
    showNotification('Beneficiary deleted', 'success');
}

function ensureMessageState() {
    if (!app.currentUser) return;
    if (!Array.isArray(app.currentUser.messages) || !app.currentUser.messages.length) {
        app.currentUser.messages = [
            {
                id: 'MSG-001',
                sender: 'Bank',
                category: 'transactions',
                subject: 'Deposit received successfully',
                preview: 'Your recent deposit has been posted to your checking account.',
                content: 'Your recent deposit has been posted to your checking account and is now reflected in your available balance. You can review the updated balance from the dashboard.',
                timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
                read: false,
                attachments: ['Deposit-Receipt.pdf'],
                links: ['View transaction'],
            },
            {
                id: 'MSG-002',
                sender: 'System',
                category: 'security',
                subject: 'Security alert: new sign-in detected',
                preview: 'A sign-in to your account was detected from a new device.',
                content: 'A sign-in to your account was detected from a new device. If this was you, no further action is needed. If not, change your password and transaction PIN immediately.',
                timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
                read: true,
                attachments: [],
                links: ['Open Security Settings'],
            },
            {
                id: 'MSG-003',
                sender: 'Support',
                category: 'support',
                subject: 'Update on your support request',
                preview: 'Your recent support request is now being reviewed by an agent.',
                content: 'Your recent support request is now being reviewed by an agent. You can continue the conversation from Support / Help or reply directly from your ticket history.',
                timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
                read: false,
                attachments: ['Case-Summary.pdf'],
                links: ['Open Support Center'],
            },
            {
                id: 'MSG-004',
                sender: 'Bank',
                category: 'promotions',
                subject: 'Exclusive offer on fixed deposits',
                preview: 'Explore this month’s featured savings and fixed deposit offers.',
                content: 'Explore this month’s featured savings and fixed deposit offers tailored for offshore customers. Visit Investments for more information and current opportunities.',
                timestamp: new Date(Date.now() - 1000 * 60 * 860).toISOString(),
                read: true,
                attachments: ['Offer-Brochure.pdf'],
                links: ['View investment options'],
            },
        ];
    }
}

function renderMessagesList() {
    const list = $('messagesList');
    if (!list || !app.currentUser) return;

    ensureMessageState();
    const selectedCategory = app.messages.selectedCategory || 'all';
    const messages = (app.currentUser.messages || []).filter((message) =>
        selectedCategory === 'all' || message.category === selectedCategory
    );

    if (!messages.length) {
        list.innerHTML = '<p class="empty-state">No messages in this category yet.</p>';
        return;
    }

    list.innerHTML = messages
        .slice()
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map((message) => `
            <article class="message-list-item ${message.read ? 'read' : 'unread'} ${app.messages.selectedMessageId === message.id ? 'active' : ''}" data-message-id="${message.id}">
                <div class="message-item-top">
                    <span class="message-sender">${message.sender}</span>
                    <time>${new Date(message.timestamp).toLocaleString()}</time>
                </div>
                <strong>${message.subject}</strong>
                <p>${message.preview}</p>
                <div class="message-item-status">
                    <span class="message-category-pill">${message.category}</span>
                    <span class="message-read-indicator">${message.read ? 'Read' : 'Unread'}</span>
                </div>
            </article>
        `).join('');

    list.querySelectorAll('[data-message-id]').forEach((item) => {
        item.addEventListener('click', () => openMessageDetail(item.getAttribute('data-message-id')));
    });
}

function renderMessageDetail() {
    const detail = $('messageDetailView');
    if (!detail || !app.currentUser) return;

    ensureMessageState();
    const message = (app.currentUser.messages || []).find((item) => item.id === app.messages.selectedMessageId);
    if (!message) {
        detail.innerHTML = '<p class="empty-state">Select a message to view details.</p>';
        return;
    }

    detail.innerHTML = `
        <div class="message-detail-head">
            <div>
                <p class="messages-eyebrow">${message.sender}</p>
                <h3>${message.subject}</h3>
                <small>${new Date(message.timestamp).toLocaleString()}</small>
            </div>
            <button id="toggleMessageReadBtn" class="btn btn-secondary" type="button">${message.read ? 'Mark as Unread' : 'Mark as Read'}</button>
        </div>
        <p class="message-detail-content">${message.content}</p>
        <div class="message-detail-meta">
            <div>
                <h4>Attachments</h4>
                <div class="message-link-list">
                    ${(message.attachments || []).length
                        ? message.attachments.map((attachment) => `<button type="button" class="message-link-btn" data-link-label="${attachment}">${attachment}</button>`).join('')
                        : '<span>No attachments</span>'}
                </div>
            </div>
            <div>
                <h4>Links</h4>
                <div class="message-link-list">
                    ${(message.links || []).length
                        ? message.links.map((link) => `<button type="button" class="message-link-btn" data-link-label="${link}">${link}</button>`).join('')
                        : '<span>No links</span>'}
                </div>
            </div>
        </div>
    `;

    const toggleBtn = $('toggleMessageReadBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            message.read = !message.read;
            persistUserState(app.currentUser);
            renderMessagesList();
            renderMessageDetail();
        });
    }

    detail.querySelectorAll('.message-link-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const label = button.getAttribute('data-link-label') || '';
            if (label.toLowerCase().includes('transaction')) {
                showPage('transactionHistory');
                return;
            }
            showNotification(`${label} opened`, 'success');
        });
    });
}

function openMessageDetail(messageId) {
    if (!app.currentUser) return;
    ensureMessageState();
    const message = (app.currentUser.messages || []).find((item) => item.id === messageId);
    if (!message) return;

    app.messages.selectedMessageId = messageId;
    message.read = true;
    persistUserState(app.currentUser);
    renderMessagesList();
    renderMessageDetail();
}

function updateMessagesPage() {
    if (!app.currentUser) return;
    ensureMessageState();

    if (!app.messages.selectedMessageId) {
        const firstMessage = (app.currentUser.messages || [])[0];
        if (firstMessage) app.messages.selectedMessageId = firstMessage.id;
    }

    renderMessagesList();
    renderMessageDetail();
}

function ensureSupportState() {
    if (!app.currentUser) return;
    if (!Array.isArray(app.currentUser.supportTickets)) {
        app.currentUser.supportTickets = [
            {
                id: `TKT-${new Date().getFullYear()}-001`,
                subject: 'Transfer review request',
                category: 'Transfers',
                message: 'Please confirm why my international transfer is still pending.',
                status: 'In Progress',
                createdAt: new Date().toISOString(),
                replies: ['Support is reviewing your transfer details and will update you shortly.'],
            },
        ];
    }
    if (!Array.isArray(app.currentUser.supportChatHistory)) {
        app.currentUser.supportChatHistory = [
            {
                sender: 'support',
                mode: 'agent',
                message: 'Welcome to Meridian Support. How can we help you today?',
                createdAt: new Date().toISOString(),
            },
        ];
    }
}

function renderSupportFaqs() {
    const list = $('supportFaqList');
    const searchInput = $('supportSearchInput');
    if (!list) return;

    const term = (searchInput?.value || '').trim().toLowerCase();
    const selectedCategory = app.support.selectedFaqCategory || 'all';
    const filteredItems = supportKnowledgeBase.filter((item) => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesSearch = !term
            || item.question.toLowerCase().includes(term)
            || item.answer.toLowerCase().includes(term)
            || item.category.toLowerCase().includes(term);
        return matchesCategory && matchesSearch;
    });

    if (!filteredItems.length) {
        list.innerHTML = '<p class="empty-state">No help articles matched your search.</p>';
        return;
    }

    list.innerHTML = filteredItems.map((item) => `
        <article class="support-faq-item">
            <button type="button" class="support-faq-question" data-faq-id="${item.id}">
                <strong>${item.question}</strong>
                <span>${item.category}</span>
            </button>
            <p class="support-faq-answer">${item.answer}</p>
        </article>
    `).join('');
}

function renderSupportChat() {
    const history = $('supportChatHistory');
    const typingIndicator = $('supportTypingIndicator');
    if (!app.currentUser) return;

    ensureSupportState();
    const historyMarkup = (app.currentUser.supportChatHistory || []).map((entry) => `
        <div class="support-chat-bubble ${entry.sender === 'user' ? 'user' : 'support'}">
            <strong>${entry.sender === 'user' ? 'You' : (entry.mode === 'bot' ? 'AI Assistant' : 'Support Agent')}</strong>
            <p>${entry.message}</p>
        </div>
    `).join('');

    if (history) {
        history.innerHTML = historyMarkup;
        history.scrollTop = history.scrollHeight;
    }

    const miniHistory = $('dashboardSupportMiniHistory');
    if (miniHistory) {
        miniHistory.innerHTML = historyMarkup;
        miniHistory.scrollTop = miniHistory.scrollHeight;
    }

    if (typingIndicator) typingIndicator.hidden = true;
    const miniTypingIndicator = $('dashboardSupportMiniTyping');
    if (miniTypingIndicator) miniTypingIndicator.hidden = true;
}

function renderSupportTickets() {
    const list = $('supportTicketList');
    const openTicketCount = $('supportOpenTicketCount');
    if (!list || !app.currentUser) return;

    ensureSupportState();
    const tickets = app.currentUser.supportTickets || [];
    const openCount = tickets.filter((ticket) => ticket.status !== 'Resolved').length;
    if (openTicketCount) openTicketCount.textContent = String(openCount);

    if (!tickets.length) {
        list.innerHTML = '<p class="empty-state">No support tickets yet.</p>';
        return;
    }

    list.innerHTML = tickets.slice().reverse().map((ticket) => `
        <article class="support-ticket-item ${app.support.selectedTicketId === ticket.id ? 'selected' : ''}" data-ticket-id="${ticket.id}">
            <div class="support-ticket-head">
                <strong>${ticket.subject}</strong>
                <span class="support-ticket-status status-${ticket.status.toLowerCase().replace(/\s+/g, '-')}">${ticket.status}</span>
            </div>
            <p>${ticket.category}</p>
            <small>${new Date(ticket.createdAt).toLocaleString()}</small>
            <div class="support-ticket-replies">${(ticket.replies || []).slice(-1)[0] || ticket.message}</div>
        </article>
    `).join('');

    list.querySelectorAll('[data-ticket-id]').forEach((item) => {
        item.addEventListener('click', () => {
            app.support.selectedTicketId = item.getAttribute('data-ticket-id');
            renderSupportTickets();
        });
    });
}

function updateSupportPage() {
    if (!app.currentUser) return;
    ensureSupportState();
    renderSupportFaqs();
    renderSupportChat();
    renderSupportTickets();
    setSupportMode(app.support.selectedChatMode || 'agent');
}

function setSupportTypingState(isTyping) {
    const typingIndicator = $('supportTypingIndicator');
    const miniTypingIndicator = $('dashboardSupportMiniTyping');
    if (typingIndicator) typingIndicator.hidden = !isTyping;
    if (miniTypingIndicator) miniTypingIndicator.hidden = !isTyping;
}

function setSupportMode(mode) {
    app.support.selectedChatMode = mode;

    const chatAgentBtn = $('chatAgentBtn');
    const chatBotBtn = $('chatBotBtn');
    if (chatAgentBtn) chatAgentBtn.classList.toggle('support-chat-toggle-active', mode === 'agent');
    if (chatBotBtn) chatBotBtn.classList.toggle('support-chat-toggle-active', mode === 'bot');

    const miniHeaderTitle = document.querySelector('.dashboard-support-chat-header strong');
    const miniHeaderSubtitle = document.querySelector('.dashboard-support-chat-header p');
    if (miniHeaderTitle) miniHeaderTitle.textContent = mode === 'bot' ? 'Chat with AI Assistant' : 'Chat with Support Agent';
    if (miniHeaderSubtitle) miniHeaderSubtitle.textContent = mode === 'bot' ? 'Quick AI responses' : 'Live support assistance';
}

function generateAiSupportResponse(message) {
    const text = message.toLowerCase();

    if (text.includes('balance') || text.includes('checking') || text.includes('savings')) {
        const checking = formatCurrency(app.currentUser?.checkingBalance || 0);
        const savings = formatCurrency(app.currentUser?.savingsBalance || 0);
        return `AI Assistant: Your current balances are ${checking} in checking and ${savings} in savings. You can use Add Funds or Send Money from the dashboard for the next step.`;
    }

    if (text.includes('transfer') || text.includes('send money')) {
        return 'AI Assistant: Open Send Money on the dashboard, choose the source account, fill in the recipient details, review the fee summary, and confirm with your transaction PIN.';
    }

    if (text.includes('add fund') || text.includes('add money') || text.includes('deposit')) {
        return 'AI Assistant: Open Add Funds, choose whether the money should go to checking or savings, select a payment method, and submit the amount.';
    }

    if (text.includes('card')) {
        return 'AI Assistant: Card-related controls are available on the Cards page. You can manage card settings and related actions there.';
    }

    if (text.includes('loan')) {
        return 'AI Assistant: The Loans page shows application progress, repayment details, and loan status. You can also raise a support ticket there if you need follow-up.';
    }

    if (text.includes('security') || text.includes('pin') || text.includes('password') || text.includes('2fa')) {
        return 'AI Assistant: Go to Settings to update your password, transaction PIN, and security preferences. Enabling 2-factor authentication is a good extra step.';
    }

    if (text.includes('ticket') || text.includes('case') || text.includes('complaint')) {
        const openTickets = (app.currentUser?.supportTickets || []).filter(ticket => ticket.status !== 'Resolved').length;
        return `AI Assistant: You currently have ${openTickets} open support ticket${openTickets === 1 ? '' : 's'}. You can create a new ticket or reply to an existing one in the Ticket / Case Management section.`;
    }

    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
        return 'AI Assistant: Hello. I can help with balances, transfers, cards, loans, security, and support tickets. Ask me a quick question.';
    }

    const faqMatch = supportKnowledgeBase.find(item =>
        text.includes(item.category) || text.includes(item.question.toLowerCase().split(' ').slice(0, 2).join(' '))
    );
    if (faqMatch) {
        return `AI Assistant: ${faqMatch.answer}`;
    }

    return 'AI Assistant: I can give quick help with balances, transfers, cards, loans, security, and tickets. Ask a specific question and I will respond right away.';
}

function sendSupportChatMessage(message, mode = 'agent') {
    if (!app.currentUser) return;
    ensureSupportState();

    app.currentUser.supportChatHistory.push({
        sender: 'user',
        mode,
        message,
        createdAt: new Date().toISOString(),
    });
    persistUserState(app.currentUser);
    renderSupportChat();
    setSupportTypingState(true);

    const response = mode === 'bot'
        ? generateAiSupportResponse(message)
        : 'Support Agent: Thanks for reaching out from your dashboard. We are here and reviewing your request now.';

    setTimeout(() => {
        ensureSupportState();
        app.currentUser.supportChatHistory.push({
            sender: 'support',
            mode,
            message: response,
            createdAt: new Date().toISOString(),
        });
        persistUserState(app.currentUser);
        renderSupportChat();
    }, 900);
}

function updateDashboard() {
    if (!app.currentUser) return;

    syncUserFinancialState(app.currentUser);
    ensureSupportState();
    renderSupportChat();
    const userName = $('dashboardUserName');
    const checkingBalanceEl = $('dashboardCheckingBalance');
    const savingsBalanceEl = $('dashboardSavingsBalance');
    const balance = $('dashboardBalance');
    const acctNum = $('dashboardAcctNum');
    const { checkingBalance, savingsBalance, totalBalance } = getAccountBalances(app.currentUser);

    if (userName) userName.textContent = getUserDisplayName(app.currentUser);
    if (checkingBalanceEl) checkingBalanceEl.textContent = formatCurrency(checkingBalance);
    if (savingsBalanceEl) savingsBalanceEl.textContent = formatCurrency(savingsBalance);
    if (balance) balance.textContent = formatCurrency(totalBalance);
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
    applyHistoryFilters();
    refreshBalanceDisplays();
    // update charts with latest data
    if (typeof updateCharts === 'function') updateCharts();
}

// filtering/history
function applyHistoryFilters() {
    const from = $('historyFromDate').value;
    const to = $('historyToDate').value;
    const min = parseFloat($('historyMinAmount').value) || 0;
    const max = parseFloat($('historyMaxAmount').value) || Infinity;
    const type = $('historyType').value;
    let txs = (app.currentUser.transactions || []).slice();
    if (from) txs = txs.filter(t => new Date(t.date) >= new Date(from));
    if (to) txs = txs.filter(t => new Date(t.date) <= new Date(to));
    txs = txs.filter(t => t.amount >= min && t.amount <= max);
    if (type && type !== 'all') txs = txs.filter(t => t.type === type);
    renderTransactionHistoryList(txs);
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

function renderTransactionHistoryList(transactions = []) {
    const list = $('historyTransactionsList');
    if (!list) return;

    if (!transactions.length) {
        list.innerHTML = '<p class="empty-state">No transactions found</p>';
        return;
    }

    list.innerHTML = transactions
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(t => `
            <div class="transaction-item">
                <div class="description">${t.description || 'Transaction'}</div>
                <div class="amount">${t.type === 'sent' ? '-' : '+'}$${t.amount.toFixed(2)}</div>
                <small>${new Date(t.date).toLocaleString()}</small>
            </div>
        `)
        .join('');
}

function updateSettings() {
    if (!app.currentUser) return;

    const fullName = getUserDisplayName(app.currentUser);
    const accountNumber = app.currentUser.accountNumber || '-';
    const maskedAccountNumber = accountNumber.length > 4
        ? `${'*'.repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}`
        : accountNumber;
    const addressParts = [app.currentUser.address, app.currentUser.city, app.currentUser.country].filter(Boolean);
    const fullAddress = addressParts.length ? addressParts.join(', ') : '-';
    const linkedAccounts = (app.currentUser.linkedAccounts || []).join(', ') || 'Primary checking';
    const avatar = $('settingsAvatar');
    const fullNameEl = $('settingFullName');
    const name = $('settingName');
    const email = $('settingEmail');
    const phone = $('settingPhone');
    const dob = $('settingDob');
    const gender = $('settingGender');
    const nationality = $('settingNationality');
    const residentialAddress = $('settingResidentialAddress');
    const mailingAddress = $('settingMailingAddress');
    const altContact = $('settingAltContact');
    const verifyStatus = $('settingVerifyStatus');
    const accountNumberEl = $('settingAccountNumber');
    const accountType = $('settingAccountType');
    const accountStatus = $('settingAccountStatus');
    const accountStatusSummary = $('settingAccountStatusSummary');
    const linkedAccountsEl = $('settingLinkedAccounts');
    const identityStatus = $('settingIdentityStatus');
    const idUpload = $('settingIdUpload');
    const proofAddress = $('settingProofStatus');
    const verification = $('settingVerificationProgress');
    const linkedCards = $('settingLinkedCards');
    const linkedBanks = $('settingLinkedBanks');
    const thirdParty = $('settingThirdParty');
    const language = $('settingLanguage');
    const currencyPref = $('settingCurrencyPref');
    const theme = $('settingTheme');
    const timeZone = $('settingTimeZone');
    const languageSelect = $('settingLanguageSelect');
    const currencySelect = $('settingCurrencySelect');
    const themeSelect = $('settingThemeSelect');
    const timeZoneSelect = $('settingTimeZoneSelect');

    if (avatar) avatar.textContent = fullName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
    if (fullNameEl) fullNameEl.textContent = fullName;
    if (name) name.textContent = fullName;
    if (dob) dob.textContent = app.currentUser.dateOfBirth || '-';
    if (gender) gender.textContent = app.currentUser.gender || 'Not provided';
    if (nationality) nationality.textContent = app.currentUser.country || '-';
    if (residentialAddress) residentialAddress.textContent = fullAddress;
    if (mailingAddress) mailingAddress.textContent = app.currentUser.mailingAddress || fullAddress;
    if (altContact) altContact.textContent = app.currentUser.altContact || 'Not provided';
    if (verifyStatus) verifyStatus.textContent = `${app.currentUser.emailVerified ? 'Email verified' : 'Email pending'}, ${app.currentUser.phone ? 'phone verified' : 'phone missing'}`;
    if (accountNumberEl) accountNumberEl.textContent = maskedAccountNumber;
    if (accountType) accountType.textContent = app.currentUser.accountType || 'Offshore Checking';
    if (accountStatus) accountStatus.textContent = app.currentUser.accountStatus || 'Active';
    if (accountStatusSummary) accountStatusSummary.textContent = `Account status: ${app.currentUser.accountStatus || 'Active'}`;
    if (linkedAccountsEl) linkedAccountsEl.textContent = linkedAccounts;
    if (identityStatus) identityStatus.textContent = app.currentUser.identityStatus || (app.currentUser.kyc?.passportFile ? 'Submitted' : 'Pending upload');
    if (idUpload) idUpload.textContent = app.currentUser.kyc?.passportFile ? 'Passport uploaded' : 'Passport / Driver\'s License required';
    if (proofAddress) proofAddress.textContent = app.currentUser.kyc?.proofAddressFile ? 'Submitted' : 'Awaiting verification';
    if (verification) verification.textContent = app.currentUser.kyc?.passportFile && app.currentUser.kyc?.proofAddressFile ? '3 of 3 checks complete' : '2 of 3 checks complete';
    if (linkedCards) linkedCards.textContent = app.currentUser.card ? '1 active card linked' : 'No linked cards';
    if (linkedBanks) linkedBanks.textContent = linkedAccounts;
    if (thirdParty) thirdParty.textContent = app.currentUser.thirdPartyServices || 'PayPal and Apple Pay connected';
    if (language) language.textContent = app.currentUser.language || 'English';
    if (currencyPref) currencyPref.textContent = app.currentUser.currencyPreference || 'USD';
    if (theme) theme.textContent = app.currentUser.theme || 'Light Mode';
    if (timeZone) timeZone.textContent = app.currentUser.timeZone || 'Africa/Lagos';
    if (languageSelect) languageSelect.value = app.currentUser.language || 'English';
    if (currencySelect) currencySelect.value = app.currentUser.currencyPreference || 'USD';
    if (themeSelect) themeSelect.value = app.currentUser.theme || 'Light Mode';
    if (timeZoneSelect) timeZoneSelect.value = app.currentUser.timeZone || 'Africa/Lagos';
    applyThemePreference(app.currentUser.theme || 'Light Mode');
    document.documentElement.lang = (app.currentUser.language || 'English').toLowerCase();

    if (email) email.textContent = app.currentUser.email || '—';
    if (phone) phone.textContent = app.currentUser.phone || '—';
}

function applyThemePreference(theme) {
    document.body.dataset.theme = theme || 'Light Mode';
}

function updateUserPreference(field, value, label) {
    if (!app.currentUser) return;
    app.currentUser[field] = value;
    persistUserState(app.currentUser);
    if (field === 'theme') applyThemePreference(value);
    if (field === 'language') document.documentElement.lang = value.toLowerCase();
    updateSettings();
    refreshBalanceDisplays();
    showNotification(`${label} updated`, 'success');
}

function promptForField(promptText, currentValue, fallback = currentValue) {
    const value = window.prompt(promptText, currentValue || '');
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed || fallback || '';
}

// =================== AUTH HANDLERS ===================

// =================== CHARTS (Currency prediction & Portfolio) ===================

app.charts = app.charts || {};

function initCharts() {
    if (!window.Chart) return;
    try {
        const currencyCtx = document.getElementById('currencyChart');
        const portfolioCtx = document.getElementById('portfolioChart');

        // sample labels: next 12 weeks
        const labels = Array.from({length: 12}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i * 7);
            return d.toLocaleDateString();
        });

        // currency prediction dataset (simulated)
        const usdEur = labels.map((_, i) => 0.90 + Math.sin(i/2)/50 + i*0.001);
        const usdGbp = labels.map((_, i) => 0.78 + Math.cos(i/3)/60 + i*0.0008);

        if (currencyCtx) {
            app.charts.currency = new Chart(currencyCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'USD/EUR', data: usdEur, borderColor: '#2563eb', tension: 0.25, fill: false },
                        { label: 'USD/GBP', data: usdGbp, borderColor: '#7c3aed', tension: 0.25, fill: false }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { y: { beginAtZero: false } }
                }
            });
        }

        // portfolio performance (simulated)
        const base = 10000;
        const values = labels.map((_, i) => base * (1 + (i*0.02) + Math.sin(i/2)/50));
        if (portfolioCtx) {
            app.charts.portfolio = new Chart(portfolioCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'Portfolio Value (USD)', data: values, borderColor: '#10b981', tension: 0.2, fill: true, backgroundColor: 'rgba(16,185,129,0.08)' }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { y: { beginAtZero: false } }
                }
            });
        }
    } catch (e) {
        console.error('Chart init error', e);
    }
}

function updateCharts() {
    if (!app.currentUser) return;
    if (app.charts.currency) {
        // Optionally map real holdings to impact/currency; here we just animate update
        app.charts.currency.update();
    }
    if (app.charts.portfolio) {
        // update portfolio chart with a slight random walk based on balance
        const balance = app.currentUser.balance || 1000;
        const ds = app.charts.portfolio.data.datasets[0];
        if (ds && ds.data && ds.data.length) {
            // nudge last value to reflect balance proportionally
            const factor = 1 + (balance / 100000) * 0.05;
            app.charts.portfolio.data.datasets[0].data = app.charts.portfolio.data.datasets[0].data.map(v => v * factor);
            app.charts.portfolio.update();
        }
    }
}

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
        checkingBalance: 500,
        savingsBalance: 500,
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

    syncUserFinancialState(newUser);
    app.users[email] = newUser;
    persistUserState(newUser);
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

    persistUserState(user);
    showNotification('Logged in successfully!', 'success');
    showPage('dashboard');
    updateDashboard();

    $('loginForm').reset();
}

function handleLogout() {
    if (!isLandingPreview) {
        localStorage.removeItem('currentUser');
    }
    app.currentUser = null;
    applyThemePreference('Light Mode');
    document.documentElement.lang = 'en';
    showNotification('Logged out', 'success');
    window.location.href = 'meridianbank.html';
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

    if (typeof validateTransferForm === 'function' && !validateTransferForm()) {
        return;
    }

    if (typeof executeTransfer === 'function') {
        executeTransfer();
    }
}

function handleAddFunds(e) {
    e.preventDefault();

    if (!app.currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }

    const amount = parseFloat($('addFundsAmount').value);
    const method = $('addFundsMethod').value;
    const targetAccount = $('addFundsTargetAccount').value;

    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    if (!method) {
        showNotification('Please select a payment method', 'error');
        return;
    }

    if (!targetAccount) {
        showNotification('Please select the account to fund', 'error');
        return;
    }

    // Process funds
    if (targetAccount === 'savings') {
        app.currentUser.savingsBalance += amount;
    } else {
        app.currentUser.checkingBalance += amount;
    }
    if (!app.currentUser.transactions) app.currentUser.transactions = [];
    app.currentUser.transactions.push({
        type: 'received',
        amount,
        description: `Funds added to ${targetAccount} via ${method}`,
        date: new Date().toISOString(),
    });

    persistUserState(app.currentUser);

    showNotification('Funds added successfully!', 'success');
    $('addFundsForm').reset();
    updateAddFundsAccountDetails();
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
        { id: 'backFromInvestFlowBtn', page: 'investment' },
        { id: 'backFromLoanBtn', page: 'dashboard' },
        { id: 'backFromBeneficiariesBtn', page: 'dashboard' },
        { id: 'backFromMessagesBtn', page: 'dashboard' },
        { id: 'backFromSupportBtn', page: 'dashboard' },
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
        { id: 'toInvestFlowBtn', page: 'investFlow' },
        { id: 'toLoanBtn', page: 'loan' },
        { id: 'toForexBtn', page: 'forex' },
        { id: 'toHistoryBtn', page: 'transactionHistory' },
        { id: 'navMenuBtn', page: 'navMenu' },
        // nav menu items
        { id: 'navDashboard', page: 'dashboard' },
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
    const addFundsTargetAccount = $('addFundsTargetAccount');

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

    if (addFundsTargetAccount) {
        addFundsTargetAccount.addEventListener('change', updateAddFundsAccountDetails);
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
    const editPersonalInfoBtn = $('editPersonalInfoBtn');
    const editAddressInfoBtn = $('editAddressInfoBtn');
    const editContactInfoBtn = $('editContactInfoBtn');
    const linkAccountBtn = $('linkAccountBtn');
    const preferenceControls = [
        { buttonId: 'settingLanguageBtn', selectId: 'settingLanguageSelect', field: 'language', label: 'Language' },
        { buttonId: 'settingCurrencyBtn', selectId: 'settingCurrencySelect', field: 'currencyPreference', label: 'Currency preference' },
        { buttonId: 'settingThemeBtn', selectId: 'settingThemeSelect', field: 'theme', label: 'Theme' },
        { buttonId: 'settingTimeZoneBtn', selectId: 'settingTimeZoneSelect', field: 'timeZone', label: 'Time zone' },
    ];

    if (twoFactorBtn) {
        twoFactorBtn.addEventListener('change', () => {
            if (app.currentUser) {
                app.currentUser.twoFactor = twoFactorBtn.checked;
                persistUserState(app.currentUser);
                showNotification('Settings saved', 'success');
            }
        });
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('change', () => {
            if (app.currentUser) {
                app.currentUser.notificationsEnabled = notificationBtn.checked;
                persistUserState(app.currentUser);
                showNotification('Settings saved', 'success');
            }
        });
    }

    if (editPersonalInfoBtn) {
        editPersonalInfoBtn.addEventListener('click', () => {
            if (!app.currentUser) return;
            const firstName = promptForField('Enter first name', app.currentUser.firstName || '');
            if (firstName === null) return;
            const lastName = promptForField('Enter last name', app.currentUser.lastName || '');
            if (lastName === null) return;
            const dob = promptForField('Enter date of birth (YYYY-MM-DD)', app.currentUser.dateOfBirth || '', app.currentUser.dateOfBirth || '-');
            if (dob === null) return;
            const gender = promptForField('Enter gender', app.currentUser.gender || 'Not provided', app.currentUser.gender || 'Not provided');
            if (gender === null) return;
            app.currentUser.firstName = firstName;
            app.currentUser.lastName = lastName;
            app.currentUser.dateOfBirth = dob;
            app.currentUser.gender = gender;
            persistUserState(app.currentUser);
            updateSettings();
            showNotification('Personal information updated', 'success');
        });
    }

    if (editAddressInfoBtn) {
        editAddressInfoBtn.addEventListener('click', () => {
            if (!app.currentUser) return;
            const address = promptForField('Enter residential address', app.currentUser.address || '');
            if (address === null) return;
            const city = promptForField('Enter city', app.currentUser.city || '');
            if (city === null) return;
            const country = promptForField('Enter nationality / country', app.currentUser.country || '');
            if (country === null) return;
            const mailingAddress = promptForField('Enter mailing address', app.currentUser.mailingAddress || `${address}, ${city}, ${country}`, `${address}, ${city}, ${country}`);
            if (mailingAddress === null) return;
            app.currentUser.address = address;
            app.currentUser.city = city;
            app.currentUser.country = country;
            app.currentUser.mailingAddress = mailingAddress;
            persistUserState(app.currentUser);
            updateSettings();
            showNotification('Address information updated', 'success');
        });
    }

    if (editContactInfoBtn) {
        editContactInfoBtn.addEventListener('click', () => {
            if (!app.currentUser) return;
            const email = promptForField('Enter email address', app.currentUser.email || '');
            if (email === null) return;
            const phone = promptForField('Enter phone number', app.currentUser.phone || '');
            if (phone === null) return;
            const altContact = promptForField('Enter alternative contact info', app.currentUser.altContact || 'Not provided', app.currentUser.altContact || 'Not provided');
            if (altContact === null) return;
            if (app.currentUser.email && app.currentUser.email !== email && app.users[app.currentUser.email]) {
                delete app.users[app.currentUser.email];
            }
            app.currentUser.email = email;
            app.currentUser.phone = phone;
            app.currentUser.altContact = altContact;
            app.users[email] = app.currentUser;
            persistUserState(app.currentUser);
            updateSettings();
            showNotification('Contact information updated', 'success');
        });
    }

    if (linkAccountBtn) {
        linkAccountBtn.addEventListener('click', () => {
            if (!app.currentUser) return;
            const accountName = promptForField('Enter the account name to link', '');
            if (accountName === null || !accountName) return;
            const linkedAccounts = Array.isArray(app.currentUser.linkedAccounts) ? app.currentUser.linkedAccounts : [];
            if (!linkedAccounts.includes(accountName)) {
                linkedAccounts.push(accountName);
            }
            app.currentUser.linkedAccounts = linkedAccounts;
            persistUserState(app.currentUser);
            updateSettings();
            updateDashboard();
            showNotification('Account linked successfully', 'success');
        });
    }

    preferenceControls.forEach(({ buttonId, selectId, field, label }) => {
        const button = $(buttonId);
        const select = $(selectId);
        if (!button || !select) return;

        button.addEventListener('click', () => {
            select.focus();
            select.click();
        });

        select.addEventListener('change', () => {
            updateUserPreference(field, select.value, label);
        });
    });
}

function attachSupportHandlers() {
    const searchInput = $('supportSearchInput');
    const categoryRow = $('supportCategoryRow');
    const guideButtons = document.querySelectorAll('.support-guide-btn');
    const chatAgentBtn = $('chatAgentBtn');
    const chatBotBtn = $('chatBotBtn');
    const chatForm = $('supportChatForm');
    const chatInput = $('supportChatInput');
    const contactForm = $('supportContactForm');
    const ticketForm = $('supportTicketForm');
    const replyBtn = $('supportReplyBtn');
    const dashboardSupportFab = $('dashboardSupportFab');
    const dashboardSupportMiniChat = $('dashboardSupportMiniChat');
    const dashboardSupportClose = $('dashboardSupportClose');
    const dashboardSupportOpenFull = $('dashboardSupportOpenFull');
    const dashboardSupportMiniForm = $('dashboardSupportMiniForm');
    const dashboardSupportMiniInput = $('dashboardSupportMiniInput');

    if (searchInput) {
        searchInput.addEventListener('input', renderSupportFaqs);
    }

    if (categoryRow) {
        categoryRow.querySelectorAll('.support-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                app.support.selectedFaqCategory = chip.dataset.category || 'all';
                categoryRow.querySelectorAll('.support-chip').forEach((item) => item.classList.remove('active'));
                chip.classList.add('active');
                renderSupportFaqs();
            });
        });
    }

    guideButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const output = $('supportGuideOutput');
            if (output) output.textContent = button.dataset.guide || 'Guide unavailable.';
        });
    });

    if (chatAgentBtn) {
        chatAgentBtn.addEventListener('click', () => {
            setSupportMode('agent');
            showNotification('Support agent chat selected', 'success');
        });
    }

    if (chatBotBtn) {
        chatBotBtn.addEventListener('click', () => {
            setSupportMode('bot');
            showNotification('AI chatbot selected', 'success');
        });
    }

    if (chatForm && chatInput) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (!message) return;
            sendSupportChatMessage(message, app.support.selectedChatMode);
            chatInput.value = '';
        });
    }

    if (dashboardSupportFab && dashboardSupportMiniChat) {
        dashboardSupportFab.addEventListener('click', () => {
            if (!app.currentUser) return;
            setSupportMode('agent');
            ensureSupportState();
            renderSupportChat();
            dashboardSupportMiniChat.hidden = false;
        });
    }

    if (dashboardSupportClose && dashboardSupportMiniChat) {
        dashboardSupportClose.addEventListener('click', () => {
            dashboardSupportMiniChat.hidden = true;
        });
    }

    if (dashboardSupportOpenFull) {
        dashboardSupportOpenFull.addEventListener('click', () => {
            if (dashboardSupportMiniChat) dashboardSupportMiniChat.hidden = true;
            setSupportMode('agent');
            showPage('support');
        });
    }

    if (dashboardSupportMiniForm && dashboardSupportMiniInput) {
        dashboardSupportMiniForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = dashboardSupportMiniInput.value.trim();
            if (!message) return;
            sendSupportChatMessage(message, 'agent');
            dashboardSupportMiniInput.value = '';
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!app.currentUser) return;
            const topic = $('supportContactTopic')?.value || 'General Inquiry';
            const channel = $('supportContactChannel')?.value || 'Send Message';
            const callbackTime = $('supportCallbackTime')?.value.trim();
            const message = $('supportContactMessage')?.value.trim();

            if (!message) {
                showNotification('Please enter your support message', 'error');
                return;
            }

            ensureSupportState();
            app.currentUser.supportTickets.push({
                id: `TKT-${new Date().getFullYear()}-${String(app.currentUser.supportTickets.length + 1).padStart(3, '0')}`,
                subject: `${topic} via ${channel}`,
                category: topic,
                message: callbackTime ? `${message} Preferred callback: ${callbackTime}` : message,
                status: channel === 'Phone Support' ? 'In Progress' : 'Open',
                createdAt: new Date().toISOString(),
                replies: [channel === 'Request Callback' ? `Callback requested for ${callbackTime || 'next available slot'}.` : 'Support request received and logged.'],
            });
            persistUserState(app.currentUser);
            contactForm.reset();
            updateSupportPage();
            showNotification('Support request submitted', 'success');
        });
    }

    if (ticketForm) {
        ticketForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!app.currentUser) return;
            const subject = $('supportTicketSubject')?.value.trim();
            const category = $('supportTicketCategory')?.value || 'Accounts';
            const message = $('supportTicketMessage')?.value.trim();
            if (!subject || !message) {
                showNotification('Please complete the ticket subject and details', 'error');
                return;
            }

            ensureSupportState();
            const ticket = {
                id: `TKT-${new Date().getFullYear()}-${String(app.currentUser.supportTickets.length + 1).padStart(3, '0')}`,
                subject,
                category,
                message,
                status: 'Open',
                createdAt: new Date().toISOString(),
                replies: ['Ticket created successfully. A support specialist will review it shortly.'],
            };
            app.currentUser.supportTickets.push(ticket);
            app.support.selectedTicketId = ticket.id;
            persistUserState(app.currentUser);
            ticketForm.reset();
            updateSupportPage();
            showNotification('Support ticket created', 'success');
        });
    }

    if (replyBtn) {
        replyBtn.addEventListener('click', () => {
            if (!app.currentUser) return;
            ensureSupportState();
            const replyMessage = $('supportTicketReply')?.value.trim();
            if (!replyMessage) {
                showNotification('Please enter a reply message', 'error');
                return;
            }

            const selectedId = app.support.selectedTicketId || app.currentUser.supportTickets?.[0]?.id;
            const ticket = (app.currentUser.supportTickets || []).find((item) => item.id === selectedId);
            if (!ticket) {
                showNotification('Select a ticket to reply to', 'error');
                return;
            }

            ticket.replies = ticket.replies || [];
            ticket.replies.push(`You: ${replyMessage}`);
            ticket.status = ticket.status === 'Resolved' ? 'In Progress' : ticket.status;
            $('supportTicketReply').value = '';
            persistUserState(app.currentUser);
            renderSupportTickets();
            showNotification('Reply added to ticket', 'success');
        });
    }
}

function attachMessagesHandlers() {
    const tabs = $('messagesTabs');
    const newMessageBtn = $('newMessageBtn');
    const composePanel = $('composeMessagePanel');
    const closeComposeBtn = $('closeComposeMessageBtn');
    const composeForm = $('composeMessageForm');

    if (tabs) {
        tabs.querySelectorAll('.message-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                app.messages.selectedCategory = tab.dataset.category || 'all';
                tabs.querySelectorAll('.message-tab').forEach((item) => item.classList.remove('active'));
                tab.classList.add('active');
                renderMessagesList();
            });
        });
    }

    if (newMessageBtn && composePanel) {
        newMessageBtn.addEventListener('click', () => {
            composePanel.hidden = false;
        });
    }

    if (closeComposeBtn && composePanel) {
        closeComposeBtn.addEventListener('click', () => {
            composePanel.hidden = true;
        });
    }

    if (composeForm) {
        composeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!app.currentUser) return;
            ensureMessageState();

            const department = $('composeDepartment')?.value || 'Support';
            const subject = $('composeSubject')?.value.trim();
            const body = $('composeMessageBody')?.value.trim();
            const attachmentInput = $('composeAttachment');
            const attachmentName = attachmentInput?.files?.[0]?.name;

            if (!subject || !body) {
                showNotification('Please enter a subject and message', 'error');
                return;
            }

            const newMessage = {
                id: `MSG-${String(app.currentUser.messages.length + 1).padStart(3, '0')}`,
                sender: 'You',
                category: department.toLowerCase() === 'support' ? 'support' : 'all',
                subject,
                preview: body.slice(0, 90),
                content: body,
                timestamp: new Date().toISOString(),
                read: true,
                attachments: attachmentName ? [attachmentName] : [],
                links: ['Message sent successfully'],
            };

            app.currentUser.messages.unshift(newMessage);
            app.messages.selectedCategory = 'all';
            app.messages.selectedMessageId = newMessage.id;
            persistUserState(app.currentUser);
            composeForm.reset();
            if (composePanel) composePanel.hidden = true;
            updateMessagesPage();
            showNotification('Message sent successfully', 'success');
        });
    }
}

function attachBeneficiaryHandlers() {
    const addBtn = $('addBeneficiaryBtn');
    const closeBtn = $('closeBeneficiaryFormBtn');
    const panel = $('beneficiaryFormPanel');
    const form = $('beneficiaryForm');

    if (addBtn) {
        addBtn.addEventListener('click', () => openBeneficiaryForm());
    }

    if (closeBtn && panel) {
        closeBtn.addEventListener('click', () => {
            panel.hidden = true;
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!app.currentUser) return;

            const id = $('beneficiaryEditId')?.value.trim();
            const name = $('beneficiaryRecipientName')?.value.trim();
            const bankName = $('beneficiaryBankName')?.value.trim();
            const accountNumber = $('beneficiaryAccountNumber')?.value.trim();
            const swiftCode = $('beneficiarySwiftCode')?.value.trim();
            const bankAddress = $('beneficiaryBankAddress')?.value.trim();
            const country = $('beneficiaryCountry')?.value || 'US';
            const tag = $('beneficiaryFavorite')?.value || 'recent';

            if (!name || !bankName || !accountNumber) {
                showNotification('Please complete the beneficiary details', 'error');
                return;
            }

            saveBeneficiaryRecord({
                id,
                name,
                bankName,
                accountNumber,
                swiftCode,
                bankAddress,
                country,
                tag,
            });

            panel.hidden = true;
            form.reset();
            showNotification(id ? 'Beneficiary updated' : 'Beneficiary saved', 'success');
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
        attachBeneficiaryHandlers();
        attachMessagesHandlers();
        attachSupportHandlers();
        // additional dashboard-specific controls
        const applyFiltersBtn = $('applyHistoryFilters');
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyHistoryFilters);

        const downloadStmtBtn = $('downloadStatement');
        if (downloadStmtBtn) downloadStmtBtn.addEventListener('click', downloadStatement);

        const convertBtn = $('performConversion');
        if (convertBtn) convertBtn.addEventListener('click', performConversion);

        // initialize charts if Chart.js available
        if (typeof initCharts === 'function') initCharts();
        // initialize transfer form handlers if available
        if (typeof attachTransferFormHandlers === 'function') attachTransferFormHandlers();
        // initialize card form handlers if available
        if (typeof attachCardFormHandlers === 'function') attachCardFormHandlers();
        refreshBalanceDisplays();
    } catch (e) {
        console.error('Error attaching listeners:', e);
    }
}

// =================== APP STARTUP ===================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
