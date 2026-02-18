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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { getBankAccounts, addTransaction, getAccountBalance } from '../services/database';

const DepositScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
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

  const handleDeposit = async () => {
    if (!selectedAccount) {
      Alert.alert('Error', 'Please select a bank account');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      await addTransaction({
        userId: user.userId,
        accountId: selectedAccount,
        type: 'Deposit',
        amount: parseFloat(amount),
        date: new Date().toISOString(),
      });

      Alert.alert('Success', `Deposited ${amount} BDT successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `${value.toLocaleString()} BDT`;
  };

  const getSelectedAccountName = () => {
    const account = accounts.find((a) => a.accountId === selectedAccount);
    return account ? account.bankName : '';
  };

  if (loadingAccounts) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deposit</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Money</Text>

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
            <Text style={styles.label}>Deposit Amount (BDT)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          {amount && parseFloat(amount) > 0 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>New Balance will be</Text>
              <Text style={styles.previewAmount}>
                {formatCurrency(currentBalance + parseFloat(amount))}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleDeposit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Confirm Deposit</Text>
            )}
          </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>

          {accounts.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No bank accounts found. Please add bank accounts in your profile.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#E8F5E9',
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
    color: '#4CAF50',
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
  previewContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
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
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default DepositScreen;
