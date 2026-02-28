import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuickActionsWidget } from './QuickActionsWidget';
import { BalanceWidget } from './BalanceWidget';

const DB_KEY = 'finance_db';

async function getBalanceData() {
  try {
    // Get current logged-in user
    const currentUserStr = await AsyncStorage.getItem('current_user');
    if (!currentUserStr) return { accounts: [], totalBalance: 0, creditCardCosts: 0 };
    const currentUser = JSON.parse(currentUserStr);
    const userId = currentUser.userId;

    // Load the database
    const dbString = await AsyncStorage.getItem(DB_KEY);
    if (!dbString) return { accounts: [], totalBalance: 0, creditCardCosts: 0 };
    const db = JSON.parse(dbString);

    // Get ALL accounts (bank + MFS) for this user, excluding credit cards
    const allAccounts = (db.bankAccounts || []).filter(
      (a) => a.userId === userId
    );
    const transactions = db.transactions || [];

    const accounts = allAccounts.map((acc) => {
      const accTransactions = transactions.filter(
        (t) => t.accountId === acc.accountId
      );
      let balance = 0;
      accTransactions.forEach((t) => {
        if (t.type === 'Deposit') {
          balance += parseFloat(t.amount);
        } else {
          balance -= parseFloat(t.amount);
        }
      });
      const type = acc.type || 'bank';
      return { name: acc.bankName, balance, type };
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Calculate credit card costs (total CC spending)
    let creditCardCosts = 0;
    const creditCards = (db.creditCards || []).filter(c => c.userId === userId);
    const cardIds = creditCards.map(c => c.cardId);
    transactions.forEach((t) => {
      if (t.creditCardId && cardIds.includes(t.creditCardId)) {
        creditCardCosts += parseFloat(t.amount);
      }
    });

    return { accounts, totalBalance, creditCardCosts };
  } catch (error) {
    console.error('Widget: Error loading balance data:', error);
    return { accounts: [], totalBalance: 0, creditCardCosts: 0 };
  }
}

export async function widgetTaskHandler(props) {
  const { widgetAction, widgetInfo, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK':
      if (widgetInfo.widgetName === 'QuickActions') {
        renderWidget(<QuickActionsWidget />);
      } else if (widgetInfo.widgetName === 'Balance') {
        const data = await getBalanceData();
        const widgetHeight = widgetInfo.height || 110;
        renderWidget(
          <BalanceWidget
            accounts={data.accounts}
            totalBalance={data.totalBalance}
            creditCardCosts={data.creditCardCosts}
            widgetHeight={widgetHeight}
          />
        );
      }
      break;

    case 'WIDGET_DELETED':
      // Clean up if needed
      break;

    default:
      break;
  }
}
