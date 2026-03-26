// =================== TRANSFER FEATURE HANDLER ===================

// Bank lists for transfer form
const usLocalBanks = [
    { code: 'BOFA', name: 'Bank of America' },
    { code: 'WFC', name: 'Wells Fargo' },
    { code: 'JPM', name: 'JPMorgan Chase' },
    { code: 'CITI', name: 'Citibank' },
    { code: 'AMEX', name: 'American Express Bank' },
    { code: 'USBANK', name: 'U.S. Bancorp' },
    { code: 'TD', name: 'TD Bank' },
    { code: 'CAPITAL', name: 'Capital One' },
    { code: 'ALLY', name: 'Ally Bank' },
    { code: 'CHARLES', name: 'Charles Schwab Bank' },
];

const internationalEuroBanks = [
    { code: 'DEUTDEDD', name: 'Deutsche Bank', country: 'DE' },
    { code: 'SOGEDEFF', name: 'Société Générale', country: 'FR' },
    { code: 'BNPAFRPP', name: 'BNP Paribas', country: 'FR' },
    { code: 'CRBAXX22', name: 'Crédit Agricole', country: 'FR' },
    { code: 'DRESDEFF', name: 'Dresdner Bank', country: 'DE' },
    { code: 'COBADEDD', name: 'Commerzbank', country: 'DE' },
    { code: 'BBVAESMM', name: 'BBVA', country: 'ES' },
    { code: 'CAIXESBB', name: 'CaixaBank', country: 'ES' },
    { code: 'UNICRITIT', name: 'Unicredit', country: 'IT' },
    { code: 'BITAITAA', name: 'Intesa Sanpaolo', country: 'IT' },
    { code: 'ABNAID2X', name: 'ABN AMRO', country: 'NL' },
    { code: 'INGDDEDD', name: 'ING Diba', country: 'DE' },
    { code: 'CVUAIT2V', name: 'UniCredit Bank Austria', country: 'AT' },
    { code: 'SBSVBE22', name: 'KBC Bank', country: 'BE' },
    { code: 'UKSW', name: 'HSBC UK', country: 'GB' },
    { code: 'BARCGB22', name: 'Barclays', country: 'GB' },
    { code: 'SBKHCH22', name: 'Swiss National Bank', country: 'CH' },
];

const offshoreBanks = [
    { code: 'JERSEYBANK', name: 'Jersey Bank', country: 'JE' },
    { code: 'GUERNSEYBK', name: 'Guernsey Bank', country: 'GG' },
    { code: 'ISLEMANBK', name: 'Isle of Man Bank', country: 'IM' },
    { code: 'MAURITIUSBK', name: 'Mauritius Offshore Bank', country: 'MU' }
];

// Transfer fee rates by type
const transferFeeRates = {
    internal: 0.0,      // 0%
    local: 0.004,       // 0.4%
    international: 0.016, // 1.6%
    offshore: 0.016,    // 1.6%
    scheduled: 0.004,   // 0.4%
    recurring: 0.004,   // 0.4%
};

