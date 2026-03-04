// =================== CARD MANAGEMENT HANDLER ===================

app.userCard = null; // stores user's card

function initCardForm() {
    const addCardBtn = $('addCardBtn');
    const cancelAddCardBtn = $('cancelAddCardBtn');
    const confirmAddCardBtn = $('confirmAddCardBtn');
    const addCardForm = $('addCardForm');

    // Load existing card if any
    if (app.currentUser && app.currentUser.card) {
        app.userCard = app.currentUser.card;
        showCardOverview();
    } else {
        showNoCardView();
    }

    // Add Card button
    if (addCardBtn) {
        addCardBtn.addEventListener('click', () => {
            $('noCardView').style.display = 'none';
            $('cardOverviewView').style.display = 'none';
            $('addCardView').style.display = 'block';
        });
    }

    // Cancel Add Card
    if (cancelAddCardBtn) {
        cancelAddCardBtn.addEventListener('click', () => {
            if (app.userCard) {
                showCardOverview();
            } else {
                showNoCardView();
            }
            addCardForm.reset();
        });
    }

    // Confirm Add Card
    if (confirmAddCardBtn && addCardForm) {
        addCardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const cardholderName = $('cardholderName').value.trim();
            const cardType = $('cardType').value;
            const cardNumber = $('cardNumber').value.trim();
            const cardExpiry = $('cardExpiry').value.trim();
            const cardCVV = $('cardCVV').value.trim();
            const billingAddress = $('billingAddress').value.trim();

            if (!cardholderName || !cardType || !cardNumber || !cardExpiry || !cardCVV) {
                showNotification('Please fill all required fields', 'error');
                return;
            }

            // Create card object
            app.userCard = {
                cardholderName,
                cardType,
                cardNumber,
                cardExpiry,
                cardCVV,
                billingAddress,
                status: 'active',
                createdAt: new Date().toISOString(),
                freezeStatus: false,
                onlinePayments: true,
                intlTransactions: true,
                atmWithdrawals: true,
                contactless: true,
                dailySpendingLimit: 5000,
                atmWithdrawalLimit: 1000,
                onlinePurchaseLimit: 2000,
                currency: 'USD',
            };

            // Save to user
            if (app.currentUser) {
                app.currentUser.card = app.userCard;
                saveCurrentUser(app.currentUser);
            }

            showNotification('Card added successfully!', 'success');
            addCardForm.reset();
            showCardOverview();
        });
    }

    // Card Controls
    setupCardControls();

    // Security Features
    setupSecurityFeatures();

    // Card Management
    setupCardManagement();

    // Spending Limits
    setupSpendingLimits();

    // Card Transactions
    loadCardTransactions();
}

function showNoCardView() {
    $('noCardView').style.display = 'block';
    $('addCardView').style.display = 'none';
    $('cardOverviewView').style.display = 'none';
}

function showCardOverview() {
    $('noCardView').style.display = 'none';
    $('addCardView').style.display = 'none';
    $('cardOverviewView').style.display = 'block';

    if (!app.userCard) return;

    // Populate card overview
    $('cardTypeDisplay').textContent = capitalize(app.userCard.cardType) + ' Card';
    $('cardStatusDisplay').textContent = capitalize(app.userCard.status);
    $('cardStatusDisplay').className = `card-status ${app.userCard.status}`;
    
    // Masked number
    const lastFour = app.userCard.cardNumber.slice(-4);
    $('cardNumberDisplay').textContent = `•••• •••• •••• ${lastFour}`;
    
    $('cardNameDisplay').textContent = app.userCard.cardholderName;
    $('cardExpiryDisplay').textContent = app.userCard.cardExpiry;

    // Card details
    $('fullCardNumberInput').value = app.userCard.cardNumber;
    $('cvvDisplay').value = '•••';
    $('expiryDetailsDisplay').textContent = app.userCard.cardExpiry;
    $('billingAddressDisplay').textContent = app.userCard.billingAddress || '—';

    // Load controls state
    $('freezeToggle').checked = app.userCard.freezeStatus || false;
    $('onlinePaymentsToggle').checked = app.userCard.onlinePayments !== false;
    $('intlTransactionsToggle').checked = app.userCard.intlTransactions !== false;
    $('atmWithdrawalsToggle').checked = app.userCard.atmWithdrawals !== false;
    $('contactlessToggle').checked = app.userCard.contactless !== false;

    // Load spending limits
    $('dailySpendingLimit').value = app.userCard.dailySpendingLimit || 5000;
    $('atmWithdrawalLimit').value = app.userCard.atmWithdrawalLimit || 1000;
    $('onlinePurchaseLimit').value = app.userCard.onlinePurchaseLimit || 2000;
    $('cardCurrency').value = app.userCard.currency || 'USD';
}

function setupCardControls() {
    const freezeToggle = $('freezeToggle');
    const onlinePaymentsToggle = $('onlinePaymentsToggle');
    const intlTransactionsToggle = $('intlTransactionsToggle');
    const atmWithdrawalsToggle = $('atmWithdrawalsToggle');
    const contactlessToggle = $('contactlessToggle');

    [freezeToggle, onlinePaymentsToggle, intlTransactionsToggle, atmWithdrawalsToggle, contactlessToggle].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                if (!app.userCard) return;
                if (toggle.id === 'freezeToggle') app.userCard.freezeStatus = e.target.checked;
                if (toggle.id === 'onlinePaymentsToggle') app.userCard.onlinePayments = e.target.checked;
                if (toggle.id === 'intlTransactionsToggle') app.userCard.intlTransactions = e.target.checked;
                if (toggle.id === 'atmWithdrawalsToggle') app.userCard.atmWithdrawals = e.target.checked;
                if (toggle.id === 'contactlessToggle') app.userCard.contactless = e.target.checked;

                if (app.currentUser) {
                    app.currentUser.card = app.userCard;
                    saveCurrentUser(app.currentUser);
                }
                showNotification('Setting updated', 'success');
            });
        }
    });
}

