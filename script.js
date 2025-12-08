// Page navigation
const pages = {
    welcome: 'welcomePage',
    login: 'loginPage',
    signup: 'signupPage',
    forgotPassword: 'forgotPasswordPage',  // ADD THIS LINE
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

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    checkLoginStatus();
});

function initializeEventListeners() {
    // Welcome page
    document.getElementById('showLoginBtn').addEventListener('click', () => showPage('login'));
    document.getElementById('showSignupBtn').addEventListener('click', () => showPage('signup'));

    // Login page
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('backFromLoginBtn').addEventListener('click', () => showPage('welcome'));
    document.getElementById('switchToSignup').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('signup');
    });

    // ============ FORGOT PASSWORD FUNCTIONS ============

    let forgotPasswordState = {
        email: '',
        verificationCode: '',
        resetToken: ''
    };

    function initializeForgotPasswordListeners() {
        // Show forgot password page
        document.getElementById('showForgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            showPage('forgotPassword');
        });

        // Back from forgot password
        document.getElementById('backFromForgotPasswordBtn').addEventListener('click', () => showPage('login'));
        document.getElementById('backToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            resetForgotPasswordForm();
            showPage('login');
        });

        // Step 1: Send reset link
        document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPasswordSubmit);

        // Step 2: Verify code
        document.getElementById('verifyCodeForm').addEventListener('submit', handleVerifyCode);

        // Step 3: Reset password
        document.getElementById('resetPasswordForm').addEventListener('submit', handleResetPassword);
    }

    function handleForgotPasswordSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value;

        if (email) {
            const users = JSON.parse(localStorage.getItem('users')) || {};

            // Check if email exists
            if (!users[email]) {
                showNotification('Email not found in our system!', 'error');
                return;
            }

            // Generate a 6-digit verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            forgotPasswordState.email = email;
            forgotPasswordState.resetToken = verificationCode;

            // Store the code temporarily (in real app, send via email)
            localStorage.setItem('resetCode_' + email, JSON.stringify({
                code: verificationCode,
                timestamp: Date.now(),
                expiresIn: 10 * 60 * 1000 // 10 minutes
            }));

            // Send email with verification code
            sendPasswordResetEmail(email, verificationCode);

            // Show success and move to step 2
            showNotification('Verification code sent to your email!');
            document.querySelector('.step-1').style.display = 'none';
            document.querySelector('.step-2').style.display = 'block';
        }
    }

    function handleVerifyCode(e) {
        e.preventDefault();
        const enteredCode = document.getElementById('verificationCode').value;
        const email = forgotPasswordState.email;

        // Get the stored code
        const storedData = JSON.parse(localStorage.getItem('resetCode_' + email));

        if (!storedData) {
            showNotification('Verification code expired! Please try again.', 'error');
            resetForgotPasswordForm();
            showPage('login');
            return;
        }

        // Check if code matches
        if (storedData.code !== enteredCode) {
            showNotification('Invalid verification code!', 'error');
            return;
        }

        // Check if code is expired
        if (Date.now() - storedData.timestamp > storedData.expiresIn) {
            showNotification('Verification code expired! Please try again.', 'error');
            localStorage.removeItem('resetCode_' + email);
            resetForgotPasswordForm();
            showPage('login');
            return;
        }

        // Code is valid, move to step 3
        showNotification('Code verified! Now set your new password.');
        document.querySelector('.step-2').style.display = 'none';
        document.querySelector('.step-3').style.display = 'block';
    }

    function handleResetPassword(e) {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        const email = forgotPasswordState.email;

        // Validate passwords
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match!', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showNotification('Password must be at least 6 characters long!', 'error');
            return;
        }

        // Update password in database
        const users = JSON.parse(localStorage.getItem('users')) || {};

        if (users[email]) {
            users[email].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));

            // Clear the verification code
            localStorage.removeItem('resetCode_' + email);

            // Send confirmation email
            sendPasswordResetConfirmationEmail(email, users[email].fullName);

            // Show success message
            showNotification('Password reset successfully! You can now login with your new password.');

            // Reset form and go back to login
            resetForgotPasswordForm();
            setTimeout(() => {
                showPage('login');
            }, 2000);
        } else {
            showNotification('Error: User not found!', 'error');
        }
    }

    function resetForgotPasswordForm() {
        document.getElementById('forgotPasswordForm').reset();
        document.getElementById('verifyCodeForm').reset();
        document.getElementById('resetPasswordForm').reset();

        document.querySelector('.step-1').style.display = 'block';
        document.querySelector('.step-2').style.display = 'none';
        document.querySelector('.step-3').style.display = 'none';

        forgotPasswordState = {
            email: '',
            verificationCode: '',
            resetToken: ''
        };
    }

    function sendPasswordResetEmail(email, code) {
        const userName = email.split('@')[0];

        // Send via EmailJS
        if (typeof emailjs !== 'undefined') {
            emailjs.send('service_YOUR_SERVICE_ID', 'template_YOUR_TEMPLATE_ID', {
                to_email: email,
                user_name: userName,
                verification_code: code,
                subject: 'Password Reset Request'
            }).then(function (response) {
                console.log('Password reset email sent!', response);
            }, function (error) {
                console.log('Failed to send email:', error);
                showNotification('Warning: Email could not be sent, but code is: ' + code);
            });
        }

        // Also store in notifications
        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (users[email]) {
            if (!users[email].notifications) {
                users[email].notifications = [];
            }
            users[email].notifications.push({
                type: 'password_reset',
                subject: 'Password Reset Code',
                message: `Your password reset code is: ${code}. This code expires in 10 minutes.`,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    function sendPasswordResetConfirmationEmail(email, fullName) {
        if (typeof emailjs !== 'undefined') {
            emailjs.send('service_YOUR_SERVICE_ID', 'template_YOUR_TEMPLATE_ID', {
                to_email: email,
                user_name: fullName,
                subject: 'Password Reset Successful'
            }).then(function (response) {
                console.log('Confirmation email sent!', response);
            }, function (error) {
                console.log('Failed to send confirmation email:', error);
            });
        }
    }

    // Signup page
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('backFromSignupBtn').addEventListener('click', () => showPage('welcome'));
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('login');
    });

    // Dashboard
    document.getElementById('dashboardMenuToggle').addEventListener('click', openMenu);
    document.getElementById('quickTransferBtn').addEventListener('click', () => showPage('transfer'));
    document.getElementById('quickCardBtn').addEventListener('click', () => showPage('card'));
    document.getElementById('quickLoanBtn').addEventListener('click', () => showPage('loan'));
    document.getElementById('quickInvestBtn').addEventListener('click', () => showPage('investment'));

    // Add Funds
    if (document.getElementById('addFundsBtn')) {
        document.getElementById('addFundsBtn').addEventListener('click', openAddFundsModal);
    }
    if (document.getElementById('closeAddFundsModal')) {
        document.getElementById('closeAddFundsModal').addEventListener('click', closeAddFundsModal);
    }
    if (document.getElementById('cancelAddFundsBtn')) {
        document.getElementById('cancelAddFundsBtn').addEventListener('click', closeAddFundsModal);
    }
    if (document.getElementById('addFundsForm')) {
        document.getElementById('addFundsForm').addEventListener('submit', handleAddFunds);
    }
    if (document.getElementById('addFundsModal')) {
        document.getElementById('addFundsModal').addEventListener('click', (e) => {
            if (e.target.id === 'addFundsModal') closeAddFundsModal();
        });
    }

    // Transfer page
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
    document.getElementById('backFromTransferBtn').addEventListener('click', () => showPage('dashboard'));

    // Beneficiary page
    document.getElementById('beneficiaryForm').addEventListener('submit', handleAddBeneficiary);
    document.getElementById('backFromBeneficiaryBtn').addEventListener('click', () => showPage('dashboard'));

    // Card page
    document.getElementById('cardForm').addEventListener('submit', handleAddCard);
    document.getElementById('backFromCardBtn').addEventListener('click', () => showPage('dashboard'));

    // Loan page
    document.getElementById('loanForm').addEventListener('submit', handleLoan);
    document.getElementById('backFromLoanBtn').addEventListener('click', () => showPage('dashboard'));

    // Investment page
    document.querySelectorAll('.investment-card .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const cardElement = e.target.closest('.investment-card');
            const investmentName = cardElement.querySelector('h4').textContent;
            const investmentType = e.target.dataset.investment;
            selectInvestment(investmentType, investmentName);
        });
    });

    document.getElementById('cancelInvestmentBtn').addEventListener('click', cancelInvestment);
    document.getElementById('investmentForm').addEventListener('submit', handleInvestment);
    document.getElementById('backFromInvestmentBtn').addEventListener('click', () => showPage('dashboard'));

    // Transaction page
    document.getElementById('backFromTransactionBtn').addEventListener('click', () => showPage('dashboard'));

    // Hamburger menu
    document.getElementById('hamburgerBtn').addEventListener('click', openMenu);
    document.getElementById('closeMenuBtn').addEventListener('click', closeMenu);
    document.getElementById('menuOverlay').addEventListener('click', closeMenu);

    // Menu items
    document.getElementById('dashboardMenuBtn').addEventListener('click', () => {
        showPage('dashboard');
        closeMenu();
    });
    document.getElementById('transferMenuBtn').addEventListener('click', () => {
        showPage('transfer');
        closeMenu();
    });
    document.getElementById('beneficiaryMenuBtn').addEventListener('click', () => {
        showPage('beneficiary');
        closeMenu();
    });
    document.getElementById('cardMenuBtn').addEventListener('click', () => {
        showPage('card');
        closeMenu();
    });
    document.getElementById('loanMenuBtn').addEventListener('click', () => {
        showPage('loan');
        closeMenu();
    });
    document.getElementById('investmentMenuBtn').addEventListener('click', () => {
        showPage('investment');
        closeMenu();
    });
    document.getElementById('transactionMenuBtn').addEventListener('click', () => {
        showPage('transaction');
        closeMenu();
    });
    document.getElementById('logoutMenuBtn').addEventListener('click', handleLogout);
}

