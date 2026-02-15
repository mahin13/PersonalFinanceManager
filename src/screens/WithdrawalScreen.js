import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { getBankAccounts, addTransaction, getAccountBalance } from '../services/database';

const WithdrawalScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadBalance();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      const userAccounts = await getBankAccounts(user.userId);
      setAccounts(userAccounts);
      if (userAccounts.length > 0) {
        setSelectedAccount(userAccounts[0].accountId);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadBalance = async () => {
    try {
      const balance = await getAccountBalance(selectedAccount);
      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const handleWithdrawal = async () => {
    if (!selectedAccount) {
      Alert.alert('Error', 'Please select a bank account');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please enter a reason for this expense');
      return;
    }

    setLoading(true);

    try {
      await addTransaction({
        userId: user.userId,
        accountId: selectedAccount,
        type: 'Withdrawal',
        amount: parseFloat(amount),
        reason: reason.trim(),
        date: new Date().toISOString(),
      });

      Alert.alert('Success', `Expense of ${amount} BDT recorded successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `${value.toLocaleString()} BDT`;
  };

  const newBalance = currentBalance - (parseFloat(amount) || 0);

  if (loadingAccounts) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F44336" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cost / Withdrawal</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Record Expense</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Bank Account</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedAccount}
                onValueChange={(value) => setSelectedAccount(value)}
                style={styles.picker}
              >
                {accounts.map((account) => (
                  <Picker.Item
                    key={account.accountId}
                    label={account.bankName}
                    value={account.accountId}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {selectedAccount && (
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (BDT)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason / Description</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Groceries, Transport, Bills..."
              placeholderTextColor="#999"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
          </View>

          {amount && parseFloat(amount) > 0 && (
            <View style={[styles.previewContainer, newBalance < 0 && styles.warningContainer]}>
              <Text style={styles.previewLabel}>New Balance will be</Text>
              <Text style={[styles.previewAmount, newBalance < 0 && styles.negativeAmount]}>
                {formatCurrency(newBalance)}
              </Text>
              {newBalance < 0 && (
                <Text style={styles.warningText}>
                  Warning: This will result in negative balance
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleWithdrawal}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Confirm Expense</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Expense Categories */}
        <View style={styles.quickCategories}>
          <Text style={styles.quickTitle}>Quick Categories</Text>
          <View style={styles.categoryContainer}>
            {['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Healthcare'].map(
              (category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    reason === category && styles.categoryButtonActive,
                  ]}
                  onPress={() => setReason(category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      reason === category && styles.categoryTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
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
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  balanceInfo: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 4,
  },
  amountInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  reasonInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  previewContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  warningContainer: {
    backgroundColor: '#FFEBEE',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginTop: 4,
  },
  negativeAmount: {
    color: '#F44336',
  },
  warningText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#EF9A9A',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  quickCategories: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#fff',
  },
});

export default WithdrawalScreen;
