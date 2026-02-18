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
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
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
import {
  getBankAccounts,
  getCreditCards,
  addBankAccount,
  addCreditCard,
  updateUserProfile,
  getUserProfile,
  deleteBankAccount,
  deleteCreditCard,
} from '../services/database';


const ProfileScreen = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [hasCreditCards, setHasCreditCards] = useState(false);

  // Modal states
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newCardBankName, setNewCardBankName] = useState('');
  const [newBillDay, setNewBillDay] = useState(26);
  const [newPaymentDay, setNewPaymentDay] = useState(14);

  const loadData = async () => {
    if (!user) return;

    try {
      const [accounts, cards, profile] = await Promise.all([
        getBankAccounts(user.userId),
        getCreditCards(user.userId),
        getUserProfile(user.userId),
      ]);

      setBankAccounts(accounts);
      setCreditCards(cards);
      setUserName(profile?.name || user.name);
      setUserEmail(profile?.email || user.email);
      setProfileImage(profile?.profileImage || null);
      setHasCreditCards(profile?.hasCreditCards || cards.length > 0);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setProfileImage(imageUri);

      try {
        await updateUserProfile(user.userId, { profileImage: imageUri });
        Alert.alert('Success', 'Profile picture updated!');
      } catch (error) {
        Alert.alert('Error', 'Failed to save profile picture');
      }
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      await updateUserProfile(user.userId, { name: newName.trim() });
      setUserName(newName.trim());
      setShowEditNameModal(false);
      setNewName('');
      Alert.alert('Success', 'Name updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update name');
    }
  };

  const handleAddBank = async () => {
    if (!newBankName.trim()) {
      Alert.alert('Error', 'Please enter a bank name');
      return;
    }

    try {
      await addBankAccount(user.userId, newBankName.trim());
      setShowAddBankModal(false);
      setNewBankName('');
      loadData();
      Alert.alert('Success', 'Bank account added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add bank account');
    }
  };

  const handleAddCard = async () => {
    if (!newCardBankName.trim()) {
      Alert.alert('Error', 'Please enter a bank name');
      return;
    }

    try {
      await addCreditCard({
        userId: user.userId,
        bankName: newCardBankName.trim(),
        billGenerationDay: newBillDay,
        lastPaymentDay: newPaymentDay,
      });
      setShowAddCardModal(false);
      setNewCardBankName('');
      setNewBillDay(26);
      setNewPaymentDay(14);
      loadData();
      Alert.alert('Success', 'Credit card added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add credit card');
    }
  };

  const [showAddMFSModal, setShowAddMFSModal] = useState(false);
  const [selectedMFSProvider, setSelectedMFSProvider] = useState('');
  const [customMFSName, setCustomMFSName] = useState('');

  const mfsAccounts = bankAccounts.filter(a => a.type === 'mfs' || a.type === 'bkash');

  const handleAddMFS = async () => {
    const mfsName = selectedMFSProvider === 'Others' ? customMFSName.trim() : selectedMFSProvider;
    if (!mfsName) {
      Alert.alert('Error', 'Please select or enter an MFS provider name');
      return;
    }
    const alreadyExists = bankAccounts.some(a => (a.type === 'mfs' || a.type === 'bkash') && a.bankName.toLowerCase() === mfsName.toLowerCase());
    if (alreadyExists) {
      Alert.alert('Error', `${mfsName} is already added`);
      return;
    }
    try {
      await addBankAccount(user.userId, mfsName, 'mfs');
      setShowAddMFSModal(false);
      setSelectedMFSProvider('');
      setCustomMFSName('');
      loadData();
      Alert.alert('Success', `${mfsName} account added!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add MFS account');
    }
  };

  const handleToggleCreditCards = async (value) => {
    if (!value && creditCards.length > 0) {
      Alert.alert('Cannot Disable', 'You have existing credit cards. Delete them first to disable this feature.');
      return;
    }
    try {
      await updateUserProfile(user.userId, { hasCreditCards: value });
      setHasCreditCards(value);
      if (refreshUser) refreshUser();
    } catch (error) {
      Alert.alert('Error', 'Failed to update preference');
    }
  };

  const getAccountIcon = (account) => {
    const type = account.type || 'bank';
    if (type === 'mfs' || type === 'bkash') {
      return { bg: '#FCE4EC', color: '#E91E63', letter: 'M' };
    }
    return { bg: '#E8F5E9', color: '#4CAF50', letter: 'B' };
  };

  const handleDeleteBank = (accountId, bankName) => {
    Alert.alert(
      'Delete Bank Account',
      `Are you sure you want to delete "${bankName}"? This will also delete all related transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBankAccount(accountId);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bank account');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCard = (cardId, bankName) => {
    Alert.alert(
      'Delete Credit Card',
      `Are you sure you want to delete "${bankName}" credit card?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCreditCard(cardId);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete credit card');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitials}>{getInitials(userName)}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nameContainer}
            onPress={() => {
              setNewName(userName);
              setShowEditNameModal(true);
            }}
          >
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.editHint}>Tap to edit</Text>
          </TouchableOpacity>

          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        {/* Bank Accounts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
            <TouchableOpacity
              style={styles.addSmallButton}
              onPress={() => setShowAddBankModal(true)}
            >
              <Text style={styles.addSmallButtonText}>+ Add Bank</Text>
            </TouchableOpacity>
          </View>

          {/* MFS Section */}
          <TouchableOpacity style={styles.toggleRow} onPress={() => setShowAddMFSModal(true)}>
            <View style={[styles.listItemIcon, { backgroundColor: '#FCE4EC' }]}>
              <Text style={[styles.iconText, { color: '#E91E63' }]}>M</Text>
            </View>
            <Text style={[styles.listItemText, { flex: 1 }]}>Add MFS Account</Text>
            <Text style={styles.addSmallButtonText}>+ Add</Text>
          </TouchableOpacity>

          {bankAccounts.length === 0 ? (
            <Text style={styles.emptyText}>No bank accounts added</Text>
          ) : (
            bankAccounts.map((account) => {
              const icon = getAccountIcon(account);
              return (
                <View key={account.accountId} style={styles.listItem}>
                  <View style={[styles.listItemIcon, { backgroundColor: icon.bg }]}>
                    <Text style={[styles.iconText, { color: icon.color }]}>{icon.letter}</Text>
                  </View>
                  <Text style={styles.listItemText}>{account.bankName}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBank(account.accountId, account.bankName)}
                  >
                    <Text style={styles.deleteButtonText}>X</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Credit Cards Toggle & Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Credit Cards</Text>
            <Switch
              value={hasCreditCards}
              onValueChange={handleToggleCreditCards}
              trackColor={{ false: '#ddd', true: '#90CAF9' }}
              thumbColor={hasCreditCards ? '#1E88E5' : '#f4f3f4'}
            />
          </View>

          {hasCreditCards && (
            <>
              <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
                <TouchableOpacity
                  style={styles.addSmallButton}
                  onPress={() => setShowAddCardModal(true)}
                >
                  <Text style={styles.addSmallButtonText}>+ Add Card</Text>
                </TouchableOpacity>
              </View>

              {creditCards.length === 0 ? (
                <Text style={styles.emptyText}>No credit cards added</Text>
              ) : (
                creditCards.map((card) => (
                  <View key={card.cardId} style={styles.listItem}>
                    <View style={[styles.listItemIcon, { backgroundColor: '#E8EAF6' }]}>
                      <Text style={[styles.iconText, { color: '#3F51B5' }]}>C</Text>
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemText}>{card.bankName}</Text>
                      <Text style={styles.listItemSubtext}>
                        Bill: {card.billGenerationDay}th | Due: {card.lastPaymentDay}th
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCard(card.cardId, card.bankName)}
                    >
                      <Text style={styles.deleteButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}
        </View>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <Text style={styles.securityTitle}>Data Security</Text>
          <Text style={styles.securityText}>
            Your data is stored locally on your device only. No data is sent to any server or shared with third parties. Your information is private and secure.
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your name"
                  placeholderTextColor="#999"
                  value={newName}
                  onChangeText={setNewName}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowEditNameModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleUpdateName}
                  >
                    <Text style={styles.confirmButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Bank Modal */}
      <Modal
        visible={showAddBankModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddBankModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Bank Account</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Bank name (e.g., DBBL, Brac Bank)"
                  placeholderTextColor="#999"
                  value={newBankName}
                  onChangeText={setNewBankName}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddBankModal(false);
                      setNewBankName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleAddBank}
                  >
                    <Text style={styles.confirmButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add MFS Modal */}
      <Modal
        visible={showAddMFSModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMFSModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add MFS Account</Text>
                <Text style={{ color: '#666', marginBottom: 12 }}>Select a provider:</Text>
                <View style={styles.mfsOptions}>
                  {['Bkash', 'Nagad', 'Rocket', 'Others'].map((provider) => (
                    <TouchableOpacity
                      key={provider}
                      style={[
                        styles.mfsChip,
                        selectedMFSProvider === provider && styles.mfsChipSelected,
                      ]}
                      onPress={() => {
                        setSelectedMFSProvider(provider);
                        if (provider !== 'Others') setCustomMFSName('');
                      }}
                    >
                      <Text
                        style={[
                          styles.mfsChipText,
                          selectedMFSProvider === provider && styles.mfsChipTextSelected,
                        ]}
                      >
                        {provider}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedMFSProvider === 'Others' && (
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter MFS provider name"
                    placeholderTextColor="#999"
                    value={customMFSName}
                    onChangeText={setCustomMFSName}
                  />
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddMFSModal(false);
                      setSelectedMFSProvider('');
                      setCustomMFSName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleAddMFS}
                  >
                    <Text style={styles.confirmButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Card Modal */}
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
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Bank name (e.g., EBL, SCB)"
                    placeholderTextColor="#999"
                    value={newCardBankName}
                    onChangeText={setNewCardBankName}
                  />
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.inputLabel}>Bill Generation Day</Text>
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
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.inputLabel}>Last Payment Day</Text>
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
                      setNewCardBankName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleAddCard}
                  >
                    <Text style={styles.confirmButtonText}>Add</Text>
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginBottom: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  nameContainer: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  editHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addSmallButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addSmallButtonText: {
    color: '#1E88E5',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
    borderStyle: 'dashed',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  listItemContent: {
    flex: 1,
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  listItemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  securitySection: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
  mfsOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
});

export default ProfileScreen;
