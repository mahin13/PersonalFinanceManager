import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import FinancialInsights from '../components/FinancialInsights';
import {
  getAllBalances,
  getTransactionSummary,
  getNotifications,
  getPendingCreditCardBills,
  getActivePendingItems,
  checkAndUpdateOverdueBills,
  checkAndUpdateOverduePendingItems,
} from '../services/database';

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState('monthly');
  const [balances, setBalances] = useState({});
  const [summary, setSummary] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    netBalance: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      // Update overdue statuses
      await checkAndUpdateOverdueBills(user.userId);
      await checkAndUpdateOverduePendingItems(user.userId);

      // Load all data
      const [balancesData, summaryData, notificationsData, billsData, itemsData] =
        await Promise.all([
          getAllBalances(user.userId),
          getTransactionSummary(user.userId, filter),
          getNotifications(user.userId),
          getPendingCreditCardBills(user.userId),
          getActivePendingItems(user.userId),
        ]);

      setBalances(balancesData);
      setSummary(summaryData);
      setNotifications(notificationsData);
      setPendingBills(billsData);
      setPendingItems(itemsData);

      // Show notifications modal if there are urgent notifications
      const urgentNotifications = notificationsData.filter(
        (n) => n.priority === 'urgent' || n.priority === 'high'
      );
      if (urgentNotifications.length > 0) {
        setShowNotifications(true);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user, filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getTotalBalance = () => {
    return Object.values(balances).reduce((total, acc) => total + acc.balance, 0);
  };

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString()} BDT`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const NotificationModal = () => (
    <Modal
      visible={showNotifications}
      transparent
      animationType="slide"
      onRequestClose={() => setShowNotifications(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Notifications</Text>
          <ScrollView style={styles.notificationList}>
            {notifications.map((notification, index) => (
              <View
                key={index}
                style={[
                  styles.notificationItem,
                  notification.priority === 'urgent' && styles.notificationUrgent,
                  notification.priority === 'high' && styles.notificationHigh,
                ]}
              >
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowNotifications(false)}
          >
            <Text style={styles.modalButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setShowNotifications(true)}
          >
            <Text style={styles.notificationIcon}>
              {notifications.length > 0 ? `(${notifications.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Total Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(getTotalBalance())}</Text>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            {['daily', 'monthly', 'yearly'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === f && styles.filterButtonTextActive,
                  ]}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.depositCard]}>
            <Text style={styles.summaryLabel}>Total Deposits</Text>
            <Text style={styles.summaryAmount}>+{formatCurrency(summary.totalDeposits)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.withdrawalCard]}>
            <Text style={styles.summaryLabel}>Total Withdrawals</Text>
            <Text style={styles.summaryAmount}>-{formatCurrency(summary.totalWithdrawals)}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.depositButton]}
            onPress={() => navigation.navigate('Deposit')}
          >
            <Text style={styles.actionButtonText}>+ Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.costButton]}
            onPress={() => navigation.navigate('Withdrawal')}
          >
            <Text style={styles.actionButtonText}>- Cost</Text>
          </TouchableOpacity>
        </View>

        {/* Account Balances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Balances</Text>
          {Object.entries(balances).map(([accountId, account]) => (
            <View key={accountId} style={styles.accountItem}>
              <Text style={styles.accountName}>{account.bankName}</Text>
              <Text
                style={[
                  styles.accountBalance,
                  account.balance < 0 && styles.negativeBalance,
                ]}
              >
                {formatCurrency(account.balance)}
              </Text>
            </View>
          ))}
          {Object.keys(balances).length === 0 && (
            <Text style={styles.emptyText}>No bank accounts added</Text>
          )}
        </View>

        {/* Pending Credit Card Bills */}
        {pendingBills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Credit Card Bills</Text>
            {pendingBills.map((bill, index) => (
              <View
                key={bill.billId}
                style={[
                  styles.pendingItem,
                  bill.status === 'Overdue' && styles.overdueItem,
                ]}
              >
                <View>
                  <Text style={styles.pendingTitle}>Bill #{index + 1}</Text>
                  <Text style={styles.pendingStatus}>
                    Status: {bill.status}
                  </Text>
                </View>
                <Text style={styles.pendingAmount}>
                  {formatCurrency(parseFloat(bill.billAmount))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Payments</Text>
            {pendingItems.map((item) => (
              <View
                key={item.pendingId}
                style={[
                  styles.pendingItem,
                  item.status === 'Overdue' && styles.overdueItem,
                ]}
              >
                <View>
                  <Text style={styles.pendingTitle}>{item.title}</Text>
                  <Text style={styles.pendingDue}>
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.pendingAmount}>
                  {formatCurrency(parseFloat(item.amount))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Smart Financial Insights */}
        <FinancialInsights userId={user?.userId} />
      </ScrollView>

      <NotificationModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E88E5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 8,
    marginRight: 8,
  },
  notificationIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: -10,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  balanceAmount: {
    color: '#333',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    padding: 4,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: '#1E88E5',
  },
  filterButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
  },
  depositCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  withdrawalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  summaryLabel: {
    color: '#666',
    fontSize: 12,
  },
  summaryAmount: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  depositButton: {
    backgroundColor: '#4CAF50',
  },
  costButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  accountName: {
    fontSize: 16,
    color: '#333',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  negativeBalance: {
    color: '#F44336',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  overdueItem: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pendingStatus: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
  },
  pendingDue: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  notificationList: {
    maxHeight: 400,
  },
  notificationItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  notificationUrgent: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  notificationHigh: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
  },
  modalButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DashboardScreen;
