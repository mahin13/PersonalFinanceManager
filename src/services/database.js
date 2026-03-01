import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

const DB_KEY = 'finance_db';
const EXCEL_FILE_PATH = FileSystem.documentDirectory + 'finance_db.xlsx';

// Initialize empty database structure
const getEmptyDatabase = () => ({
  users: [],
  bankAccounts: [],
  transactions: [],
  creditCards: [],
  creditCardBills: [],
  pendingItems: [],
});

// Generate unique ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Load database from storage
export const loadDatabase = async () => {
  try {
    const data = await AsyncStorage.getItem(DB_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return getEmptyDatabase();
  } catch (error) {
    console.error('Error loading database:', error);
    return getEmptyDatabase();
  }
};

// Save database to storage
export const saveDatabase = async (db) => {
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
    await exportToExcel(db);
    return true;
  } catch (error) {
    console.error('Error saving database:', error);
    return false;
  }
};

// Export database to Excel file
export const exportToExcel = async (db) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Users sheet
    const usersSheet = XLSX.utils.json_to_sheet(db.users);
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');

    // BankAccounts sheet
    const bankAccountsSheet = XLSX.utils.json_to_sheet(db.bankAccounts);
    XLSX.utils.book_append_sheet(workbook, bankAccountsSheet, 'BankAccounts');

    // Transactions sheet
    const transactionsSheet = XLSX.utils.json_to_sheet(db.transactions);
    XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

    // CreditCards sheet
    const creditCardsSheet = XLSX.utils.json_to_sheet(db.creditCards);
    XLSX.utils.book_append_sheet(workbook, creditCardsSheet, 'CreditCards');

    // CreditCardBills sheet
    const creditCardBillsSheet = XLSX.utils.json_to_sheet(db.creditCardBills);
    XLSX.utils.book_append_sheet(workbook, creditCardBillsSheet, 'CreditCardBills');

    // PendingItems sheet
    const pendingItemsSheet = XLSX.utils.json_to_sheet(db.pendingItems);
    XLSX.utils.book_append_sheet(workbook, pendingItemsSheet, 'PendingItems');

    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    await FileSystem.writeAsStringAsync(EXCEL_FILE_PATH, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

// ==================== USER OPERATIONS ====================

export const createUser = async (userData) => {
  const db = await loadDatabase();

  // Check if email already exists
  const existingUser = db.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
  if (existingUser) {
    throw new Error('Email already exists');
  }

  const userId = generateId();
  const user = {
    userId,
    name: userData.name,
    email: userData.email,
    birthdate: userData.birthdate,
    password: userData.password,
    hasCreditCards: userData.hasCreditCards || false,
    defaultMonthlyCost: userData.defaultMonthlyCost || null,
    defaultMonthlyDeposit: userData.defaultMonthlyDeposit || null,
    defaultDepositAccount: null,
    defaultCostAccount: null,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);

  // Add MFS accounts if provided
  if (userData.mfsAccounts && userData.mfsAccounts.length > 0) {
    userData.mfsAccounts.forEach(mfsName => {
      db.bankAccounts.push({
        accountId: generateId(),
        userId,
        bankName: mfsName,
        type: 'mfs',
        createdAt: new Date().toISOString(),
      });
    });
  }

  // Add bank accounts
  if (userData.bankAccounts && userData.bankAccounts.length > 0) {
    userData.bankAccounts.forEach(bankName => {
      db.bankAccounts.push({
        accountId: generateId(),
        userId,
        bankName,
        type: 'bank',
        createdAt: new Date().toISOString(),
      });
    });
  }

  // Add credit cards
  if (userData.hasCreditCards && userData.creditCards && userData.creditCards.length > 0) {
    userData.creditCards.forEach(card => {
      db.creditCards.push({
        cardId: generateId(),
        userId,
        bankName: card.bankName,
        billGenerationDay: card.billGenerationDay,
        lastPaymentDay: card.lastPaymentDay,
        createdAt: new Date().toISOString(),
      });
    });
  }

  // Resolve default account names to IDs
  const userAccounts = db.bankAccounts.filter(a => a.userId === userId);
  if (userData.defaultDepositAccountName) {
    const depAcc = userAccounts.find(a => a.bankName.toLowerCase() === userData.defaultDepositAccountName.toLowerCase());
    if (depAcc) {
      const userIdx = db.users.findIndex(u => u.userId === userId);
      db.users[userIdx].defaultDepositAccount = depAcc.accountId;
    }
  }
  if (userData.defaultCostAccountName) {
    const costAcc = userAccounts.find(a => a.bankName.toLowerCase() === userData.defaultCostAccountName.toLowerCase());
    if (costAcc) {
      const userIdx = db.users.findIndex(u => u.userId === userId);
      db.users[userIdx].defaultCostAccount = costAcc.accountId;
    }
  }

  await saveDatabase(db);
  return { userId, ...db.users.find(u => u.userId === userId) };
};

export const loginUser = async (email, password) => {
  const db = await loadDatabase();
  const user = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    throw new Error('Invalid email or password');
  }

  return user;
};

