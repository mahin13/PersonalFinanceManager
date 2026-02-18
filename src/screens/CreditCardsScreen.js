import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  getCreditCards,
  getCreditCardBills,
  addCreditCardBill,
  updateCreditCardBillStatus,
  addCreditCard,
  getBankAccounts,
  payBillWithCost,
  getCreditCardTransactions,
} from '../services/database';
import { scheduleBillReminders } from '../services/notificationService';

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const CreditCardsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [bills, setBills] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [billAmount, setBillAmount] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const [newBillDay, setNewBillDay] = useState(26);
  const [newPaymentDay, setNewPaymentDay] = useState(14);
  const [showPayBillModal, setShowPayBillModal] = useState(false);
  const [payingBill, setPayingBill] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedPayAccount, setSelectedPayAccount] = useState('');
  const [cardTransactions, setCardTransactions] = useState({});
  const [expandedTransactions, setExpandedTransactions] = useState({});
  const [expandedPaymentHistory, setExpandedPaymentHistory] = useState({});

  const loadData = async () => {
    try {
      const [cardsData, billsData, accountsData] = await Promise.all([
        getCreditCards(user.userId),
        getCreditCardBills(user.userId),
        getBankAccounts(user.userId),
      ]);
      setCards(cardsData);
      setBills(billsData);
      setBankAccounts(accountsData);
      if (accountsData.length > 0 && !selectedPayAccount) {
        setSelectedPayAccount(accountsData[0].accountId);
      }

      // Load transactions for each card
      const txnMap = {};
      await Promise.all(
        cardsData.map(async (card) => {
          txnMap[card.cardId] = await getCreditCardTransactions(card.cardId);
        })
      );
      setCardTransactions(txnMap);
    } catch (error) {
      console.error('Error loading credit card data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getCardBills = (cardId) => {
    return bills.filter((b) => b.cardId === cardId);
  };

  const getPendingBills = (cardId) => {
    return bills.filter(
      (b) => b.cardId === cardId && (b.status === 'Pending' || b.status === 'Overdue')
    );
  };

  const handleAddBill = async () => {
    if (!billAmount || parseFloat(billAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid bill amount');
      return;
    }

    try {
      const currentDate = new Date();
      const billMonth = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, '0')}`;

      await addCreditCardBill({
        cardId: selectedCard.cardId,
        billMonth,
        billAmount: parseFloat(billAmount),
      });

      Alert.alert('Success', 'Bill added successfully');
      setShowAddBillModal(false);
      setBillAmount('');
      setSelectedCard(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add bill');
    }
  };

  const handleMarkAsPaid = (bill) => {
    setPayingBill(bill);
    if (bankAccounts.length > 0) {
      setSelectedPayAccount(bankAccounts[0].accountId);
    }
    setShowPayBillModal(true);
  };

  const handleConfirmPayBill = async () => {
    if (!selectedPayAccount) {
      Alert.alert('Error', 'Please select an account to pay from');
      return;
    }
    if (!payingBill) return;

    try {
      await payBillWithCost(payingBill.billId, selectedPayAccount, user.userId);
      setShowPayBillModal(false);
      setPayingBill(null);
      loadData();
      scheduleBillReminders(user.userId);
      Alert.alert('Success', 'Bill marked as paid and expense recorded!');
    } catch (error) {
      Alert.alert('Error', 'Failed to process bill payment');
    }
  };

  const handleAddCard = async () => {
    if (!newCardName.trim()) {
      Alert.alert('Error', 'Please enter a bank name');
      return;
    }

    try {
      await addCreditCard({
        userId: user.userId,
        bankName: newCardName.trim(),
        billGenerationDay: newBillDay,
        lastPaymentDay: newPaymentDay,
      });

      Alert.alert('Success', 'Credit card added successfully');
      setShowAddCardModal(false);
      setNewCardName('');
      setNewBillDay(26);
      setNewPaymentDay(14);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add credit card');
    }
  };

  const formatCurrency = (amount) => {
    return `${parseFloat(amount).toLocaleString()} BDT`;
  };

  const getOrdinalSuffix = (day) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit Cards</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddCardModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No credit cards added yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddCardModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add Your First Card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Total CC Spending Summary */}
            {(() => {
              const totalSpending = Object.values(cardTransactions)
                .flat()
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
              return totalSpending > 0 ? (
                <View style={styles.totalSpendingCard}>
                  <Text style={styles.totalSpendingLabel}>Total CC Spending</Text>
                  <Text style={styles.totalSpendingAmount}>
                    {formatCurrency(totalSpending)}
                  </Text>
                </View>
              ) : null;
            })()}

            {cards.map((card) => {
              const allCardBills = getCardBills(card.cardId);
              const activeBills = allCardBills.filter(b => b.status === 'Pending' || b.status === 'Overdue');
              const paidBills = allCardBills.filter(b => b.status === 'Paid');
              const cardPendingBills = getPendingBills(card.cardId);
              const totalPending = cardPendingBills.reduce(
                (sum, b) => sum + parseFloat(b.billAmount),
                0
              );
              const txns = cardTransactions[card.cardId] || [];
              const isTxnExpanded = expandedTransactions[card.cardId];
              const isHistoryExpanded = expandedPaymentHistory[card.cardId];

              return (
                <View key={card.cardId} style={styles.cardContainer}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardName}>{card.bankName}</Text>
                      <Text style={styles.cardDates}>
                        Bill: {card.billGenerationDay}{getOrdinalSuffix(card.billGenerationDay)} | Due: {card.lastPaymentDay}{getOrdinalSuffix(card.lastPaymentDay)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addBillButton}
                      onPress={() => {
                        setSelectedCard(card);
                        setShowAddBillModal(true);
                      }}
                    >
                      <Text style={styles.addBillButtonText}>+ Add Bill</Text>
                    </TouchableOpacity>
                  </View>

                  {totalPending > 0 && (
                    <View style={styles.pendingTotal}>
                      <Text style={styles.pendingTotalLabel}>Total Pending</Text>
                      <Text style={styles.pendingTotalAmount}>
                        {formatCurrency(totalPending)}
                      </Text>
                    </View>
                  )}

                  {/* Active Bills (Pending/Overdue) */}
                  {activeBills.length > 0 ? (
                    activeBills.map((bill) => (
                      <View
                        key={bill.billId}
                        style={[
                          styles.billItem,
                          bill.status === 'Overdue' && styles.billOverdue,
                        ]}
                      >
                        <View>
                          <Text style={styles.billMonth}>{bill.billMonth}</Text>
                          <View style={[
                            styles.billStatusBadge,
                            bill.status === 'Overdue' && styles.billStatusOverdue,
                            bill.status === 'Pending' && styles.billStatusPending,
                          ]}>
                            <Text style={styles.billStatusBadgeText}>
                              {bill.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.billRight}>
                          <Text style={styles.billAmount}>
                            {formatCurrency(bill.billAmount)}
                          </Text>
                          <TouchableOpacity
                            style={styles.paidButton}
                            onPress={() => handleMarkAsPaid(bill)}
                          >
                            <Text style={styles.paidButtonText}>Mark Paid</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : allCardBills.length === 0 ? (
                    <Text style={styles.noPendingText}>No bills added yet</Text>
                  ) : null}

                  {/* Collapsible Payment History */}
                  {paidBills.length > 0 && (
                    <View>
                      <TouchableOpacity
                        style={styles.collapsibleHeader}
                        onPress={() =>
                          setExpandedPaymentHistory(prev => ({
                            ...prev,
                            [card.cardId]: !prev[card.cardId],
                          }))
                        }
                      >
                        <Text style={styles.collapsibleHeaderText}>
                          {isHistoryExpanded ? '▼' : '▶'} Payment History ({paidBills.length})
                        </Text>
                      </TouchableOpacity>
                      {isHistoryExpanded &&
                        paidBills.map((bill) => (
                          <View
                            key={bill.billId}
                            style={[styles.billItem, styles.billPaid]}
                          >
                            <View>
                              <Text style={styles.billMonth}>{bill.billMonth}</Text>
                              <View style={[styles.billStatusBadge, styles.billStatusPaid]}>
                                <Text style={styles.billStatusBadgeText}>Paid</Text>
                              </View>
                              {bill.updatedAt && (
                                <Text style={styles.paidDateText}>
                                  {new Date(bill.updatedAt).toLocaleDateString()}
                                </Text>
                              )}
                            </View>
                            <View style={styles.billRight}>
                              <Text style={[styles.billAmount, styles.billAmountPaid]}>
                                {formatCurrency(bill.billAmount)}
                              </Text>
                            </View>
                          </View>
                        ))}
                    </View>
                  )}

                  {/* Collapsible Transactions */}
                  {txns.length > 0 && (
                    <View>
                      <TouchableOpacity
                        style={styles.collapsibleHeader}
                        onPress={() =>
                          setExpandedTransactions(prev => ({
                            ...prev,
                            [card.cardId]: !prev[card.cardId],
                          }))
                        }
                      >
                        <Text style={[styles.collapsibleHeaderText, { color: '#F44336' }]}>
                          {isTxnExpanded ? '▼' : '▶'} Transactions ({txns.length})
                        </Text>
                      </TouchableOpacity>
                      {isTxnExpanded &&
                        txns.map((txn) => (
                          <View key={txn.transactionId} style={styles.txnItem}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.txnReason}>
                                {txn.reason || 'No description'}
                              </Text>
                              <Text style={styles.txnDate}>
                                {new Date(txn.date).toLocaleDateString()}
                              </Text>
                            </View>
                            <Text style={styles.txnAmount}>
                              -{formatCurrency(txn.amount)}
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Add Bill Modal - Full screen bottom sheet */}
      <Modal
        visible={showAddBillModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddBillModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalDismissArea}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setShowAddBillModal(false);
                setBillAmount('');
              }}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Bill</Text>
              <Text style={styles.modalSubtitle}>
                {selectedCard?.bankName} Credit Card
              </Text>

              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bill Amount (BDT)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter bill amount"
                    placeholderTextColor="#999"
                    value={billAmount}
                    onChangeText={setBillAmount}
                    keyboardType="numeric"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddBillModal(false);
                    setBillAmount('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAddBill}
                >
                  <Text style={styles.confirmButtonText}>Add Bill</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Card Modal - Full screen bottom sheet with date pickers */}
      <Modal
        visible={showAddCardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCardModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalDismissArea}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setShowAddCardModal(false);
                setNewCardName('');
              }}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Credit Card</Text>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bank Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., EBL, Standard Chartered"
                    placeholderTextColor="#999"
                    value={newCardName}
                    onChangeText={setNewCardName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bill Generation Day</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newBillDay}
                      onValueChange={(value) => setNewBillDay(value)}
                      style={styles.dayPicker}
                    >
                      {DAY_OPTIONS.map((day) => (
                        <Picker.Item
                          key={day}
                          label={`${day}${getOrdinalSuffix(day)} of every month`}
                          value={day}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Last Payment Day</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newPaymentDay}
                      onValueChange={(value) => setNewPaymentDay(value)}
                      style={styles.dayPicker}
                    >
                      {DAY_OPTIONS.map((day) => (
                        <Picker.Item
                          key={day}
                          label={`${day}${getOrdinalSuffix(day)} of every month`}
                          value={day}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddCardModal(false);
                    setNewCardName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAddCard}
                >
                  <Text style={styles.confirmButtonText}>Add Card</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Pay Bill Modal */}
      <Modal
        visible={showPayBillModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayBillModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowPayBillModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Pay Credit Card Bill</Text>
            {payingBill && (
              <Text style={styles.modalSubtitle}>
                Amount: {formatCurrency(payingBill.billAmount)} ({payingBill.billMonth})
              </Text>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pay from Account</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedPayAccount}
                  onValueChange={(value) => setSelectedPayAccount(value)}
                  style={styles.dayPicker}
                >
                  {bankAccounts.map((account) => (
                    <Picker.Item
                      key={account.accountId}
                      label={account.bankName}
                      value={account.accountId}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPayBillModal(false);
                  setPayingBill(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmPayBill}
              >
                <Text style={styles.confirmButtonText}>Pay Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#673AB7',
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
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#673AB7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cardContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardDates: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  addBillButton: {
    backgroundColor: '#673AB7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addBillButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingTotal: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTotalLabel: {
    color: '#666',
    fontSize: 14,
  },
  pendingTotalAmount: {
    color: '#FF9800',
    fontSize: 20,
    fontWeight: 'bold',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  billOverdue: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  billPaid: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    opacity: 0.85,
  },
  billMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  billStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  billStatusPaid: {
    backgroundColor: '#4CAF50',
  },
  billStatusOverdue: {
    backgroundColor: '#F44336',
  },
  billStatusPending: {
    backgroundColor: '#FF9800',
  },
  billStatusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  billAmountPaid: {
    color: '#4CAF50',
    textDecorationLine: 'line-through',
  },
  paidButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  paidButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  noPendingText: {
    color: '#4CAF50',
    textAlign: 'center',
    paddingVertical: 12,
  },
  totalSpendingCard: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSpendingLabel: {
    color: '#666',
    fontSize: 14,
  },
  totalSpendingAmount: {
    color: '#F44336',
    fontSize: 20,
    fontWeight: 'bold',
  },
  collapsibleHeader: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  collapsibleHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  paidDateText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  txnReason: {
    fontSize: 13,
    color: '#333',
  },
  txnDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayPicker: {
    height: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
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
    backgroundColor: '#673AB7',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default CreditCardsScreen;
