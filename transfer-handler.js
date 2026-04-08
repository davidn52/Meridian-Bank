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
    { code: 'SOGEDEFF', name: 'Societe Generale', country: 'FR' },
    { code: 'BNPAFRPP', name: 'BNP Paribas', country: 'FR' },
    { code: 'CRBAXX22', name: 'Credit Agricole', country: 'FR' },
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
    { code: 'MAURITIUSBK', name: 'Mauritius Offshore Bank', country: 'MU' },
];

// Transfer fee rates by type
const transferFeeRates = {
    internal: 0.0,
    local: 0.004,
    international: 0.016,
    offshore: 0.016,
    scheduled: 0.004,
    recurring: 0.004,
};

function initTransferForm() {
    populateTransferAccounts();
    if (typeof populateSavedBeneficiariesSelect === 'function') {
        populateSavedBeneficiariesSelect();
    }

    const transferTypeSelect = $('transferType');
    transferTypeSelect.addEventListener('change', () => updateBankList());

    updateBankList();

    const useSavedCheck = $('useSavedBeneficiary');
    const savedGroup = $('savedBeneficiaryGroup');
    const newGroup = $('newBeneficiaryGroup');
    useSavedCheck.addEventListener('change', (e) => {
        savedGroup.style.display = e.target.checked ? 'block' : 'none';
        newGroup.style.display = e.target.checked ? 'none' : 'block';
    });

    const savedBeneficiarySelect = $('savedBeneficiarySelect');
    if (savedBeneficiarySelect) {
        savedBeneficiarySelect.addEventListener('change', () => {
            if (typeof applyBeneficiaryToTransferForm === 'function') {
                applyBeneficiaryToTransferForm(savedBeneficiarySelect.value);
            }
        });
    }

    const senderAccountSelect = $('senderAccount');
    senderAccountSelect.addEventListener('change', () => updateSenderDetails());

    const amountInput = $('transferAmount');
    const currencySelect = $('transferCurrency');
    amountInput.addEventListener('input', updateFeeCalculation);
    currencySelect.addEventListener('change', updateFeeCalculation);

    const reviewBtn = $('reviewTransferBtn');
    reviewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (validateTransferForm()) {
            showTransferReview();
        }
    });

    const cancelBtn = $('cancelTransferBtn');
    cancelBtn.addEventListener('click', () => showPage('dashboard'));

    const editBtn = $('editTransferBtn');
    editBtn.addEventListener('click', () => {
        $('transferForm').style.display = 'block';
        $('transferReviewSection').style.display = 'none';
    });

    const confirmBtn = $('confirmTransferBtn');
    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executeTransfer();
    });
}

function populateTransferAccounts() {
    if (!app.currentUser) return;

    const senderSelect = $('senderAccount');
    if (!senderSelect) return;

    const accounts = typeof getPrimaryAccounts === 'function'
        ? getPrimaryAccounts(app.currentUser)
        : (app.currentUser.accounts || []);

    senderSelect.innerHTML = '';
    accounts.forEach((account) => {
        const option = document.createElement('option');
        option.value = account.id || account.accountNumber || account.name;
        option.textContent = `${account.name} - ${account.id || account.accountNumber || ''} (Balance: $${(account.balance || 0).toFixed(2)})`;
        senderSelect.appendChild(option);
    });

    if (senderSelect.options.length > 0) {
        senderSelect.value = senderSelect.options[0].value;
    }

    updateSenderDetails();
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

    banks.forEach((bank) => {
        const option = document.createElement('option');
        option.value = bank.code;
        option.textContent = `${bank.name}${bank.country ? ` (${bank.country})` : ''}`;
        bankSelect.appendChild(option);
    });
}