export const getUserByEmail = async (email) => {
  const db = await loadDatabase();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

export const updateUserPassword = async (userId, newPassword) => {
  const db = await loadDatabase();
  const userIndex = db.users.findIndex(u => u.userId === userId);

  if (userIndex === -1) {
    throw new Error('User not found');
  }

  db.users[userIndex].password = newPassword;
  db.users[userIndex].tempPassword = null;
  await saveDatabase(db);
  return true;
};

export const setTempPassword = async (email) => {
  const db = await loadDatabase();
  const userIndex = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIndex === -1) {
    throw new Error('Email not found');
  }

  const tempPassword = Math.random().toString(36).substring(2, 10);
  db.users[userIndex].tempPassword = tempPassword;
  db.users[userIndex].password = tempPassword;
  await saveDatabase(db);
  return tempPassword;
};

// ==================== BANK ACCOUNT OPERATIONS ====================

export const getBankAccounts = async (userId) => {
  const db = await loadDatabase();
  return db.bankAccounts.filter(a => a.userId === userId);
};

export const addBankAccount = async (userId, bankName, type = 'bank') => {
  const db = await loadDatabase();
  const account = {
    accountId: generateId(),
    userId,
    bankName,
    type,
    createdAt: new Date().toISOString(),
  };
  db.bankAccounts.push(account);
  await saveDatabase(db);
  return account;
};

export const getAccountBalance = async (accountId) => {
  const db = await loadDatabase();
  const transactions = db.transactions.filter(t => t.accountId === accountId);

  let balance = 0;
  transactions.forEach(t => {
    if (t.type === 'Deposit') {
      balance += parseFloat(t.amount);
    } else {
      balance -= parseFloat(t.amount);
    }
  });

  return balance;
};

export const getAllBalances = async (userId) => {
  const db = await loadDatabase();
  const accounts = db.bankAccounts.filter(a => a.userId === userId);
  const balances = {};

  for (const account of accounts) {
    const transactions = db.transactions.filter(t => t.accountId === account.accountId);
    let balance = 0;
    transactions.forEach(t => {
      if (t.type === 'Deposit') {
        balance += parseFloat(t.amount);
      } else {
        balance -= parseFloat(t.amount);
      }
    });
    balances[account.accountId] = {
      bankName: account.bankName,
      type: account.type || 'bank',
      balance,
    };
  }

  return balances;
};

// ==================== TRANSACTION OPERATIONS ====================

