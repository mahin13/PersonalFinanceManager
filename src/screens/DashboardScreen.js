import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Image,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import FinancialInsights from '../components/FinancialInsights';
import BirthdayWish from '../components/BirthdayWish';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getAllBalances,
  getTransactionSummary,
  getNotifications,
  getPendingCreditCardBills,
  getActivePendingItems,
  checkAndUpdateOverdueBills,
  checkAndUpdateOverduePendingItems,
  getUserProfile,
  editPendingItem,
  deletePendingItem,
  updatePendingItemStatus,
} from '../services/database';

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState('monthly');
  const [balances, setBalances] = useState({});
  const [summary, setSummary] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalCreditCardCosts: 0,
    netBalance: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showEditPendingModal, setShowEditPendingModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const isFirstLoad = useRef(true);

  const loadData = async (isInitial = false) => {
    if (!user) return;

    try {
      // Update overdue statuses
      await checkAndUpdateOverdueBills(user.userId);
      await checkAndUpdateOverduePendingItems(user.userId);

      // Load all data including profile
      const [balancesData, summaryData, notificationsData, billsData, itemsData, profileData] =
        await Promise.all([
          getAllBalances(user.userId),
          getTransactionSummary(user.userId, filter),
          getNotifications(user.userId),
          getPendingCreditCardBills(user.userId),
          getActivePendingItems(user.userId),
          getUserProfile(user.userId),
        ]);

      // Set profile picture if available
      if (profileData && profileData.profileImage) {
        setProfileImage(profileData.profileImage);
      }

      setBalances(balancesData);
      setSummary(summaryData);
      setNotifications(notificationsData);
      setPendingBills(billsData);
      setPendingItems(itemsData);

      // Only show notification popup on first load (login), not on every tab switch
      if (isInitial) {
        const urgentNotifications = notificationsData.filter(
          (n) => n.priority === 'urgent' || n.priority === 'high'
        );
        if (urgentNotifications.length > 0) {
          setShowNotifications(true);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const initial = isFirstLoad.current;
      isFirstLoad.current = false;
      loadData(initial);
    }, [user, filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
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

  const handleLogout = () => {
    const { Alert } = require('react-native');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleEditPendingItem = (item) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditAmount(String(item.amount));
    setEditDescription(item.description || '');
    setEditDueDate(new Date(item.dueDate));
    setShowEditPendingModal(true);
  };

  const handleSaveEditPending = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!editAmount || parseFloat(editAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    try {
      await editPendingItem(editingItem.pendingId, {
        title: editTitle.trim(),
        amount: parseFloat(editAmount),
        dueDate: editDueDate.toISOString(),
        description: editDescription.trim(),
      });
      setShowEditPendingModal(false);
      setEditingItem(null);
      loadData(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update pending item');
    }
  };

  const handleDeletePendingItem = (item) => {
    Alert.alert(
      'Delete Pending Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePendingItem(item.pendingId);
              loadData(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete pending item');
            }
          },
        },
      ]
    );
  };

  const handleMarkCompleted = (item) => {
    Alert.alert(
      'Mark as Completed',
      `Mark "${item.title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await updatePendingItemStatus(item.pendingId, 'Completed');
              loadData(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to update status');
            }
          },
        },
      ]
    );
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNotifications(false)}
            >
              <Text style={styles.modalCloseText}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.notificationList}>
            {notifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <Text style={styles.emptyNotificationsText}>No notifications</Text>
              </View>
            ) : (
              notifications.map((notification, index) => (
                <View
                  key={index}
                  style={[
                    styles.notificationItem,
                    notification.priority === 'urgent' && styles.notificationUrgent,
                    notification.priority === 'high' && styles.notificationHigh,
                  ]}
                >
                  <View style={styles.notificationIconContainer}>
                    <Text style={styles.notificationTypeIcon}>
                      {notification.type.includes('bill') ? '$' : '!'}
                    </Text>
                  </View>
                  <View style={styles.notificationTextContainer}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                  </View>
                </View>
              ))
            )}
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
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.profilePictureContainer}
            onPress={() => navigation.navigate('Profile')}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profileInitial}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setShowNotifications(true)}
          >
            <Text style={styles.bellIcon}>&#x1F514;</Text>
            {notifications.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>&#x279C;</Text>
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

        {/* Summary Cards - Stacked Rows */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.depositCard]}>
            <View style={styles.summaryCardRow}>
              <View style={styles.summaryCardIcon}>
                <Text style={[styles.summaryCardIconText, { color: '#4CAF50' }]}>+</Text>
              </View>
              <Text style={styles.summaryLabel}>Total Deposits</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>{formatCurrency(summary.totalDeposits)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.withdrawalCard]}>
            <View style={styles.summaryCardRow}>
              <View style={styles.summaryCardIcon}>
                <Text style={[styles.summaryCardIconText, { color: '#F44336' }]}>-</Text>
              </View>
              <Text style={styles.summaryLabel}>Total Withdrawals</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: '#F44336' }]}>{formatCurrency(summary.totalWithdrawals)}</Text>
          </View>
          {user?.hasCreditCards && (
            <View style={[styles.summaryCard, styles.creditCardCostCard]}>
              <View style={styles.summaryCardRow}>
                <View style={styles.summaryCardIcon}>
                  <Text style={[styles.summaryCardIconText, { color: '#FF9800' }]}>C</Text>
                </View>
                <Text style={styles.summaryLabel}>Credit Card Costs</Text>
              </View>
              <Text style={[styles.summaryAmount, { color: '#FF9800' }]}>{formatCurrency(summary.totalCreditCardCosts)}</Text>
            </View>
          )}
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

        {/* Account Balances - Grouped by Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Balances</Text>

          {/* Banks */}
          {Object.entries(balances).filter(([, a]) => (a.type || 'bank') === 'bank').length > 0 && (
            <>
              <Text style={styles.groupHeader}>Banks</Text>
              {Object.entries(balances)
                .filter(([, a]) => (a.type || 'bank') === 'bank')
                .map(([accountId, account]) => (
                  <View key={accountId} style={styles.accountItem}>
                    <View style={styles.accountLeft}>
                      <View style={[styles.accountIcon, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={[styles.accountIconText, { color: '#4CAF50' }]}>B</Text>
                      </View>
                      <Text style={styles.accountName}>{account.bankName}</Text>
                    </View>
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
            </>
          )}

          {/* MFS */}
          {Object.entries(balances).filter(([, a]) => a.type === 'mfs' || a.type === 'bkash').length > 0 && (
            <>
              <Text style={styles.groupHeader}>MFS</Text>
              {Object.entries(balances)
                .filter(([, a]) => a.type === 'mfs' || a.type === 'bkash')
                .map(([accountId, account]) => (
                  <View key={accountId} style={styles.accountItem}>
                    <View style={styles.accountLeft}>
                      <View style={[styles.accountIcon, { backgroundColor: '#FCE4EC' }]}>
                        <Text style={[styles.accountIconText, { color: '#E91E63' }]}>M</Text>
                      </View>
                      <Text style={styles.accountName}>{account.bankName}</Text>
                    </View>
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
            </>
          )}

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
                <View style={{ flex: 1 }}>
                  <View style={styles.pendingItemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingTitle}>{item.title}</Text>
                      <Text style={styles.pendingDue}>
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.pendingAmount}>
                      {formatCurrency(parseFloat(item.amount))}
                    </Text>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.pendingActionBtn}
                      onPress={() => handleMarkCompleted(item)}
                    >
                      <Text style={styles.pendingCompleteText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pendingActionBtn}
                      onPress={() => handleEditPendingItem(item)}
                    >
                      <Text style={styles.pendingEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pendingActionBtn}
                      onPress={() => handleDeletePendingItem(item)}
                    >
                      <Text style={styles.pendingDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Smart Financial Insights */}
        <FinancialInsights userId={user?.userId} />
      </ScrollView>

      <NotificationModal />

      {/* Edit Pending Item Modal */}
      <Modal
        visible={showEditPendingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditPendingModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.editModalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.editModalOverlay}>
                <View style={styles.editModalContent}>
                  <Text style={styles.editModalTitle}>Edit Pending Item</Text>

                  <Text style={styles.editLabel}>Title</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Title"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.editLabel}>Amount (BDT)</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    placeholder="Amount"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />

                  <Text style={styles.editLabel}>Due Date</Text>
                  <TouchableOpacity
                    style={styles.editInput}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Text style={{ fontSize: 16, color: '#333' }}>
                      {editDueDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  {showEditDatePicker && (
                    <DateTimePicker
                      value={editDueDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowEditDatePicker(Platform.OS === 'ios');
                        if (selectedDate) setEditDueDate(selectedDate);
                      }}
                    />
                  )}

                  <Text style={styles.editLabel}>Description</Text>
                  <TextInput
                    style={[styles.editInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Description (optional)"
                    placeholderTextColor="#999"
                    multiline
                  />

                  <View style={styles.editModalButtons}>
                    <TouchableOpacity
                      style={[styles.editModalBtn, { backgroundColor: '#F5F5F5', marginRight: 8 }]}
                      onPress={() => {
                        setShowEditPendingModal(false);
                        setEditingItem(null);
                      }}
                    >
                      <Text style={{ color: '#666', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editModalBtn, { backgroundColor: '#1E88E5', marginLeft: 8 }]}
                      onPress={handleSaveEditPending}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BirthdayWish userName={user?.name} birthdate={user?.birthdate} />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePictureContainer: {
    marginRight: 12,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profilePicturePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1E88E5',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    paddingHorizontal: 18,
  },
  summaryCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryCardIconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  depositCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  withdrawalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  creditCardCostCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  summaryLabel: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    paddingLeft: 48,
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
  groupHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  accountIconText: {
    fontSize: 14,
    fontWeight: 'bold',
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
  pendingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pendingActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  pendingActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  pendingCompleteText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingEditText: {
    color: '#1E88E5',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingDeleteText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 8,
  },
  editInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  editModalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  editModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  notificationList: {
    maxHeight: 400,
  },
  emptyNotifications: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyNotificationsText: {
    color: '#999',
    fontSize: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
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
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTypeIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
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
