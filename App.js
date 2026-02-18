import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { requestNotificationPermissions, scheduleBillReminders } from './src/services/notificationService';
import { getCreditCards, getUserProfile } from './src/services/database';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DepositScreen from './src/screens/DepositScreen';
import WithdrawalScreen from './src/screens/WithdrawalScreen';
import CreditCardsScreen from './src/screens/CreditCardsScreen';
import PendingItemsScreen from './src/screens/PendingItemsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icon Component
const TabIcon = ({ label, focused }) => {
  const icons = {
    Dashboard: focused ? '[=]' : '[ ]',
    Transactions: focused ? '[$]' : '[ ]',
    'Credit Cards': focused ? '[C]' : '[ ]',
    Pending: focused ? '[!]' : '[ ]',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icons[label] || '[ ]'}
      </Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  const { user } = useAuth();
  const [showCreditCards, setShowCreditCards] = useState(false);

  useEffect(() => {
    const checkCreditCards = async () => {
      if (!user) return;
      try {
        const [profile, cards] = await Promise.all([
          getUserProfile(user.userId),
          getCreditCards(user.userId),
        ]);
        setShowCreditCards(profile?.hasCreditCards === true || cards.length > 0);
      } catch (error) {
        console.error('Error checking credit cards:', error);
      }
    };
    checkCreditCards();
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      {showCreditCards && (
        <Tab.Screen name="Credit Cards" component={CreditCardsScreen} />
      )}
      <Tab.Screen name="Pending" component={PendingItemsScreen} />
    </Tab.Navigator>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

// App Stack Navigator (authenticated)
const AppStack = () => {
  const { needsPasswordReset } = useAuth();

  if (needsPasswordReset) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Deposit" component={DepositScreen} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      // Request notification permissions and schedule reminders on login
      const setupNotifications = async () => {
        const granted = await requestNotificationPermissions();
        if (granted) {
          await scheduleBillReminders(user.userId);
        }
      };
      setupNotifications();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  tabIconFocused: {
    color: '#1E88E5',
  },
  tabLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  tabLabelFocused: {
    color: '#1E88E5',
    fontWeight: '600',
  },
});