// Generate unique account number
function generateAccountNumber() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let accountNum = '';

    for (let i = 0; i < 4; i++) {
        accountNum += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    for (let i = 0; i < 10; i++) {
        accountNum += Math.floor(Math.random() * 10);
    }

    return accountNum;
}

// Generate unique routing number
function generateRoutingNumber() {
    let routingNum = '';
    for (let i = 0; i < 9; i++) {
        routingNum += Math.floor(Math.random() * 10);
    }
    return routingNum;
}

// Page navigation
function showPage(pageName) {
    Object.values(pages).forEach(pageId => {
        const pageElement = document.getElementById(pageId);
        if (pageElement) {
            pageElement.classList.remove('active');
        }
    });

    const pageId = pages[pageName];
    if (pageId) {
        const pageElement = document.getElementById(pageId);
        if (pageElement) {
            pageElement.classList.add('active');
            currentPage = pageName;
        }
    }

    // Load specific page data
    if (pageName === 'transaction') {
        loadFullTransactionHistory();
    }
}

// Menu functions
function openMenu() {
    document.getElementById('sidebarMenu').classList.add('active');
    document.getElementById('menuOverlay').classList.add('active');
    document.getElementById('hamburgerBtn').classList.add('active');
}

function closeMenu() {
    document.getElementById('sidebarMenu').classList.remove('active');
    document.getElementById('menuOverlay').classList.remove('active');
    document.getElementById('hamburgerBtn').classList.remove('active');
}