// Initialize transfer form
function initTransferForm() {
    // Populate sender account dropdown
    if (app.currentUser) {
        const senderSelect = $('senderAccount');
        senderSelect.innerHTML = '';

        // If user has accounts array, use it; otherwise derive Checking and Savings
        const accounts = app.currentUser.accounts && app.currentUser.accounts.length ? app.currentUser.accounts : [
            {
                id: 'checking',
                name: 'Checking Account',
                balance: typeof app.currentUser.checkingBalance === 'number' ? app.currentUser.checkingBalance : (app.currentUser.balance || 0) / 2,
                currency: 'USD'
            },
            {
                id: 'savings',
                name: 'Savings Account',
                balance: typeof app.currentUser.savingsBalance === 'number' ? app.currentUser.savingsBalance : (app.currentUser.balance || 0) / 2,
                currency: 'USD'
            }
        ];

        // attach to app for later use
        app.currentUser.accounts = accounts;

        accounts.forEach(ac => {
            const opt = document.createElement('option');
            opt.value = ac.id || ac.accountNumber || ac.name;
            opt.textContent = `${ac.name} — ${ac.id || ac.accountNumber || ''} (Balance: $${(ac.balance||0).toFixed(2)})`;
            senderSelect.appendChild(opt);
        });
    }

    // Handle transfer type change
    const transferTypeSelect = $('transferType');
    transferTypeSelect.addEventListener('change', () => updateBankList());

    // Populate initial bank list (local US banks)
    updateBankList();

    // Handle saved beneficiary toggle
    const useSavedCheck = $('useSavedBeneficiary');
    const savedGroup = $('savedBeneficiaryGroup');
    const newGroup = $('newBeneficiaryGroup');
    useSavedCheck.addEventListener('change', (e) => {
        savedGroup.style.display = e.target.checked ? 'block' : 'none';
        newGroup.style.display = e.target.checked ? 'none' : 'block';
    });

    // Populate sender account details on selection change
    const senderAccountSelect = $('senderAccount');
    senderAccountSelect.addEventListener('change', () => updateSenderDetails());

    // Populate transfer amount display
    const amountInput = $('transferAmount');
    const currencySelect = $('transferCurrency');
    amountInput.addEventListener('input', updateFeeCalculation);
    currencySelect.addEventListener('change', updateFeeCalculation);

    // Review Transfer button
    const reviewBtn = $('reviewTransferBtn');
    reviewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (validateTransferForm()) {
            showTransferReview();
        }
    });

    // Cancel button
    const cancelBtn = $('cancelTransferBtn');
    cancelBtn.addEventListener('click', () => showPage('dashboard'));

    // Edit button (back to form)
    const editBtn = $('editTransferBtn');
    editBtn.addEventListener('click', () => {
        $('transferForm').style.display = 'block';
        $('transferReviewSection').style.display = 'none';
    });

    // Confirm transfer
    const confirmBtn = $('confirmTransferBtn');
    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executeTransfer();
    });
}

function updateBankList() {
    const transferType = $('transferType').value;
    const bankSelect = $('recipientBankName');
    bankSelect.innerHTML = '<option value="">-- Select Bank --</option>';

    let banks = [];
    if (transferType === 'international') {
        banks = internationalEuroBanks.concat(offshoreBanks);
    } else if (transferType === 'offshore') {
        banks = offshoreBanks.concat(internationalEuroBanks);
    } else {
        banks = usLocalBanks;
    }

    banks.forEach(bank => {
        const opt = document.createElement('option');
        opt.value = bank.code;
        opt.textContent = `${bank.name}${bank.country ? ` (${bank.country})` : ''}`;
        bankSelect.appendChild(opt);
    });
}

function updateSenderDetails() {
    const senderSelect = $('senderAccount');
    const balanceDisplay = $('senderBalance');
    const currencyDisplay = $('senderCurrency');
    if (!app.currentUser) return;
    const sel = senderSelect.value;
    const account = (app.currentUser.accounts || []).find(a => (a.id||a.accountNumber||a.name) == sel) || (app.currentUser.accounts && app.currentUser.accounts[0]);
    if (account) {
        balanceDisplay.value = `$${(account.balance || 0).toFixed(2)}`;
        currencyDisplay.value = account.currency || 'USD';
    } else {
        balanceDisplay.value = `$${(app.currentUser.balance || 0).toFixed(2)}`;
        currencyDisplay.value = 'USD';
    }
}

function updateFeeCalculation() {
    const amount = parseFloat($('transferAmount').value) || 0;
    const transferType = $('transferType').value || 'local';
    const feeRate = transferFeeRates[transferType] || 0;
    const fee = amount * feeRate;
    const total = amount + fee;

    $('feeAmountDisplay').textContent = `$${amount.toFixed(2)}`;
    $('feeChargeDisplay').textContent = `$${fee.toFixed(2)}`;
    $('feeTotalDisplay').textContent = `$${total.toFixed(2)}`;
}

