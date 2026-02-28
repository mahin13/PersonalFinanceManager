import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { getBankAccounts, bulkAddTransactions } from '../services/database';
import {
  parseCSV,
  parseJSON,
  parseExcel,
  autoMapColumns,
  mapRowsToTransactions,
} from '../utils/importParser';

const FIELD_OPTIONS = ['-- Skip --', 'type', 'amount', 'reason', 'date'];

const ImportDataScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState(1); // 1=pick file, 2=map columns, 3=preview

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const userAccounts = await getBankAccounts(user.userId);
      setAccounts(userAccounts);
      if (userAccounts.length > 0) {
        setSelectedAccount(userAccounts[0].accountId);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/plain',
          'application/json',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setFileName(file.name);
      setLoading(true);

      const ext = file.name.toLowerCase().split('.').pop();

      let parsed;
      if (ext === 'json') {
        const content = await FileSystem.readAsStringAsync(file.uri);
        parsed = parseJSON(content);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const content = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        parsed = parseExcel(content);
      } else {
        // CSV, TXT, or any other text file
        const content = await FileSystem.readAsStringAsync(file.uri);
        parsed = parseCSV(content);
      }

      setHeaders(parsed.headers);
      setRows(parsed.rows);

      // Auto-map columns
      const autoMapping = autoMapColumns(parsed.headers);
      setMapping(autoMapping);
      setStep(2);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (field, headerValue) => {
    const newMapping = { ...mapping };
    if (headerValue === '-- Skip --') {
      delete newMapping[field];
    } else {
      newMapping[field] = headerValue;
    }
    setMapping(newMapping);
  };

  const handleImport = async () => {
    if (!selectedAccount) {
      Alert.alert('Error', 'Please select a bank account');
      return;
    }
    if (!mapping.amount) {
      Alert.alert('Error', 'Please map at least the "amount" column');
      return;
    }

    setImporting(true);
    try {
      const transactions = mapRowsToTransactions(rows, mapping, user.userId, selectedAccount);

      if (transactions.length === 0) {
        Alert.alert('Error', 'No valid transactions found. Check your column mapping.');
        return;
      }

      const count = await bulkAddTransactions(transactions);
      Alert.alert(
        'Success',
        `Imported ${count} transactions successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import transactions');
    } finally {
      setImporting(false);
    }
  };

  const getPreviewTransactions = () => {
    if (!mapping.amount) return [];
    return mapRowsToTransactions(rows.slice(0, 5), mapping, user.userId, selectedAccount);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Data</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Step 1: File Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Select File</Text>
          <Text style={styles.cardSubtitle}>
            Supported formats: CSV, TXT, JSON, Excel (.xlsx)
          </Text>

          <TouchableOpacity
            style={styles.pickButton}
            onPress={handlePickFile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.pickButtonText}>
                {fileName ? 'Change File' : 'Choose File'}
              </Text>
            )}
          </TouchableOpacity>

          {fileName ? (
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{fileName}</Text>
              <Text style={styles.fileDetails}>
                {rows.length} rows found | {headers.length} columns
              </Text>
            </View>
          ) : null}
        </View>

        {/* Step 2: Column Mapping */}
        {step >= 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Map Columns</Text>
            <Text style={styles.cardSubtitle}>
              Match your file columns to transaction fields
            </Text>

            {FIELD_OPTIONS.filter(f => f !== '-- Skip --').map((field) => (
              <View key={field} style={styles.mappingRow}>
                <Text style={styles.mappingLabel}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  {field === 'amount' ? ' *' : ''}
                </Text>
                <View style={styles.mappingPicker}>
                  <Picker
                    selectedValue={mapping[field] || '-- Skip --'}
                    onValueChange={(value) => updateMapping(field, value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="-- Skip --" value="-- Skip --" />
                    {headers.map((h) => (
                      <Picker.Item key={h} label={h} value={h} />
                    ))}
                  </Picker>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Step 3: Account & Preview */}
        {step >= 2 && mapping.amount && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Account & Preview</Text>

            <View style={styles.mappingRow}>
              <Text style={styles.mappingLabel}>Assign to Account</Text>
              <View style={styles.mappingPicker}>
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

            <Text style={[styles.cardSubtitle, { marginTop: 16 }]}>
              Preview (first 5 rows):
            </Text>

            {getPreviewTransactions().map((t, i) => (
              <View key={i} style={styles.previewRow}>
                <View style={[
                  styles.previewType,
                  { backgroundColor: t.type === 'Deposit' ? '#E8F5E9' : '#FFEBEE' },
                ]}>
                  <Text style={{
                    color: t.type === 'Deposit' ? '#4CAF50' : '#F44336',
                    fontWeight: '600',
                    fontSize: 12,
                  }}>
                    {t.type === 'Deposit' ? '+' : '-'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewReason}>{t.reason || 'No reason'}</Text>
                  <Text style={styles.previewDate}>
                    {new Date(t.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[
                  styles.previewAmount,
                  { color: t.type === 'Deposit' ? '#4CAF50' : '#F44336' },
                ]}>
                  {t.amount.toLocaleString()} BDT
                </Text>
              </View>
            ))}

            <Text style={styles.totalInfo}>
              Total: {rows.length} transactions will be imported
            </Text>

            <TouchableOpacity
              style={[styles.importButton, importing && styles.importButtonDisabled]}
              onPress={handleImport}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.importButtonText}>
                  Import {rows.length} Transactions
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF9800',
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
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  pickButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fileDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mappingRow: {
    marginBottom: 12,
  },
  mappingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  mappingPicker: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  previewType: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  previewReason: {
    fontSize: 13,
    color: '#333',
  },
  previewDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  previewAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalInfo: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginTop: 12,
    marginBottom: 12,
  },
  importButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImportDataScreen;
