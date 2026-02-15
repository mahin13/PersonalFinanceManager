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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  getCreditCards,
  getCreditCardBills,
  addCreditCardBill,
  updateCreditCardBillStatus,
  addCreditCard,
} from '../services/database';

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
  const [newBillDay, setNewBillDay] = useState('26');
  const [newPaymentDay, setNewPaymentDay] = useState('14');

  const loadData = async () => {
    try {
      const [cardsData, billsData] = await Promise.all([
        getCreditCards(user.userId),
        getCreditCardBills(user.userId),
      ]);
      setCards(cardsData);
      setBills(billsData);
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

  const handleMarkAsPaid = async (billId) => {
    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this bill as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark as Paid',
          onPress: async () => {
            try {
              await updateCreditCardBillStatus(billId, 'Paid');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to update bill status');
            }
          },
        },
      ]
    );
  };

  const handleAddCard = async () => {
    if (!newCardName.trim()) {
      Alert.alert('Error', 'Please enter a bank name');
      return;
    }
    if (!newBillDay || !newPaymentDay) {
      Alert.alert('Error', 'Please enter bill generation and payment dates');
      return;
    }

    try {
      await addCreditCard({
        userId: user.userId,
        bankName: newCardName.trim(),
        billGenerationDay: parseInt(newBillDay),
        lastPaymentDay: parseInt(newPaymentDay),
      });

      Alert.alert('Success', 'Credit card added successfully');
      setShowAddCardModal(false);
      setNewCardName('');
      setNewBillDay('26');
      setNewPaymentDay('14');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add credit card');
    }
  };

  const formatCurrency = (amount) => {
    return `${parseFloat(amount).toLocaleString()} BDT`;
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
          cards.map((card) => {
            const cardPendingBills = getPendingBills(card.cardId);
            const totalPending = cardPendingBills.reduce(
              (sum, b) => sum + parseFloat(b.billAmount),
              0
            );

            return (
              <View key={card.cardId} style={styles.cardContainer}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardName}>{card.bankName}</Text>
                    <Text style={styles.cardDates}>
                      Bill: {card.billGenerationDay}th | Due: {card.lastPaymentDay}th
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

                {cardPendingBills.length > 0 ? (
                  cardPendingBills.map((bill) => (
                    <View
                      key={bill.billId}
                      style={[
                        styles.billItem,
                        bill.status === 'Overdue' && styles.billOverdue,
                      ]}
                    >
                      <View>
                        <Text style={styles.billMonth}>{bill.billMonth}</Text>
                        <Text
                          style={[
                            styles.billStatus,
                            bill.status === 'Overdue' && styles.overdueText,
                          ]}
                        >
                          {bill.status}
                        </Text>
                      </View>
                      <View style={styles.billRight}>
                        <Text style={styles.billAmount}>
                          {formatCurrency(bill.billAmount)}
                        </Text>
                        <TouchableOpacity
                          style={styles.paidButton}
                          onPress={() => handleMarkAsPaid(bill.billId)}
                        >
                          <Text style={styles.paidButtonText}>Mark Paid</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noPendingText}>No pending bills</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Bill Modal - Inline with keyboard handling */}
      <Modal
        visible={showAddBillModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddBillModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Bill</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedCard?.bankName} Credit Card
                </Text>

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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Card Modal - Inline with keyboard handling */}
      <Modal
        visible={showAddCardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCardModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Credit Card</Text>

                <ScrollView keyboardShouldPersistTaps="handled">
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

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.label}>Bill Generation Day</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="26"
                        placeholderTextColor="#999"
                        value={newBillDay}
                        onChangeText={setNewBillDay}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.label}>Last Payment Day</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="14"
                        placeholderTextColor="#999"
                        value={newPaymentDay}
                        onChangeText={setNewPaymentDay}
                        keyboardType="numeric"
                      />
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  billMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  billStatus: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
  overdueText: {
    color: '#F44336',
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
  row: {
    flexDirection: 'row',
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
