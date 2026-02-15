import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getTransactions, getBankAccounts } from '../services/database';

const TransactionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [transactionsData, accountsData] = await Promise.all([
        getTransactions(user.userId, filter),
        getBankAccounts(user.userId),
      ]);

      // Create accounts lookup
      const accountsLookup = {};
      accountsData.forEach((acc) => {
        accountsLookup[acc.accountId] = acc.bankName;
      });

      setTransactions(transactionsData);
      setAccounts(accountsLookup);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                          {accounts[transaction.accountId] || 'Unknown Account'}
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
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
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
  listContainer: {
    flex: 1,
    paddingTop: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
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
});

export default TransactionsScreen;