function setupSecurityFeatures() {
    const changeCardPinBtn = $('changeCardPinBtn');
    const revealCardBtn = $('revealCardBtn');
    const copyCardBtn = $('copyCardBtn');

    if (changeCardPinBtn) {
        changeCardPinBtn.addEventListener('click', () => {
            const newPin = prompt('Enter new 4-digit Card PIN:');
            if (newPin && /^\d{4}$/.test(newPin)) {
                if (!app.userCard) app.userCard = {};
                app.userCard.cardPin = newPin;
                if (app.currentUser) {
                    app.currentUser.card = app.userCard;
                    saveCurrentUser(app.currentUser);
                }
                showNotification('Card PIN changed successfully!', 'success');
            } else if (newPin) {
                showNotification('PIN must be 4 digits', 'error');
            }
        });
    }

    if (revealCardBtn) {
        revealCardBtn.addEventListener('click', (e) => {
            const input = $('fullCardNumberInput');
            if (input.type === 'password') {
                input.type = 'text';
                e.target.textContent = 'Hide';
            } else {
                input.type = 'password';
                e.target.textContent = 'Reveal';
            }
        });
    }

    if (copyCardBtn) {
        copyCardBtn.addEventListener('click', () => {
            const input = $('fullCardNumberInput');
            if (input.value) {
                navigator.clipboard.writeText(input.value);
                showNotification('Card number copied', 'success');
            }
        });
    }
}

function setupCardManagement() {
    const orderNewCardBtn = $('orderNewCardBtn');
    const requestReplacementBtn = $('requestReplacementBtn');
    const reportLostStokenBtn = $('reportLostStokenBtn');
    const renameCardBtn = $('renameCardBtn');

    if (orderNewCardBtn) {
        orderNewCardBtn.addEventListener('click', () => {
            showNotification('New card order submitted! You will receive it in 5-7 business days.', 'success');
        });
    }

    if (requestReplacementBtn) {
        requestReplacementBtn.addEventListener('click', () => {
            showNotification('Replacement card request submitted! Expected delivery: 3-5 days.', 'success');
        });
    }

    if (reportLostStokenBtn) {
        reportLostStokenBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to report this card as lost/stolen? This cannot be undone.')) {
                if (app.userCard) {
                    app.userCard.status = 'blocked';
                    if (app.currentUser) {
                        app.currentUser.card = app.userCard;
                        saveCurrentUser(app.currentUser);
                    }
                    showCardOverview();
                    showNotification('Card has been blocked immediately.', 'success');
                }
            }
        });
    }

    if (renameCardBtn) {
        renameCardBtn.addEventListener('click', () => {
            const newName = prompt('Enter new alias for this card:');
            if (newName && newName.trim()) {
                if (!app.userCard) app.userCard = {};
                app.userCard.alias = newName.trim();
                if (app.currentUser) {
                    app.currentUser.card = app.userCard;
                    saveCurrentUser(app.currentUser);
                }
                showNotification('Card renamed successfully!', 'success');
            }
        });
    }
}

function setupSpendingLimits() {
    const saveLimitsBtn = $('saveLimitsBtn');

    if (saveLimitsBtn) {
        saveLimitsBtn.addEventListener('click', () => {
            if (app.userCard) {
                app.userCard.dailySpendingLimit = parseFloat($('dailySpendingLimit').value) || 5000;
                app.userCard.atmWithdrawalLimit = parseFloat($('atmWithdrawalLimit').value) || 1000;
                app.userCard.onlinePurchaseLimit = parseFloat($('onlinePurchaseLimit').value) || 2000;
                app.userCard.currency = $('cardCurrency').value;

                if (app.currentUser) {
                    app.currentUser.card = app.userCard;
                    saveCurrentUser(app.currentUser);
                }
                showNotification('Spending limits updated!', 'success');
            }
        });
    }
}

function loadCardTransactions() {
    const list = $('cardTransactionsList');
    if (!list) return;

    // Simulate card transactions
    if (!app.currentUser || !app.currentUser.cardTransactions) {
        list.innerHTML = '<p class="empty-state">No transactions yet</p>';
        return;
    }

    const txs = app.currentUser.cardTransactions.slice(-5).reverse();
    if (!txs.length) {
        list.innerHTML = '<p class="empty-state">No transactions yet</p>';
        return;
    }

    list.innerHTML = txs.map(t => `
        <div class="transaction-item">
            <div class="description">${t.merchant || 'Purchase'}</div>
            <div class="amount">-$${t.amount.toFixed(2)}</div>
            <small>${new Date(t.date).toLocaleString()}</small>
            <div class="tx-status">${t.status || 'Completed'}</div>
        </div>
    `).join('');
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Attach card form on page load
function attachCardFormHandlers() {
    if ($('cardManagementPage')) {
        initCardForm();
    }
}
