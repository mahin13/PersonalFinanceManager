import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getCreditCards, getCreditCardBills, getActivePendingItems } from './database';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bill-reminders', {
        name: 'Bill Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E88E5',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('payment-reminders', {
        name: 'Payment Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9800',
        sound: 'default',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Schedule notifications for credit card bills
export const scheduleBillReminders = async (userId) => {
  try {
    // Cancel all existing scheduled notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    const cards = await getCreditCards(userId);
    const bills = await getCreditCardBills(userId);
    const pendingItems = await getActivePendingItems(userId);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Schedule reminders for each credit card's payment due date
    for (const card of cards) {
      const pendingBills = bills.filter(
        (b) => b.cardId === card.cardId && (b.status === 'Pending' || b.status === 'Overdue')
      );

      if (pendingBills.length === 0) continue;

      const totalPending = pendingBills.reduce(
        (sum, b) => sum + parseFloat(b.billAmount),
        0
      );

      const paymentDay = card.lastPaymentDay;

      // Reminder 3 days before due date
      const reminderDate3 = new Date(currentYear, currentMonth, paymentDay - 3, 9, 0, 0);
      if (reminderDate3 > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Credit Card Bill Due Soon - ${card.bankName}`,
            body: `Your ${card.bankName} credit card bill of ${totalPending.toLocaleString()} BDT is due in 3 days!`,
            data: { type: 'bill_reminder', cardId: card.cardId },
            sound: 'default',
          },
          trigger: {
            date: reminderDate3,
            channelId: 'bill-reminders',
          },
        });
      }

      // Reminder 1 day before due date
      const reminderDate1 = new Date(currentYear, currentMonth, paymentDay - 1, 9, 0, 0);
      if (reminderDate1 > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Bill Due Tomorrow! - ${card.bankName}`,
            body: `Your ${card.bankName} credit card bill of ${totalPending.toLocaleString()} BDT is due tomorrow!`,
            data: { type: 'bill_urgent', cardId: card.cardId },
            sound: 'default',
          },
          trigger: {
            date: reminderDate1,
            channelId: 'bill-reminders',
          },
        });
      }

      // Reminder on due date
      const reminderDateDue = new Date(currentYear, currentMonth, paymentDay, 8, 0, 0);
      if (reminderDateDue > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Bill Due Today! - ${card.bankName}`,
            body: `Your ${card.bankName} credit card bill of ${totalPending.toLocaleString()} BDT is due TODAY! Pay now to avoid late fees.`,
            data: { type: 'bill_due_today', cardId: card.cardId },
            sound: 'default',
          },
          trigger: {
            date: reminderDateDue,
            channelId: 'bill-reminders',
          },
        });
      }
    }

    // Schedule reminders for pending items
    for (const item of pendingItems) {
      const dueDate = new Date(item.dueDate);
      const diffTime = dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Reminder 1 day before
      if (diffDays > 1) {
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - 1);
        reminderDate.setHours(9, 0, 0, 0);

        if (reminderDate > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Payment Due Tomorrow - ${item.title}`,
              body: `"${item.title}" payment of ${parseFloat(item.amount).toLocaleString()} BDT is due tomorrow!`,
              data: { type: 'pending_reminder', pendingId: item.pendingId },
              sound: 'default',
            },
            trigger: {
              date: reminderDate,
              channelId: 'payment-reminders',
            },
          });
        }
      }

      // Reminder on due date
      if (diffDays >= 0) {
        const reminderDate = new Date(dueDate);
        reminderDate.setHours(8, 0, 0, 0);

        if (reminderDate > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Payment Due Today! - ${item.title}`,
              body: `"${item.title}" payment of ${parseFloat(item.amount).toLocaleString()} BDT is due today!`,
              data: { type: 'pending_due_today', pendingId: item.pendingId },
              sound: 'default',
            },
            trigger: {
              date: reminderDate,
              channelId: 'payment-reminders',
            },
          });
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error scheduling bill reminders:', error);
    return false;
  }
};
