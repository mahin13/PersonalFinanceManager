import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const getOrdinalSuffix = (day) => {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const SignUpScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthdate, setBirthdate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Bank Accounts
  const [hasMFS, setHasMFS] = useState(false);
  const [selectedMFS, setSelectedMFS] = useState([]);
  const [customMFSName, setCustomMFSName] = useState('');
  const [numBankAccounts, setNumBankAccounts] = useState('1');
  const [bankAccounts, setBankAccounts] = useState(['']);

  // Step 3: Credit Cards
  const [hasCreditCards, setHasCreditCards] = useState(false);

  // Step 4: Budget Settings
  const [defaultMonthlyCost, setDefaultMonthlyCost] = useState('');
  const [defaultMonthlyDeposit, setDefaultMonthlyDeposit] = useState('');
  const [defaultDepositAccount, setDefaultDepositAccount] = useState('');
  const [defaultCostAccount, setDefaultCostAccount] = useState('');
  const [numCreditCards, setNumCreditCards] = useState('1');
  const [creditCards, setCreditCards] = useState([
    { bankName: '', billGenerationDay: 26, lastPaymentDay: 14 }
  ]);

  const updateBankAccountCount = (count) => {
    const num = parseInt(count) || 1;
    setNumBankAccounts(count);
    const newAccounts = [...bankAccounts];
    while (newAccounts.length < num) {
      newAccounts.push('');
    }
    while (newAccounts.length > num) {
      newAccounts.pop();
    }
    setBankAccounts(newAccounts);
  };

  const updateCreditCardCount = (count) => {
    const num = parseInt(count) || 1;
    setNumCreditCards(count);
    const newCards = [...creditCards];
    while (newCards.length < num) {
      newCards.push({ bankName: '', billGenerationDay: 26, lastPaymentDay: 14 });
    }
    while (newCards.length > num) {
      newCards.pop();
    }
    setCreditCards(newCards);
  };

  const updateBankAccount = (index, value) => {
    const newAccounts = [...bankAccounts];
    newAccounts[index] = value;
    setBankAccounts(newAccounts);
  };

  const updateCreditCard = (index, field, value) => {
    const newCards = [...creditCards];
    newCards[index][field] = value;
    setCreditCards(newCards);
  };

  const validateStep1 = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const emptyAccount = bankAccounts.find(acc => !acc.trim());
    if (emptyAccount !== undefined) {
      Alert.alert('Error', 'Please enter all bank account names');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (hasCreditCards) {
      const invalidCard = creditCards.find(
        card => !card.bankName.trim() || !card.billGenerationDay || !card.lastPaymentDay
      );
      if (invalidCard !== undefined) {
        Alert.alert('Error', 'Please fill all credit card details');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSignUp = async () => {
    setLoading(true);

    const userData = {
      name: name.trim(),
      email: email.trim(),
      birthdate: birthdate.toISOString(),
      password,
      mfsAccounts: hasMFS ? [...selectedMFS, ...(customMFSName.trim() ? [customMFSName.trim()] : [])] : [],
      bankAccounts: bankAccounts.filter(acc => acc.trim()),
      hasCreditCards,
      creditCards: hasCreditCards
        ? creditCards.map(card => ({
            bankName: card.bankName.trim(),
            billGenerationDay: parseInt(card.billGenerationDay),
            lastPaymentDay: parseInt(card.lastPaymentDay),
          }))
        : [],
      defaultMonthlyCost: defaultMonthlyCost ? parseFloat(defaultMonthlyCost) : null,
      defaultMonthlyDeposit: defaultMonthlyDeposit ? parseFloat(defaultMonthlyDeposit) : null,
      defaultDepositAccountName: defaultDepositAccount || null,
      defaultCostAccountName: defaultCostAccount || null,
    };

    const result = await signUp(userData);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Sign Up Failed', result.error);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStep1 = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>{formatDate(birthdate)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={birthdate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setBirthdate(selectedDate);
              }
            }}
            maximumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Create a password (min 6 characters)"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm your password"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </View>
    </>
  );

  const toggleMFSProvider = (provider) => {
    setSelectedMFS(prev =>
      prev.includes(provider)
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  const renderStep2 = () => (
    <>
      <View style={styles.switchContainer}>
        <Text style={styles.label}>Are you using MFS?</Text>
        <Switch
          value={hasMFS}
          onValueChange={(val) => {
            setHasMFS(val);
            if (!val) {
              setSelectedMFS([]);
              setCustomMFSName('');
            }
          }}
          trackColor={{ false: '#ddd', true: '#E91E63' }}
          thumbColor={hasMFS ? '#E91E63' : '#f4f3f4'}
        />
      </View>

      {hasMFS && (
        <View style={styles.mfsContainer}>
          <Text style={styles.smallLabel}>Select your MFS providers:</Text>
          <View style={styles.mfsOptions}>
            {['Bkash', 'Nagad', 'Rocket'].map((provider) => (
              <TouchableOpacity
                key={provider}
                style={[
                  styles.mfsChip,
                  selectedMFS.includes(provider) && styles.mfsChipSelected,
                ]}
                onPress={() => toggleMFSProvider(provider)}
              >
                <Text
                  style={[
                    styles.mfsChipText,
                    selectedMFS.includes(provider) && styles.mfsChipTextSelected,
                  ]}
                >
                  {provider}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.smallLabel}>Others (enter name)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Upay, SureCash"
              placeholderTextColor="#999"
              value={customMFSName}
              onChangeText={setCustomMFSName}
            />
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>How many bank accounts do you have?</Text>
        <TextInput
          style={styles.input}
          placeholder="Number of bank accounts"
          placeholderTextColor="#999"
          value={numBankAccounts}
          onChangeText={updateBankAccountCount}
          keyboardType="numeric"
        />
      </View>

      {bankAccounts.map((account, index) => (
        <View key={index} style={styles.inputContainer}>
          <Text style={styles.label}>Bank Account {index + 1} Name</Text>
          <TextInput
            style={styles.input}
            placeholder={`e.g., DBBL, Brac Bank, City Bank`}
            placeholderTextColor="#999"
            value={account}
            onChangeText={(value) => updateBankAccount(index, value)}
          />
        </View>
      ))}
    </>
  );

  const renderStep3 = () => (
    <>
      <View style={styles.switchContainer}>
        <Text style={styles.label}>Do you have any credit cards?</Text>
        <Switch
          value={hasCreditCards}
          onValueChange={setHasCreditCards}
          trackColor={{ false: '#ddd', true: '#90CAF9' }}
          thumbColor={hasCreditCards ? '#1E88E5' : '#f4f3f4'}
        />
      </View>

      {hasCreditCards && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Number of credit cards</Text>
            <TextInput
              style={styles.input}
              placeholder="Number of credit cards"
              placeholderTextColor="#999"
              value={numCreditCards}
              onChangeText={updateCreditCardCount}
              keyboardType="numeric"
            />
          </View>

          {creditCards.map((card, index) => (
            <View key={index} style={styles.cardContainer}>
              <Text style={styles.cardTitle}>Credit Card {index + 1}</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.smallLabel}>Bank Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., EBL, Standard Chartered"
                  placeholderTextColor="#999"
                  value={card.bankName}
                  onChangeText={(value) => updateCreditCard(index, 'bankName', value)}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.smallLabel}>Bill Generation Day</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={card.billGenerationDay}
                    onValueChange={(value) => updateCreditCard(index, 'billGenerationDay', value)}
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

              <View style={styles.inputContainer}>
                <Text style={styles.smallLabel}>Last Payment Day</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={card.lastPaymentDay}
                    onValueChange={(value) => updateCreditCard(index, 'lastPaymentDay', value)}
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
            </View>
          ))}
        </>
      )}
    </>
  );

  // Get all account names for default account selection
  const getAllAccountNames = () => {
    const names = [];
    bankAccounts.filter(a => a.trim()).forEach(a => names.push(a.trim()));
    if (hasMFS) {
      selectedMFS.forEach(m => names.push(m));
      if (customMFSName.trim()) names.push(customMFSName.trim());
    }
    return names;
  };

  const renderStep4 = () => {
    const accountNames = getAllAccountNames();

    return (
      <>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Default Monthly Budget (BDT)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 30000 (optional)"
            placeholderTextColor="#999"
            value={defaultMonthlyCost}
            onChangeText={setDefaultMonthlyCost}
            keyboardType="numeric"
          />
          <Text style={styles.smallLabel}>How much you plan to spend each month</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Expected Monthly Income (BDT)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 50000 (optional)"
            placeholderTextColor="#999"
            value={defaultMonthlyDeposit}
            onChangeText={setDefaultMonthlyDeposit}
            keyboardType="numeric"
          />
          <Text style={styles.smallLabel}>How much you expect to earn each month</Text>
        </View>

        {accountNames.length > 0 && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Default Deposit Account</Text>
              <Text style={styles.smallLabel}>Quick deposits will go to this account</Text>
              <View style={styles.defaultAccountOptions}>
                {accountNames.map((name) => (
                  <TouchableOpacity
                    key={`dep_${name}`}
                    style={[
                      styles.defaultAccountChip,
                      defaultDepositAccount === name && styles.defaultAccountChipActiveGreen,
                    ]}
                    onPress={() => setDefaultDepositAccount(defaultDepositAccount === name ? '' : name)}
                  >
                    <Text style={[
                      styles.defaultAccountChipText,
                      defaultDepositAccount === name && styles.defaultAccountChipTextActive,
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Default Cost Account</Text>
              <Text style={styles.smallLabel}>Quick expenses will be deducted from this account</Text>
              <View style={styles.defaultAccountOptions}>
                {accountNames.map((name) => (
                  <TouchableOpacity
                    key={`cost_${name}`}
                    style={[
                      styles.defaultAccountChip,
                      defaultCostAccount === name && styles.defaultAccountChipActiveRed,
                    ]}
                    onPress={() => setDefaultCostAccount(defaultCostAccount === name ? '' : name)}
                  >
                    <Text style={[
                      styles.defaultAccountChipText,
                      defaultCostAccount === name && styles.defaultAccountChipTextActive,
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>Step {step} of 4</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {step === 1 && 'Create Account'}
            {step === 2 && 'Bank Accounts'}
            {step === 3 && 'Credit Cards'}
            {step === 4 && 'Budget Settings'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 && 'Fill in your personal details'}
            {step === 2 && 'Add your bank accounts'}
            {step === 3 && 'Configure your credit cards (optional)'}
            {step === 4 && 'Set your monthly budget goals (optional)'}
          </Text>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={step === 4 ? handleSignUp : handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {step === 4 ? 'Create Account' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>

          {step === 4 && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Skip & Create Account</Text>
            </TouchableOpacity>
          )}

          <View style={styles.progressContainer}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  s === step && styles.progressDotActive,
                  s < step && styles.progressDotComplete,
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E88E5',
  },
  scrollContent: {
    flexGrow: 1,
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
  stepIndicator: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  cardContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E88E5',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayPicker: {
    height: 50,
  },
  button: {
    backgroundColor: '#1E88E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#90CAF9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
    marginHorizontal: 6,
  },
  progressDotActive: {
    backgroundColor: '#1E88E5',
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: '#4CAF50',
  },
  mfsContainer: {
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mfsOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  mfsChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mfsChipSelected: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  mfsChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  mfsChipTextSelected: {
    color: '#fff',
  },
  defaultAccountOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  defaultAccountChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  defaultAccountChipActiveGreen: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  defaultAccountChipActiveRed: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  defaultAccountChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  defaultAccountChipTextActive: {
    color: '#fff',
  },
});

export default SignUpScreen;