function updateSenderDetails() {
    const senderSelect = $('senderAccount');
    const balanceDisplay = $('senderBalance');
    const currencyDisplay = $('senderCurrency');
    if (!app.currentUser || !senderSelect || !balanceDisplay || !currencyDisplay) return;

    const selectedAccount = senderSelect.value;
    const account = (app.currentUser.accounts || []).find(
        (item) => (item.id || item.accountNumber || item.name) === selectedAccount
    ) || (app.currentUser.accounts && app.currentUser.accounts[0]);

    if (account) {
        balanceDisplay.value = `$${(account.balance || 0).toFixed(2)}`;
        currencyDisplay.value = account.currency || 'USD';
        return;
    }

    balanceDisplay.value = `$${(app.currentUser.checkingBalance || 0).toFixed(2)}`;
    currencyDisplay.value = 'USD';
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

    if (String(app.currentUser?.accountStatus || '').toLowerCase() === 'on hold') {
        showNotification('Account on hold, contact support', 'error');
        return false;
    }

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
    const bankSelect = $('recipientBankName');
    const bankName = bankSelect.options[bankSelect.selectedIndex]?.text || 'Unknown';
    const accountNumber = $('recipientAccountNumber').value;
    const amount = parseFloat($('transferAmount').value) || 0;
    const feeRate = transferFeeRates[transferType] || 0;
    const fee = amount * feeRate;
    const total = amount + fee;
    const reference = $('paymentReference').value || '-';
    const description = $('transferDescription').value || '-';

    const selectedAccount = $('senderAccount').value;
    const senderAccount = (app.currentUser.accounts || []).find(
        (item) => (item.id || item.accountNumber || item.name) === selectedAccount
    ) || { name: selectedAccount };

    $('reviewSender').textContent = `${senderAccount.name || selectedAccount} (${senderAccount.id || senderAccount.accountNumber || ''})` || app.currentUser?.accountNumber || '-';
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

    $('transferForm').style.display = 'none';
    $('transferReviewSection').style.display = 'block';
}

function executeTransfer() {
    if (!app.currentUser) {
        showNotification('No user logged in', 'error');
        return;
    }

    if (String(app.currentUser.accountStatus || '').toLowerCase() === 'on hold') {
        showNotification('Account on hold, contact support', 'error');
        return;
    }

    const amount = parseFloat($('transferAmount').value) || 0;
    const transferType = $('transferType').value;
    const feeRate = transferFeeRates[transferType] || 0;
    const fee = amount * feeRate;
    const total = amount + fee;

    const selectedAccount = $('senderAccount').value;
    const account = (app.currentUser.accounts || []).find(
        (item) => (item.id || item.accountNumber || item.name) === selectedAccount
    ) || null;

    if (!account) {
        if ((app.currentUser.checkingBalance || 0) < total) {
            showNotification('Insufficient funds', 'error');
            return;
        }
        app.currentUser.checkingBalance -= total;
    } else {
        if ((account.balance || 0) < total) {
            showNotification('Insufficient funds in selected account', 'error');
            return;
        }
        account.balance = (account.balance || 0) - total;
        if (account.id === 'checking') app.currentUser.checkingBalance = account.balance;
        if (account.id === 'savings') app.currentUser.savingsBalance = account.balance;
    }

    const transaction = {
        date: new Date().toISOString(),
        type: 'sent',
        amount,
        description: $('recipientName').value || 'Transfer',
        recipient: $('recipientName').value || 'Transfer',
        fee,
    };

    if (!app.currentUser.transactions) app.currentUser.transactions = [];
    app.currentUser.transactions.push(transaction);

    const shouldSaveBeneficiary = $('saveBeneficiary')?.checked;
    if (shouldSaveBeneficiary && typeof saveBeneficiaryRecord === 'function') {
        saveBeneficiaryRecord({
            id: '',
            name: $('recipientName')?.value.trim(),
            bankName: $('recipientBankName')?.options[$('recipientBankName').selectedIndex]?.text || '',
            accountNumber: $('recipientAccountNumber')?.value.trim(),
            swiftCode: $('recipientSwiftCode')?.value.trim(),
            bankAddress: $('recipientBankAddress')?.value.trim(),
            country: $('recipientCountry')?.value || 'US',
            tag: 'recent',
            lastUsedAt: new Date().toISOString(),
        });
    }

    if (typeof persistUserState === 'function') {
        persistUserState(app.currentUser);
    } else {
        saveCurrentUser(app.currentUser);
    }

    showNotification('Transfer executed successfully!', 'success');
    $('transferForm').reset();
    $('transferForm').style.display = 'block';
    $('transferReviewSection').style.display = 'none';
    setTimeout(() => showPage('dashboard'), 2000);
}

function attachTransferFormHandlers() {
    const transferForm = $('transferForm');
    if (transferForm) {
        initTransferForm();
    }
}