// Add Funds Modal
function openAddFundsModal() {
    document.getElementById('addFundsModal').classList.add('active');
}

function closeAddFundsModal() {
    document.getElementById('addFundsModal').classList.remove('active');
    document.getElementById('addFundsForm').reset();
}

// Send Email Notification using EmailJS
function sendEmailNotification(email, subject, message) {
    const emailData = {
        to_email: email,
        subject: subject,
        message: message,
        timestamp: new Date().toLocaleString()
    };

    // Send email via EmailJS
    emailjs.send('service_YOUR_SERVICE_ID', 'template_YOUR_TEMPLATE_ID', {
        to_email: email,
        subject: subject,
        message: message,
        user_name: email.split('@')[0]
    }).then(function (response) {
        console.log('Email sent successfully!', response);
    }, function (error) {
        console.log('Email failed to send:', error);
    });

    // Store notification in local storage
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser.notifications) {
        currentUser.notifications = [];
    }
    currentUser.notifications.push({
        type: 'email',
        subject: subject,
        message: message,
        timestamp: new Date().toISOString(),
        email: email,
        status: 'sent'
    });
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}
// Form handlers
function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    if (email && password) {
        const users = JSON.parse(localStorage.getItem('users')) || {};

        if (users[email] && users[email].password === password) {
            const userData = users[email];
            localStorage.setItem('currentUser', JSON.stringify(userData));
            form.reset();
            showPage('dashboard');
            updateDashboardDisplay();
            updateBeneficiarySelect();
            loadRecentTransactions();
            showNotification('Login successful!');
        } else {
            showNotification('Email or password incorrect!', 'error');
        }
    }
}

function handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const fullName = form.querySelector('input[type="text"]').value;
    const email = form.querySelectorAll('input[type="email"]')[0].value;
    const phone = form.querySelector('input[type="tel"]').value;
    const password = form.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = form.querySelectorAll('input[type="password"]')[1].value;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[email]) {
        showNotification('Email already registered!', 'error');
        return;
    }

    if (fullName && email && phone && password) {
        const accountNumber = generateAccountNumber();
        const routingNumber = generateRoutingNumber();

        const userData = {
            fullName,
            email,
            phone,
            password,
            accountNumber,
            routingNumber,
            balance: 0,
            loggedIn: true,
            createdAt: new Date().toISOString(),
            notifications: [],
            transactions: [],
            beneficiaries: [],
            cards: [],
            loans: [],
            investments: []
        };

        users[email] = userData;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(userData));

        sendEmailNotification(
            email,
            'Welcome to Mobile Bank!',
            `Hello ${fullName},\n\nWelcome to Mobile Bank! Your account has been successfully created.\n\nAccount Details:\n- Account Number: ${accountNumber}\n- Routing Number: ${routingNumber}\n\nYou can now start using all our banking services.\n\nThank you,\nMobile Bank Team`
        );

        form.reset();
        showPage('dashboard');
        updateDashboardDisplay();
        updateBeneficiarySelect();
        loadRecentTransactions();
        showNotification(`Account created! Account: ${accountNumber}`);
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    closeMenu();
    showPage('welcome');
    showNotification('Logged out successfully!');
}

function handleAddFunds(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('fundAmount').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    const notifyEmail = document.getElementById('notifyEmail').checked;

    if (amount && paymentMethod) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const previousBalance = currentUser.balance;

        currentUser.balance += amount;

        // Add transaction
        if (!currentUser.transactions) {
            currentUser.transactions = [];
        }
        currentUser.transactions.push({
            id: Date.now(),
            type: 'credit',
            title: 'Funds Added',
            amount: amount,
            date: new Date().toISOString(),
            paymentMethod: paymentMethod
        });

        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        const users = JSON.parse(localStorage.getItem('users')) || {};
        users[currentUser.email] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));

        if (notifyEmail) {
            sendEmailNotification(
                currentUser.email,
                'Funds Added Successfully',
                `Hello ${currentUser.fullName},\n\nFunds have been successfully added to your account.\n\nTransaction Details:\n- Amount Added: $${amount.toFixed(2)}\n- Payment Method: ${paymentMethod.toUpperCase()}\n- Previous Balance: $${previousBalance.toFixed(2)}\n- New Balance: $${currentUser.balance.toFixed(2)}\n- Date & Time: ${new Date().toLocaleString()}\n\nThank you,\nMobile Bank Team`
            );
        }

        updateDashboardDisplay();
        loadRecentTransactions();
        closeAddFundsModal();
        showNotification(`$${amount.toFixed(2)} added to your account successfully!`);
    }
}

function handleTransfer(e) {
    e.preventDefault();
    const form = e.target;
    const amount = parseFloat(form.querySelector('input[type="number"]').value);
    const beneficiarySelect = document.getElementById('beneficiarySelect').value;

    if (amount && beneficiarySelect) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser.balance >= amount) {
            const previousBalance = currentUser.balance;
            currentUser.balance -= amount;

            // Add transaction
            if (!currentUser.transactions) {
                currentUser.transactions = [];
            }

            const beneficiary = currentUser.beneficiaries.find(b => b.id == beneficiarySelect);

            currentUser.transactions.push({
                id: Date.now(),
                type: 'debit',
                title: `Transfer to ${beneficiary.name}`,
                amount: amount,
                date: new Date().toISOString(),
                beneficiary: beneficiary.name
            });

            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            const users = JSON.parse(localStorage.getItem('users')) || {};
            users[currentUser.email] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));

            sendEmailNotification(
                currentUser.email,
                'Transfer Completed',
                `Hello ${currentUser.fullName},\n\nYour transfer has been completed successfully.\n\nTransfer Details:\n- Beneficiary: ${beneficiary.name}\n- Amount: $${amount.toFixed(2)}\n- Account: ****${beneficiary.accountNumber.slice(-4)}\n- Routing: ****${beneficiary.routingNumber.slice(-4)}\n- Previous Balance: $${previousBalance.toFixed(2)}\n- New Balance: $${currentUser.balance.toFixed(2)}\n- Date & Time: ${new Date().toLocaleString()}\n\nThank you,\nMobile Bank Team`
            );

            showNotification(`Transfer of $${amount.toFixed(2)} completed successfully!`);
            form.reset();
            showPage('dashboard');
            updateDashboardDisplay();
            loadRecentTransactions();
        } else {
            showNotification('Insufficient balance!', 'error');
        }
    }
}