export const addTransaction = async (transactionData) => {
  const db = await loadDatabase();
  const transaction = {
    transactionId: generateId(),
    userId: transactionData.userId,
    accountId: transactionData.accountId || '',
    creditCardId: transactionData.creditCardId || '',
    type: transactionData.type,
    amount: transactionData.amount,
    reason: transactionData.reason || '',
    date: transactionData.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(transaction);
  await saveDatabase(db);
  return transaction;
};

export const bulkAddTransactions = async (transactions) => {
  const db = await loadDatabase();
  transactions.forEach(t => {
    db.transactions.push({
      transactionId: generateId(),
      userId: t.userId,
      accountId: t.accountId || '',
      creditCardId: t.creditCardId || '',
      type: t.type,
      amount: t.amount,
      reason: t.reason || '',
      date: t.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  });
  await saveDatabase(db);
  return transactions.length;
};

export const getTransactions = async (userId, filter = 'all') => {
  const db = await loadDatabase();
  let transactions = db.transactions.filter(t => t.userId === userId);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'daily') {
    transactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= today;
    });
  } else if (filter === 'monthly') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    transactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startOfMonth;
    });
  } else if (filter === 'yearly') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    transactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startOfYear;
    });
  }

  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const getTransactionSummary = async (userId, filter = 'all') => {
  const transactions = await getTransactions(userId, filter);

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalCreditCardCosts = 0;

  transactions.forEach(t => {
    if (t.type === 'Deposit') {
      totalDeposits += parseFloat(t.amount);
    } else if (t.creditCardId) {
      totalCreditCardCosts += parseFloat(t.amount);
    } else {
      totalWithdrawals += parseFloat(t.amount);
    }
  });

  return {
    totalDeposits,
    totalWithdrawals,
    totalCreditCardCosts,
    netBalance: totalDeposits - totalWithdrawals - totalCreditCardCosts,
    transactionCount: transactions.length,
  };
};