function validateTransferForm() {
    const recipientName = $('recipientName').value.trim();
    const recipientAccountNumber = $('recipientAccountNumber').value.trim();
    const amount = parseFloat($('transferAmount').value) || 0;
    const pin = $('transactionPin').value.trim();

    if (!recipientName) {
        showNotification('Please enter recipient name', 'error');
        return false;
    }
    if (!recipientAccountNumber) {
        showNotification('Please enter account number / IBAN', 'error');
        return false;
    }
    if (amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return false;
    }
    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
        showNotification('Please enter a valid 4-digit PIN', 'error');
        return false;
    }
    if (app.currentUser && app.currentUser.transactionPin !== pin) {
        showNotification('Incorrect PIN', 'error');
        return false;
    }

    return true;
}

function showTransferReview() {
    const transferType = $('transferType').value;
    const transferTypeLabel = $('transferType').options[$('transferType').selectedIndex]?.text || 'Unknown';
    const recipientName = $('recipientName').value;
    const bankCode = $('recipientBankName').value;
    const bankSelect = $('recipientBankName');
    const bankName = bankSelect.options[bankSelect.selectedIndex]?.text || 'Unknown';
    const accountNumber = $('recipientAccountNumber').value;
    const amount = parseFloat($('transferAmount').value) || 0;
    const feeRate = transferFeeRates[transferType] || 0;
    const fee = amount * feeRate;
    const total = amount + fee;
    const reference = $('paymentReference').value || '—';
    const description = $('transferDescription').value || '—';

    // Populate review card
    const sel = $('senderAccount').value;
    const senderAccount = (app.currentUser.accounts || []).find(a => (a.id||a.accountNumber||a.name) == sel) || { name: sel };
    $('reviewSender').textContent = `${senderAccount.name || sel} (${senderAccount.id || senderAccount.accountNumber || ''})` || app.currentUser?.accountNumber || '—';
    $('reviewType').textContent = transferTypeLabel;
    $('reviewRecipient').textContent = recipientName;
    $('reviewBank').textContent = bankName;
    $('reviewAccount').textContent = accountNumber;
    $('reviewAmount').textContent = `$${amount.toFixed(2)}`;
    $('reviewFeePercent').textContent = `${(feeRate * 100).toFixed(2)}%`;
    $('reviewFeeAmount').textContent = `$${fee.toFixed(2)}`;
    $('reviewTotal').textContent = `$${total.toFixed(2)}`;
    $('reviewReference').textContent = reference;
    $('reviewNotes').textContent = description;

    // Show review, hide form
    $('transferForm').style.display = 'none';
    $('transferReviewSection').style.display = 'block';
}

function executeTransfer() {
    if (!app.currentUser) {
        showNotification('No user logged in', 'error');
        return;
    }

    const amount = parseFloat($('transferAmount').value) || 0;
    const transferType = $('transferType').value;
    const feeRate = transferFeeRates[transferType] || 0;
    const fee = amount * feeRate;
    const total = amount + fee;

    // Determine sending account and check balance
    const sel = $('senderAccount').value;
    const account = (app.currentUser.accounts || []).find(a => (a.id||a.accountNumber||a.name) == sel) || null;
    if (!account) {
        // fallback to main balance
        if (app.currentUser.balance < total) {
            showNotification('Insufficient funds', 'error');
            return;
        }
        app.currentUser.balance -= total;
    } else {
        if ((account.balance || 0) < total) {
            showNotification('Insufficient funds in selected account', 'error');
            return;
        }
        account.balance = (account.balance || 0) - total;
    }
    saveCurrentUser(app.currentUser);

    // Record transaction
    const transaction = {
        date: new Date().toISOString(),
        type: 'sent',
        amount: amount,
        description: $('recipientName').value || 'Transfer',
        fee: fee,
    };
    if (!app.currentUser.transactions) app.currentUser.transactions = [];
    app.currentUser.transactions.push(transaction);
    saveCurrentUser(app.currentUser);

    // Show success and return to dashboard
    showNotification('Transfer executed successfully!', 'success');
    $('transferForm').reset();
    $('transferForm').style.display = 'block';
    $('transferReviewSection').style.display = 'none';
    setTimeout(() => showPage('dashboard'), 2000);
}

// Attach transfer form on page load
function attachTransferFormHandlers() {
    const transferForm = $('transferForm');
    if (transferForm) {
        initTransferForm();
    }
}
