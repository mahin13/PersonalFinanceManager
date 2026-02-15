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
import { useAuth } from '../context/AuthContext';

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
  const [numBankAccounts, setNumBankAccounts] = useState('1');
  const [bankAccounts, setBankAccounts] = useState(['']);

  // Step 3: Credit Cards
  const [hasCreditCards, setHasCreditCards] = useState(false);
  const [numCreditCards, setNumCreditCards] = useState('1');
  const [creditCards, setCreditCards] = useState([
    { bankName: '', billGenerationDay: '26', lastPaymentDay: '14' }
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
      newCards.push({ bankName: '', billGenerationDay: '26', lastPaymentDay: '14' });
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
    if (!validateStep3()) return;

    setLoading(true);

    const userData = {
      name: name.trim(),
      email: email.trim(),
      birthdate: birthdate.toISOString(),
      password,
      bankAccounts: bankAccounts.filter(acc => acc.trim()),
      hasCreditCards,
      creditCards: hasCreditCards
        ? creditCards.map(card => ({
            bankName: card.bankName.trim(),
            billGenerationDay: parseInt(card.billGenerationDay),
            lastPaymentDay: parseInt(card.lastPaymentDay),
          }))
        : [],
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

  const renderStep2 = () => (
    <>
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

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.smallLabel}>Bill Generation Day</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 26"
                    placeholderTextColor="#999"
                    value={card.billGenerationDay}
                    onChangeText={(value) => updateCreditCard(index, 'billGenerationDay', value)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.smallLabel}>Last Payment Day</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 14"
                    placeholderTextColor="#999"
                    value={card.lastPaymentDay}
                    onChangeText={(value) => updateCreditCard(index, 'lastPaymentDay', value)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </>
  );

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
          <Text style={styles.stepIndicator}>Step {step} of 3</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {step === 1 && 'Create Account'}
            {step === 2 && 'Bank Accounts'}
            {step === 3 && 'Credit Cards'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 && 'Fill in your personal details'}
            {step === 2 && 'Add your bank accounts'}
            {step === 3 && 'Configure your credit cards (optional)'}
          </Text>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={step === 3 ? handleSignUp : handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {step === 3 ? 'Create Account' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
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
});

export default SignUpScreen;