export const editTransaction = async (transactionId, updates) => {
  const db = await loadDatabase();
  const index = db.transactions.findIndex(t => t.transactionId === transactionId);

  if (index === -1) {
    throw new Error('Transaction not found');
  }

  db.transactions[index] = {
    ...db.transactions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveDatabase(db);
  return db.transactions[index];
};

export const deleteTransaction = async (transactionId) => {
  const db = await loadDatabase();
  db.transactions = db.transactions.filter(t => t.transactionId !== transactionId);
  await saveDatabase(db);
  return true;
};

// ==================== CREDIT CARD OPERATIONS ====================

export const getCreditCards = async (userId) => {
  const db = await loadDatabase();
  return db.creditCards.filter(c => c.userId === userId);
};

export const getCreditCardTransactions = async (cardId) => {
  const db = await loadDatabase();
  return db.transactions
    .filter(t => t.creditCardId === cardId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const addCreditCard = async (cardData) => {
  const db = await loadDatabase();
  const card = {
    cardId: generateId(),
    userId: cardData.userId,
    bankName: cardData.bankName,
    billGenerationDay: cardData.billGenerationDay,
    lastPaymentDay: cardData.lastPaymentDay,
    createdAt: new Date().toISOString(),
  };
  db.creditCards.push(card);
  await saveDatabase(db);
  return card;
};

export const getCreditCardBills = async (userId) => {
  const db = await loadDatabase();
  const cards = db.creditCards.filter(c => c.userId === userId);
  const cardIds = cards.map(c => c.cardId);
  return db.creditCardBills.filter(b => cardIds.includes(b.cardId));
};

export const getPendingCreditCardBills = async (userId) => {
  const bills = await getCreditCardBills(userId);
  return bills.filter(b => b.status === 'Pending' || b.status === 'Overdue');
};

export const addCreditCardBill = async (billData) => {
  const db = await loadDatabase();
  const bill = {
    billId: generateId(),
    cardId: billData.cardId,
    billMonth: billData.billMonth,
    billAmount: billData.billAmount,
    minimumDue: billData.minimumDue || null,
    paidAmount: 0,
    partialPayments: [],
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  db.creditCardBills.push(bill);
  await saveDatabase(db);
  return bill;
};

export const updateCreditCardBillStatus = async (billId, status) => {
  const db = await loadDatabase();
  const billIndex = db.creditCardBills.findIndex(b => b.billId === billId);

  if (billIndex === -1) {
    throw new Error('Bill not found');
  }

  db.creditCardBills[billIndex].status = status;
  db.creditCardBills[billIndex].updatedAt = new Date().toISOString();
  await saveDatabase(db);
  return db.creditCardBills[billIndex];
};

export const editCreditCardBill = async (billId, updates) => {
  const db = await loadDatabase();
  const billIndex = db.creditCardBills.findIndex(b => b.billId === billId);

  if (billIndex === -1) {
    throw new Error('Bill not found');
  }

  db.creditCardBills[billIndex] = {
    ...db.creditCardBills[billIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveDatabase(db);
  return db.creditCardBills[billIndex];
};

export const checkAndUpdateOverdueBills = async (userId) => {
  const db = await loadDatabase();
  const cards = db.creditCards.filter(c => c.userId === userId);
  const now = new Date();
  const currentDay = now.getDate();

  cards.forEach(card => {
    const pendingBills = db.creditCardBills.filter(
      b => b.cardId === card.cardId && b.status === 'Pending'
    );

    pendingBills.forEach(bill => {
      if (currentDay > card.lastPaymentDay) {
        const billIndex = db.creditCardBills.findIndex(b => b.billId === bill.billId);
        if (billIndex !== -1) {
          db.creditCardBills[billIndex].status = 'Overdue';
        }
      }
    });
  });

  await saveDatabase(db);
};

export const payBillWithCost = async (billId, accountId, userId) => {
  const db = await loadDatabase();
  const billIndex = db.creditCardBills.findIndex(b => b.billId === billId);

  if (billIndex === -1) {
    throw new Error('Bill not found');
  }

  const bill = db.creditCardBills[billIndex];
  const card = db.creditCards.find(c => c.cardId === bill.cardId);
  const cardName = card ? card.bankName : 'Unknown';

  // Create withdrawal transaction
  const transaction = {
    transactionId: generateId(),
    userId,
    accountId,
    type: 'Withdrawal',
    amount: parseFloat(bill.billAmount),
    reason: `Credit Card Bill Payment - ${cardName} (${bill.billMonth})`,
    creditCardBillId: billId,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(transaction);

  // Mark bill as paid
  db.creditCardBills[billIndex].status = 'Paid';
  db.creditCardBills[billIndex].paidAmount = parseFloat(bill.billAmount);
  db.creditCardBills[billIndex].updatedAt = new Date().toISOString();

  await saveDatabase(db);
  return { transaction, bill: db.creditCardBills[billIndex] };
};

export const makePartialPayment = async (billId, paymentAmount, accountId, userId, deductFromBill) => {
  const db = await loadDatabase();
  const billIndex = db.creditCardBills.findIndex(b => b.billId === billId);

  if (billIndex === -1) {
    throw new Error('Bill not found');
  }

  const bill = db.creditCardBills[billIndex];
  const card = db.creditCards.find(c => c.cardId === bill.cardId);
  const cardName = card ? card.bankName : 'Unknown';

  // Create withdrawal transaction
  const transaction = {
    transactionId: generateId(),
    userId,
    accountId,
    type: 'Withdrawal',
    amount: paymentAmount,
    reason: `Partial CC Payment - ${cardName} (${bill.billMonth})`,
    creditCardBillId: billId,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(transaction);

  // Record partial payment
  if (!db.creditCardBills[billIndex].partialPayments) {
    db.creditCardBills[billIndex].partialPayments = [];
  }
  db.creditCardBills[billIndex].partialPayments.push({
    amount: paymentAmount,
    accountId,
    date: new Date().toISOString(),
    deductedFromBill: deductFromBill,
  });

  // If deducting from bill, update paid amount
  if (deductFromBill) {
    const currentPaid = db.creditCardBills[billIndex].paidAmount || 0;
    db.creditCardBills[billIndex].paidAmount = currentPaid + paymentAmount;

    // Auto-mark as paid if fully paid
    if (db.creditCardBills[billIndex].paidAmount >= parseFloat(bill.billAmount)) {
      db.creditCardBills[billIndex].status = 'Paid';
    }
  }

  db.creditCardBills[billIndex].updatedAt = new Date().toISOString();

  await saveDatabase(db);
  return { transaction, bill: db.creditCardBills[billIndex] };
};

// Mark a CC transaction as bill-paid (deduct from pending bill)
export const markTransactionBillPaid = async (transactionId, billId) => {
  const db = await loadDatabase();
  const txnIndex = db.transactions.findIndex(t => t.transactionId === transactionId);
  if (txnIndex === -1) throw new Error('Transaction not found');

  const billIndex = db.creditCardBills.findIndex(b => b.billId === billId);
  if (billIndex === -1) throw new Error('Bill not found');

  const txn = db.transactions[txnIndex];
  const bill = db.creditCardBills[billIndex];

  // Mark transaction as bill-paid
  db.transactions[txnIndex].billPaid = true;
  db.transactions[txnIndex].billPaidBillId = billId;
  db.transactions[txnIndex].updatedAt = new Date().toISOString();

  // Deduct from bill's paid amount
  const currentPaid = bill.paidAmount || 0;
  db.creditCardBills[billIndex].paidAmount = currentPaid + parseFloat(txn.amount);

  // Auto-mark as paid if fully paid
  if (db.creditCardBills[billIndex].paidAmount >= parseFloat(bill.billAmount)) {
    db.creditCardBills[billIndex].status = 'Paid';
  }

  db.creditCardBills[billIndex].updatedAt = new Date().toISOString();

  await saveDatabase(db);
  return { transaction: db.transactions[txnIndex], bill: db.creditCardBills[billIndex] };
};

// Pay a CC transaction from a specific bank account
export const payTransactionFromAccount = async (transactionId, billId, accountId, userId) => {
  const db = await loadDatabase();
  const txnIndex = db.transactions.findIndex(t => t.transactionId === transactionId);
  if (txnIndex === -1) throw new Error('Transaction not found');

  const billIndex = db.creditCardBills.findIndex(b => b.billId === billId);
  if (billIndex === -1) throw new Error('Bill not found');

  const txn = db.transactions[txnIndex];
  const bill = db.creditCardBills[billIndex];
  const account = db.bankAccounts.find(a => a.accountId === accountId);
  const accountName = account ? account.bankName : 'Unknown';

  // Create withdrawal transaction on the selected bank account
  const withdrawalTxn = {
    transactionId: generateId(),
    userId,
    accountId,
    type: 'Withdrawal',
    amount: parseFloat(txn.amount),
    reason: `CC Payment: ${txn.reason || 'Credit Card Transaction'}`,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.transactions.push(withdrawalTxn);

  // Mark CC transaction as billPaid
  db.transactions[txnIndex].billPaid = true;
  db.transactions[txnIndex].paidFromAccount = accountId;
  db.transactions[txnIndex].updatedAt = new Date().toISOString();

  // Update bill's paidAmount
  const currentPaid = bill.paidAmount || 0;
  db.creditCardBills[billIndex].paidAmount = currentPaid + parseFloat(txn.amount);

  // Auto-mark bill as Paid if fully covered
  if (db.creditCardBills[billIndex].paidAmount >= parseFloat(bill.billAmount)) {
    db.creditCardBills[billIndex].status = 'Paid';
  }

  db.creditCardBills[billIndex].updatedAt = new Date().toISOString();

  await saveDatabase(db);
  return { transaction: db.transactions[txnIndex], bill: db.creditCardBills[billIndex], withdrawal: withdrawalTxn };
};

// ==================== PENDING ITEMS OPERATIONS ====================

export const getPendingItems = async (userId) => {
  const db = await loadDatabase();
  return db.pendingItems.filter(p => p.userId === userId);
};

export const getActivePendingItems = async (userId) => {
  const items = await getPendingItems(userId);
  return items.filter(p => p.status === 'Pending' || p.status === 'Overdue');
};

export const addPendingItem = async (itemData) => {
  const db = await loadDatabase();
  const item = {
    pendingId: generateId(),
    userId: itemData.userId,
    title: itemData.title,
    amount: itemData.amount,
    dueDate: itemData.dueDate,
    description: itemData.description || '',
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  db.pendingItems.push(item);
  await saveDatabase(db);
  return item;
};

export const updatePendingItemStatus = async (pendingId, status) => {
  const db = await loadDatabase();
  const itemIndex = db.pendingItems.findIndex(p => p.pendingId === pendingId);

  if (itemIndex === -1) {
    throw new Error('Pending item not found');
  }

  db.pendingItems[itemIndex].status = status;
  db.pendingItems[itemIndex].updatedAt = new Date().toISOString();
  await saveDatabase(db);
  return db.pendingItems[itemIndex];
};

export const editPendingItem = async (pendingId, updates) => {
  const db = await loadDatabase();
  const itemIndex = db.pendingItems.findIndex(p => p.pendingId === pendingId);

  if (itemIndex === -1) {
    throw new Error('Pending item not found');
  }

  db.pendingItems[itemIndex] = {
    ...db.pendingItems[itemIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveDatabase(db);
  return db.pendingItems[itemIndex];
};

export const checkAndUpdateOverduePendingItems = async (userId) => {
  const db = await loadDatabase();
  const now = new Date();

  db.pendingItems.forEach((item, index) => {
    if (item.userId === userId && item.status === 'Pending') {
      const dueDate = new Date(item.dueDate);
      if (now > dueDate) {
        db.pendingItems[index].status = 'Overdue';
      }
    }
  });

  await saveDatabase(db);
};

// ==================== NOTIFICATION HELPERS ====================

export const getNotifications = async (userId) => {
  const notifications = [];
  const now = new Date();
  const currentDay = now.getDate();

  // Check credit card bills
  const db = await loadDatabase();
  const cards = db.creditCards.filter(c => c.userId === userId);

  cards.forEach(card => {
    // Check if today is bill generation day
    if (currentDay === card.billGenerationDay) {
      notifications.push({
        type: 'bill_generation',
        title: 'Bill Generated',
        message: `Please enter bill amount for ${card.bankName} credit card`,
        cardId: card.cardId,
        priority: 'high',
      });
    }

    // Check pending bills
    const pendingBills = db.creditCardBills.filter(
      b => b.cardId === card.cardId && (b.status === 'Pending' || b.status === 'Overdue')
    );

    pendingBills.forEach(bill => {
      if (bill.status === 'Overdue') {
        notifications.push({
          type: 'bill_overdue',
          title: 'Bill Overdue!',
          message: `${card.bankName} credit card bill of ${bill.billAmount} BDT is overdue!`,
          billId: bill.billId,
          priority: 'urgent',
        });
      } else if (bill.status === 'Pending') {
        const daysLeft = card.lastPaymentDay - currentDay;
        notifications.push({
          type: 'bill_pending',
          title: 'Bill Payment Pending',
          message: `${card.bankName} credit card bill of ${bill.billAmount} BDT is due${daysLeft > 0 ? ` in ${daysLeft} days` : ' today'}`,
          billId: bill.billId,
          priority: daysLeft <= 3 ? 'high' : 'medium',
        });
      }
    });
  });

  // Check pending items
  const pendingItems = db.pendingItems.filter(
    p => p.userId === userId && (p.status === 'Pending' || p.status === 'Overdue')
  );

  pendingItems.forEach(item => {
    const dueDate = new Date(item.dueDate);
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (item.status === 'Overdue' || diffDays < 0) {
      notifications.push({
        type: 'pending_overdue',
        title: 'Payment Overdue!',
        message: `"${item.title}" - ${item.amount} BDT is overdue!`,
        pendingId: item.pendingId,
        priority: 'urgent',
      });
    } else {
      notifications.push({
        type: 'pending_reminder',
        title: 'Payment Reminder',
        message: `"${item.title}" - ${item.amount} BDT is due${diffDays === 0 ? ' today' : ` in ${diffDays} days`}`,
        pendingId: item.pendingId,
        priority: diffDays <= 3 ? 'high' : 'medium',
      });
    }
  });

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return notifications;
};

export const deletePendingItem = async (pendingId) => {
  const db = await loadDatabase();
  db.pendingItems = db.pendingItems.filter(p => p.pendingId !== pendingId);
  await saveDatabase(db);
  return true;
};

export const deleteCreditCardBill = async (billId) => {
  const db = await loadDatabase();
  db.creditCardBills = db.creditCardBills.filter(b => b.billId !== billId);
  await saveDatabase(db);
  return true;
};

// ==================== PROFILE OPERATIONS ====================

export const getUserProfile = async (userId) => {
  const db = await loadDatabase();
  return db.users.find(u => u.userId === userId);
};

export const updateUserProfile = async (userId, updates) => {
  const db = await loadDatabase();
  const userIndex = db.users.findIndex(u => u.userId === userId);

  if (userIndex === -1) {
    throw new Error('User not found');
  }

  db.users[userIndex] = {
    ...db.users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveDatabase(db);
  return db.users[userIndex];
};

export const deleteBankAccount = async (accountId) => {
  const db = await loadDatabase();

  // Delete related transactions
  db.transactions = db.transactions.filter(t => t.accountId !== accountId);

  // Delete the bank account
  db.bankAccounts = db.bankAccounts.filter(a => a.accountId !== accountId);

  await saveDatabase(db);
  return true;
};

export const deleteCreditCard = async (cardId) => {
  const db = await loadDatabase();

  // Delete related transactions
  db.transactions = db.transactions.filter(t => t.creditCardId !== cardId);

  // Delete related bills
  db.creditCardBills = db.creditCardBills.filter(b => b.cardId !== cardId);

  // Delete the credit card
  db.creditCards = db.creditCards.filter(c => c.cardId !== cardId);

  await saveDatabase(db);
  return true;
};

// ==================== EXPORT OPERATIONS ====================

export const exportTransactionsToExcel = async (userId, filter = 'all') => {
  try {
    const transactions = await getTransactions(userId, filter);
    const db = await loadDatabase();
    const accounts = db.bankAccounts.filter(a => a.userId === userId);
    const accountMap = {};
    accounts.forEach(a => { accountMap[a.accountId] = a.bankName; });

    const exportData = transactions.map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      Type: t.type,
      Amount: t.amount,
      Reason: t.reason || '',
      Account: accountMap[t.accountId] || 'N/A',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const filterLabel = filter === 'daily' ? 'Today' : filter === 'monthly' ? 'This Month' : filter === 'yearly' ? 'This Year' : 'All Time';
    XLSX.utils.book_append_sheet(workbook, worksheet, filterLabel);

    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const fileName = `transactions_${filter}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(filePath, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { filePath, fileName, count: exportData.length };
  } catch (error) {
    console.error('Error exporting transactions:', error);
    throw error;
  }
};

// ==================== REMEMBER ME OPERATIONS ====================

const REMEMBER_ME_KEY = 'remember_me_credentials';

export const saveRememberMe = async (email, password) => {
  try {
    // Store credentials securely (in production, use expo-secure-store)
    await AsyncStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ email, password }));
    return true;
  } catch (error) {
    console.error('Error saving remember me:', error);
    return false;
  }
};

export const getRememberMe = async () => {
  try {
    const data = await AsyncStorage.getItem(REMEMBER_ME_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting remember me:', error);
    return null;
  }
};

export const clearRememberMe = async () => {
  try {
    await AsyncStorage.removeItem(REMEMBER_ME_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing remember me:', error);
    return false;
  }
};