function handleAddBeneficiary(e) {
    e.preventDefault();
    const form = e.target;
    const inputs = form.querySelectorAll('input[type="text"]');
    const name = inputs[0].value;
    const accountNumber = inputs[1].value;
    const routingNumber = inputs[2].value;
    const bankName = inputs[3].value;

    if (name && accountNumber && routingNumber && bankName) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser.beneficiaries) {
            currentUser.beneficiaries = [];
        }

        const beneficiary = {
            id: Date.now(),
            name,
            accountNumber,
            routingNumber,
            bankName
        };

        currentUser.beneficiaries.push(beneficiary);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        const users = JSON.parse(localStorage.getItem('users')) || {};
        users[currentUser.email] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));

        // Add to beneficiary list display
        addBeneficiaryToList(beneficiary);

        sendEmailNotification(
            currentUser.email,
            'Beneficiary Added',
            `Hello ${currentUser.fullName},\n\nA new beneficiary has been added to your account.\n\nBeneficiary Details:\n- Name: ${name}\n- Account: ****${accountNumber.slice(-4)}\n- Bank: ${bankName}\n- Date & Time: ${new Date().toLocaleString()}\n\nThank you,\nMobile Bank Team`
        );

        updateBeneficiarySelect();
        form.reset();
        showNotification(`Beneficiary ${name} added successfully!`);
    }
}

function addBeneficiaryToList(beneficiary) {
    const container = document.getElementById('beneficiaryListContainer');

    // Remove the "No beneficiaries" message if it exists
    const emptyMessage = container.querySelector('p');
    if (emptyMessage) {
        emptyMessage.remove();
    }

    const beneficiaryCard = document.createElement('div');
    beneficiaryCard.className = 'beneficiary-card';
    beneficiaryCard.id = `beneficiary-${beneficiary.id}`;
    beneficiaryCard.innerHTML = `
        <div class="beneficiary-info">
            <h4>${beneficiary.name}</h4>
            <p>Account: ****${beneficiary.accountNumber.slice(-4)}</p>
            <p>Bank: ${beneficiary.bankName}</p>
        </div>
        <button class="delete-btn" onclick="deleteBeneficiary(${beneficiary.id})"><i class="fas fa-trash"></i></button>
    `;

    container.appendChild(beneficiaryCard);
}

function deleteBeneficiary(beneficiaryId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (currentUser.beneficiaries) {
        const beneficiary = currentUser.beneficiaries.find(b => b.id === beneficiaryId);
        currentUser.beneficiaries = currentUser.beneficiaries.filter(b => b.id !== beneficiaryId);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        const users = JSON.parse(localStorage.getItem('users')) || {};
        users[currentUser.email] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));

        sendEmailNotification(
            currentUser.email,
            'Beneficiary Removed',
            `Hello ${currentUser.fullName},\n\nA beneficiary has been removed from your account.\n\nBeneficiary Details:\n- Name: ${beneficiary.name}\n- Date & Time: ${new Date().toLocaleString()}\n\nThank you,\nMobile Bank Team`
        );

        const element = document.getElementById(`beneficiary-${beneficiaryId}`);
        if (element) {
            element.remove();
        }

        updateBeneficiarySelect();

        const container = document.getElementById('beneficiaryListContainer');
        if (container.children.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No beneficiaries added yet</p>';
        }

        showNotification('Beneficiary deleted successfully!');
    }
}

