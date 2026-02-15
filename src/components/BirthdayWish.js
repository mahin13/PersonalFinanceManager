import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';

const BirthdayWish = ({ userName, birthdate }) => {
  const [showWish, setShowWish] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    checkBirthday();
  }, [birthdate]);

  const checkBirthday = () => {
    if (!birthdate) return;

    const today = new Date();
    const birth = new Date(birthdate);

    // Check if today is the user's birthday (same month and day)
    if (
      today.getMonth() === birth.getMonth() &&
      today.getDate() === birth.getDate()
    ) {
      setShowWish(true);
      // Animate the modal
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleClose = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowWish(false));
  };

  const getAge = () => {
    if (!birthdate) return '';
    const today = new Date();
    const birth = new Date(birthdate);
    const age = today.getFullYear() - birth.getFullYear();
    return age;
  };

  const getBirthdayMessage = () => {
    const messages = [
      `Wishing you a fantastic ${getAge()}th birthday filled with joy and prosperity!`,
      `Happy ${getAge()}th Birthday! May this year bring you closer to all your financial goals!`,
      `Cheers to ${getAge()} amazing years! Here's to smart savings and great investments!`,
      `${getAge()} looks great on you! May your wealth grow as much as your wisdom!`,
      `Happy Birthday! At ${getAge()}, you're wiser and wealthier. Keep it up!`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  if (!showWish) return null;

  return (
    <Modal
      visible={showWish}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Confetti decoration */}
          <View style={styles.confettiContainer}>
            <Text style={styles.confetti}>*</Text>
            <Text style={[styles.confetti, styles.confetti2]}>*</Text>
            <Text style={[styles.confetti, styles.confetti3]}>*</Text>
            <Text style={[styles.confetti, styles.confetti4]}>*</Text>
            <Text style={[styles.confetti, styles.confetti5]}>*</Text>
          </View>

          {/* Cake icon */}
          <View style={styles.cakeContainer}>
            <Text style={styles.cake}>[CAKE]</Text>
          </View>

          <Text style={styles.title}>Happy Birthday!</Text>
          <Text style={styles.name}>{userName}</Text>

          <View style={styles.ageContainer}>
            <Text style={styles.ageNumber}>{getAge()}</Text>
            <Text style={styles.ageText}>Years Young!</Text>
          </View>

          <Text style={styles.message}>{getBirthdayMessage()}</Text>

          {/* Birthday tips */}
          <View style={styles.tipContainer}>
            <Text style={styles.tipTitle}>Birthday Tip:</Text>
            <Text style={styles.tipText}>
              Consider starting a yearly tradition of investing a portion of any birthday money you receive. It's a gift that keeps growing!
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>Thank You!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  confetti: {
    position: 'absolute',
    fontSize: 24,
    color: '#FFD700',
  },
  confetti2: {
    left: '20%',
    top: 20,
    color: '#FF69B4',
  },
  confetti3: {
    left: '40%',
    top: 10,
    color: '#00CED1',
  },
  confetti4: {
    left: '60%',
    top: 25,
    color: '#FF6347',
  },
  confetti5: {
    left: '80%',
    top: 15,
    color: '#9370DB',
  },
  cakeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  cake: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  ageContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  ageNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  ageText: {
    fontSize: 18,
    color: '#666',
    marginLeft: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  tipContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default BirthdayWish;
