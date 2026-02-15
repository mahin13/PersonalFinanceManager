import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, createUser, setTempPassword, updateUserPassword } from '../services/database';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const userData = await loginUser(email, password);

      // Check if user logged in with temp password
      if (userData.tempPassword && userData.password === userData.tempPassword) {
        setNeedsPasswordReset(true);
      }

      setUser(userData);
      await AsyncStorage.setItem('current_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (userData) => {
    try {
      const newUser = await createUser(userData);
      setUser(newUser);
      await AsyncStorage.setItem('current_user', JSON.stringify(newUser));
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('current_user');
      setUser(null);
      setNeedsPasswordReset(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const resetPassword = async (email) => {
    try {
      const tempPassword = await setTempPassword(email);
      return { success: true, tempPassword };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const changePassword = async (newPassword) => {
    try {
      await updateUserPassword(user.userId, newPassword);
      setNeedsPasswordReset(false);
      const updatedUser = { ...user, password: newPassword, tempPassword: null };
      setUser(updatedUser);
      await AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        needsPasswordReset,
        login,
        signUp,
        logout,
        resetPassword,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