function handleAddCard(e) {
    e.preventDefault();
    const form = e.target;
    const inputs = form.querySelectorAll('input[type="text"]');
    const cardNumber = inputs[0].value;
    const expiryDate = inputs[1].value;
    const cardholderName = inputs[2].value;
    const cvv = form.querySelector('input[type="text"]:nth-of-type(3)') ? form.querySelector('input[type="text"]:nth-of-type(3)').value : form.querySelectorAll('input')[3].value;

    if (cardNumber && expiryDate && cardholderName) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser.cards) {
            currentUser.cards = [];
        }

        const card = {
            id: Date.now(),
            cardNumber: cardNumber,
            cardholderName: cardholderName,
            expiryDate: expiryDate
        };

        currentUser.cards.push(card);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        const users = JSON.parse(localStorage.getItem('users')) || {};
        users[currentUser.email] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));

        sendEmailNotification(
            currentUser.email,
            'Card Added to Your Account',
            `Hello ${currentUser.fullName},\n\nA new card has been added to your account.\n\nCard Details:\n- Card Number: ****${cardNumber.slice(-4)}\n- Cardholder: ${cardholderName}\n- Expiry: ${expiryDate}\n- Date Added: ${new Date().toLocaleString()}\n\nThank you,\nMobile Bank Team`
        );

        showNotification(`Card ending in ${cardNumber.slice(-4)} added successfully!`);
        form.reset();
        showPage('dashboard');
    }
}

function handleLoan(e) {
    e.preventDefault();
    const form = e.target;
    const selects = form.querySelectorAll('select');
    const loanType = selects[0].value;
    const inputs = form.querySelectorAll('input[type="number"]');
    const amount = inputs[0].value;
    const duration = selects[1].value;

    if (loanType && amount && duration) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser.loans) {
            currentUser.loans = [];
        }

        const loan = {
            id: Date.now(),
            loanType: loanType,
            amount: amount,
            duration: duration,
            appliedAt: new Date().toISOString(),
            status: 'pending'
        };

        currentUser.loans.push(loan);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        const users = JSON.parse(localStorage.getItem('users')) || {};
        users[currentUser.email] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));

        sendEmailNotification(
            currentUser.email,
            'Loan Application Submitted',
            `Hello ${currentUser.fullName},\n\nYour loan application has been submitted successfully.\n\nLoan Details:\n- Loan Type: ${loanType.toUpperCase()}\n- Amount: $${amount}\n- Duration: ${duration} months\n- Application Date: ${new Date().toLocaleString()}\n\nWe will review your application and get back to you soon.\n\nThank you,\nMobile Bank Team`
        );

        showNotification(`Loan application for $${amount} submitted successfully!`);
        form.reset();
        showPage('dashboard');
    }
}

function selectInvestment(investmentType, investmentName) {
    selectedInvestment = { type: investmentType, name: investmentName };
    document.querySelector('.investment-options').style.display = 'none';
    document.getElementById('investmentForm').style.display = 'block';
    document.getElementById('investmentTitle').textContent = `Invest in ${investmentName}`;
}

function cancelInvestment() {
    selectedInvestment = null;
    document.querySelector('.investment-options').style.display = 'grid';
    document.getElementById('investmentForm').style.display = 'none';
    document.getElementById('investmentForm').reset();
}

function handleInvestment(e) {
    e.preventDefault();
    const form = e.target;
    const amount = parseFloat(form.querySelector('input[type="number"]').value);
    const duration = form.querySelector('select').value;

    if (selectedInvestment && amount && duration) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser.balance >= amount) {
            const previousBalance = currentUser.balance;
            currentUser.balance -= amount;

            if (!currentUser.investments) {
                currentUser.investments = [];
            }

            currentUser.investments.push({
                id: Date.now(),
                type: selectedInvestment.type,
                name: selectedInvestment.name,
                amount: amount,
                duration: duration,
                investedAt: new Date().toISOString()
            });

            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            const users = JSON.parse(localStorage.getItem('users')) || {};
            users[currentUser.email] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));

            currentUser.transactions.push({
                id: Date.now(),
                type: 'debit',
                title: `Investment in ${selectedInvestment.name}`,
                amount: amount,
                date: new Date().toISOString()
            });

            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            users[currentUser.email] = currentUser;
            localStorage.setItem('users', JSON.stringify(users));

            sendEmailNotification(
                currentUser.email,
                'Investment Confirmed',
                `Hello ${currentUser.fullName},\n\nYour investment has been confirmed.\n\nInvestment Details:\n- Type: ${selectedInvestment.name}\n- Amount: $${amount.toFixed(2)}\n- Duration: ${duration} years\n- Previous Balance: $${previousBalance.toFixed(2)}\n- New Balance: $${currentUser.balance.toFixed(2)}\n- Date: ${new Date().toLocaleString()}\n\nThank you for investing with us!\n\nMobile Bank Team`
            );

            showNotification(`Investment of $${amount.toFixed(2)} in ${selectedInvestment.name} confirmed!`);
            form.reset();
            cancelInvestment();
            showPage('dashboard');
            updateDashboardDisplay();
            loadRecentTransactions();
        } else {
            showNotification('Insufficient balance for investment!', 'error');
        }
    }
}

