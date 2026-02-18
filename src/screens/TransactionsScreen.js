import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  getTransactions,
  getTransactionSummary,
  getBankAccounts,
  getCreditCards,
  editTransaction,
  deleteTransaction,
} from '../services/database';

const TransactionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState({});
  const [accountsList, setAccountsList] = useState([]);
  const [creditCardsLookup, setCreditCardsLookup] = useState({});
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ totalDeposits: 0, totalWithdrawals: 0 });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editType, setEditType] = useState('Deposit');
  const [editDate, setEditDate] = useState('');

  const loadData = async () => {
    try {
      const [transactionsData, accountsData, summaryData, cardsData] = await Promise.all([
        getTransactions(user.userId, filter),
        getBankAccounts(user.userId),
        getTransactionSummary(user.userId, filter),
        getCreditCards(user.userId),
      ]);

      // Create accounts lookup
      const accountsLookup = {};
      accountsData.forEach((acc) => {
        accountsLookup[acc.accountId] = acc.bankName;
      });

      // Create credit cards lookup
      const ccLookup = {};
      cardsData.forEach((card) => {
        ccLookup[card.cardId] = card.bankName;
      });

      setTransactions(transactionsData);
      setAccounts(accountsLookup);
      setAccountsList(accountsData);
      setCreditCardsLookup(ccLookup);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading transactions:', error);
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

  const formatCurrency = (amount) => {
    return `${parseFloat(amount).toLocaleString()} BDT`;
  };

  const groupTransactionsByDate = () => {
    const grouped = {};
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });
    return grouped;
  };

  const openEditModal = (transaction) => {
    setEditingTransaction(transaction);
    setEditAmount(String(transaction.amount));
    setEditReason(transaction.reason || '');
    setEditAccountId(transaction.accountId);
    setEditType(transaction.type);
    const d = new Date(transaction.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setEditDate(`${yyyy}-${mm}-${dd}`);
    setShowEditModal(true);
  };

  const confirmDelete = (transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ${transaction.type.toLowerCase()} of ${formatCurrency(transaction.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.transactionId);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(editDate)) {
      Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD)');
      return;
    }
    const parsedDate = new Date(editDate);
    if (isNaN(parsedDate.getTime())) {
      Alert.alert('Error', 'Please enter a valid date');
      return;
    }

    // Preserve the original time, just change the date
    const originalDate = new Date(editingTransaction.date);
    parsedDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), originalDate.getMilliseconds());

    try {
      await editTransaction(editingTransaction.transactionId, {
        amount: parseFloat(editAmount),
        reason: editReason.trim(),
        accountId: editAccountId,
        type: editType,
        date: parsedDate.toISOString(),
      });
      setShowEditModal(false);
      setEditingTransaction(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update transaction');
    }
  };

  const groupedTransactions = groupTransactionsByDate();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {[
            { key: 'all', label: 'All' },
            { key: 'daily', label: 'Today' },
            { key: 'monthly', label: 'This Month' },
            { key: 'yearly', label: 'This Year' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === f.key && styles.filterTabTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.depositCard]}>
            <Text style={styles.summaryLabel}>Total Deposits</Text>
            <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
              +{formatCurrency(summary.totalDeposits)}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.costCard]}>
            <Text style={styles.summaryLabel}>Total Costs</Text>
            <Text style={[styles.summaryAmount, { color: '#F44336' }]}>
              -{formatCurrency(summary.totalWithdrawals)}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {Object.keys(groupedTransactions).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : (
            Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{date}</Text>
                {dayTransactions.map((transaction) => (
                  <View key={transaction.transactionId} style={styles.transactionItem}>
                    <View style={styles.transactionMain}>
                      <View style={styles.transactionLeft}>
                        <View
                          style={[
                            styles.transactionIcon,
                            transaction.type === 'Deposit'
                              ? styles.depositIcon
                              : styles.withdrawalIcon,
                          ]}
                        >
                          <Text style={styles.iconText}>
                            {transaction.type === 'Deposit' ? '+' : '-'}
                          </Text>
                        </View>
                        <View style={styles.transactionDetails}>
                          <Text style={styles.transactionType}>
                            {transaction.type}
                          </Text>
                          <Text style={styles.transactionBank}>
                            {transaction.creditCardId
                              ? `${creditCardsLookup[transaction.creditCardId] || 'Unknown'} (CC)`
                              : accounts[transaction.accountId] || 'Unknown Account'}
                          </Text>
                          {transaction.reason && (
                            <Text style={styles.transactionReason}>
                              {transaction.reason}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text
                          style={[
                            styles.transactionAmount,
                            transaction.type === 'Deposit'
                              ? styles.depositAmount
                              : styles.withdrawalAmount,
                          ]}
                        >
                          {transaction.type === 'Deposit' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </Text>
                        <Text style={styles.transactionTime}>
                          {new Date(transaction.date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(transaction)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => confirmDelete(transaction)}
                      >
                        <Text style={styles.deleteButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Edit Transaction Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
             <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Transaction</Text>

              {/* Type Toggle */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeToggleButton,
                      editType === 'Deposit' && styles.typeToggleDeposit,
                    ]}
                    onPress={() => setEditType('Deposit')}
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        editType === 'Deposit' && styles.typeToggleTextActive,
                      ]}
                    >
                      Deposit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeToggleButton,
                      editType === 'Withdrawal' && styles.typeToggleWithdrawal,
                    ]}
                    onPress={() => setEditType('Withdrawal')}
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        editType === 'Withdrawal' && styles.typeToggleTextActive,
                      ]}
                    >
                      Withdrawal
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Account</Text>
                {editingTransaction?.creditCardId ? (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyText}>
                      {creditCardsLookup[editingTransaction.creditCardId] || 'Unknown'} (Credit Card)
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editAccountId}
                      onValueChange={(value) => setEditAccountId(value)}
                      style={styles.picker}
                    >
                      {accountsList.map((account) => (
                        <Picker.Item
                          key={account.accountId}
                          label={account.bankName}
                          value={account.accountId}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount (BDT)</Text>
                <TextInput
                  style={styles.input}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="numeric"
                  placeholder="Amount"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="2025-01-15"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reason</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={editReason}
                  onChangeText={setEditReason}
                  placeholder="Reason"
                  placeholderTextColor="#999"
                  multiline
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingTransaction(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.confirmButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
             </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: '#1E88E5',
  },
  filterTabText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  depositCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  costCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  summaryLabel: {
    color: '#666',
    fontSize: 11,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
    paddingTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  transactionItem: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  transactionMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  depositIcon: {
    backgroundColor: '#E8F5E9',
  },
  withdrawalIcon: {
    backgroundColor: '#FFEBEE',
  },
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionBank: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionReason: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  depositAmount: {
    color: '#4CAF50',
  },
  withdrawalAmount: {
    color: '#F44336',
  },
  transactionTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  // Action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#1E88E5',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 13,
    fontWeight: '600',
  },
  // Type toggle
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  typeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeToggleDeposit: {
    backgroundColor: '#4CAF50',
  },
  typeToggleWithdrawal: {
    backgroundColor: '#F44336',
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeToggleTextActive: {
    color: '#fff',
  },
  // Modal styles
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  readOnlyField: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readOnlyText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#1E88E5',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default TransactionsScreen;
