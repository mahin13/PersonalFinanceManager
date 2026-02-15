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
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);

  // Add bank accounts
  if (userData.bankAccounts && userData.bankAccounts.length > 0) {
    userData.bankAccounts.forEach(bankName => {
      db.bankAccounts.push({
        accountId: generateId(),
        userId,
        bankName,
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

  await saveDatabase(db);
  return { userId, ...user };
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

export const addBankAccount = async (userId, bankName) => {
  const db = await loadDatabase();
  const account = {
    accountId: generateId(),
    userId,
    bankName,
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
    accountId: transactionData.accountId,
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

  transactions.forEach(t => {
    if (t.type === 'Deposit') {
      totalDeposits += parseFloat(t.amount);
    } else {
      totalWithdrawals += parseFloat(t.amount);
    }
  });

  return {
    totalDeposits,
    totalWithdrawals,
    netBalance: totalDeposits - totalWithdrawals,
    transactionCount: transactions.length,
  };
};

// ==================== CREDIT CARD OPERATIONS ====================

export const getCreditCards = async (userId) => {
  const db = await loadDatabase();
  return db.creditCards.filter(c => c.userId === userId);
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