function updateDashboardDisplay() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const userBalance = document.getElementById('userBalance');
        const accountNumberEl = document.getElementById('accountNumber');

        if (userBalance) {
            userBalance.textContent = '$' + (currentUser.balance || 0).toFixed(2);
        }
        if (accountNumberEl) {
            accountNumberEl.textContent = '****' + currentUser.accountNumber.slice(-4);
        }
    }
}

function updateBeneficiarySelect() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const beneficiarySelect = document.getElementById('beneficiarySelect');

    if (beneficiarySelect) {
        beneficiarySelect.innerHTML = '<option value="">Choose a beneficiary</option>';

        if (currentUser && currentUser.beneficiaries && currentUser.beneficiaries.length > 0) {
            currentUser.beneficiaries.forEach(beneficiary => {
                const option = document.createElement('option');
                option.value = beneficiary.id;
                option.textContent = `${beneficiary.name} - ${beneficiary.accountNumber}`;
                beneficiarySelect.appendChild(option);
            });
        }
    }
}

function loadRecentTransactions() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const recentTransactionsEl = document.getElementById('recentTransactions');

    if (!recentTransactionsEl) return;

    recentTransactionsEl.innerHTML = '';

    if (currentUser && currentUser.transactions && currentUser.transactions.length > 0) {
        const recentTx = currentUser.transactions.slice(-5).reverse();

        recentTx.forEach(transaction => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';

            const isCredit = transaction.type === 'credit';
            const iconClass = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';
            const iconColorClass = isCredit ? 'received' : 'sent';

            transactionElement.innerHTML = `
                <div class="transaction-icon ${iconColorClass}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="transaction-details">
                    <p class="transaction-title">${transaction.title}</p>
                    <p class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</p>
                </div>
                <p class="transaction-amount ${isCredit ? 'positive' : 'negative'}">
                    ${isCredit ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </p>
            `;
            recentTransactionsEl.appendChild(transactionElement);
        });
    } else {
        recentTransactionsEl.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No transactions yet</p>';
    }
}

function loadFullTransactionHistory() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const fullTransactionHistoryEl = document.getElementById('fullTransactionHistory');

    if (!fullTransactionHistoryEl) return;

    fullTransactionHistoryEl.innerHTML = '';

    if (currentUser && currentUser.transactions && currentUser.transactions.length > 0) {
        const allTx = currentUser.transactions.slice().reverse();

        allTx.forEach(transaction => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';

            const isCredit = transaction.type === 'credit';
            const iconClass = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';
            const iconColorClass = isCredit ? 'received' : 'sent';

            transactionElement.innerHTML = `
                <div class="transaction-icon ${iconColorClass}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="transaction-details">
                    <p class="transaction-title">${transaction.title}</p>
                    <p class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</p>
                    <p class="transaction-ref">Ref: TXN${transaction.id}</p>
                </div>
                <p class="transaction-amount ${isCredit ? 'positive' : 'negative'}">
                    ${isCredit ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </p>
            `;
            fullTransactionHistoryEl.appendChild(transactionElement);
        });
    } else {
        fullTransactionHistoryEl.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No transactions yet</p>';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 9999;
        animation: slideInNotif 0.3s ease-in-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        max-width: 90%;
        word-wrap: break-word;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutNotif 0.3s ease-in-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function checkLoginStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.email) {
        showPage('dashboard');
        updateDashboardDisplay();
        updateBeneficiarySelect();
        loadRecentTransactions();
    } else {
        showPage('welcome');
    }
}
