import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { getTransactions, getAllBalances } from '../services/database';

const FinancialInsights = ({ userId }) => {
  const [insights, setInsights] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    generateInsights();
  }, [userId]);

  const generateInsights = async () => {
    try {
      const transactions = await getTransactions(userId, 'monthly');
      const balances = await getAllBalances(userId);

      const tips = [];

      // Analyze spending by category
      const categories = {};
      let totalWithdrawals = 0;
      let totalDeposits = 0;

      transactions.forEach((t) => {
        if (t.type === 'Withdrawal') {
          totalWithdrawals += parseFloat(t.amount);
          const reason = t.reason?.toLowerCase() || 'other';
          categories[reason] = (categories[reason] || 0) + parseFloat(t.amount);
        } else {
          totalDeposits += parseFloat(t.amount);
        }
      });

      // Calculate total balance
      const totalBalance = Object.values(balances).reduce(
        (sum, acc) => sum + acc.balance,
        0
      );

      // Generate insights based on spending patterns

      // 1. Savings Rate Analysis
      if (totalDeposits > 0) {
        const savingsRate = ((totalDeposits - totalWithdrawals) / totalDeposits) * 100;
        if (savingsRate < 20) {
          tips.push({
            type: 'warning',
            title: 'Low Savings Rate',
            message: `You're saving only ${savingsRate.toFixed(0)}% of your income. Try to save at least 20-30% for financial security.`,
            icon: '!',
          });
        } else if (savingsRate >= 30) {
          tips.push({
            type: 'success',
            title: 'Great Savings!',
            message: `You're saving ${savingsRate.toFixed(0)}% of your income. Consider investing the surplus for better returns.`,
            icon: '*',
          });
        }
      }

      // 2. Category-wise spending tips
      const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

      if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const percentage = totalWithdrawals > 0 ? (topAmount / totalWithdrawals) * 100 : 0;

        if (percentage > 40) {
          tips.push({
            type: 'info',
            title: `High Spending: ${topCategory}`,
            message: `${percentage.toFixed(0)}% of your expenses go to "${topCategory}". Consider setting a budget limit for this category.`,
            icon: 'i',
          });
        }
      }

      // 3. Food/Entertainment spending
      const entertainmentKeywords = ['entertainment', 'movie', 'game', 'fun', 'party'];
      const foodKeywords = ['food', 'restaurant', 'dining', 'eat', 'lunch', 'dinner', 'breakfast'];

      let entertainmentSpend = 0;
      let foodSpend = 0;

      Object.entries(categories).forEach(([cat, amount]) => {
        if (entertainmentKeywords.some((k) => cat.includes(k))) {
          entertainmentSpend += amount;
        }
        if (foodKeywords.some((k) => cat.includes(k))) {
          foodSpend += amount;
        }
      });

      if (foodSpend > totalWithdrawals * 0.3) {
        tips.push({
          type: 'tip',
          title: 'Reduce Food Expenses',
          message: 'Consider meal prepping at home. You can save 40-60% compared to eating out regularly.',
          icon: '$',
        });
      }

      if (entertainmentSpend > totalWithdrawals * 0.15) {
        tips.push({
          type: 'tip',
          title: 'Entertainment Budget',
          message: 'Look for free or low-cost entertainment options like parks, free events, or streaming services instead of frequent outings.',
          icon: '$',
        });
      }

      // 4. Emergency Fund Check
      const monthlyExpense = totalWithdrawals;
      if (totalBalance < monthlyExpense * 3) {
        tips.push({
          type: 'warning',
          title: 'Build Emergency Fund',
          message: `Aim to save 3-6 months of expenses (${(monthlyExpense * 3).toLocaleString()} - ${(monthlyExpense * 6).toLocaleString()} BDT) for emergencies.`,
          icon: '!',
        });
      }

      // 5. Investment suggestions based on balance
      if (totalBalance > monthlyExpense * 6) {
        tips.push({
          type: 'invest',
          title: 'Investment Opportunity',
          message: 'You have surplus funds! Consider: \n- Fixed Deposits (6-8% returns)\n- Sanchayapatra (11-12% returns)\n- Mutual Funds\n- Stock Market (higher risk, higher returns)',
          icon: '+',
        });
      }

      // 6. 50/30/20 Rule suggestion
      tips.push({
        type: 'tip',
        title: '50/30/20 Budget Rule',
        message: 'Allocate your income:\n- 50% for Needs (rent, bills, food)\n- 30% for Wants (entertainment, shopping)\n- 20% for Savings & Investments',
        icon: '$',
      });

      // 7. Subscription check
      const subscriptionKeywords = ['subscription', 'netflix', 'spotify', 'gym', 'membership'];
      const hasSubscriptions = Object.keys(categories).some((cat) =>
        subscriptionKeywords.some((k) => cat.includes(k))
      );

      if (hasSubscriptions) {
        tips.push({
          type: 'tip',
          title: 'Review Subscriptions',
          message: 'Audit your subscriptions monthly. Cancel unused ones - small recurring costs add up significantly over time.',
          icon: '$',
        });
      }

      // 8. Transport costs
      const transportKeywords = ['transport', 'uber', 'pathao', 'fuel', 'petrol', 'gas', 'taxi', 'bus'];
      let transportSpend = 0;
      Object.entries(categories).forEach(([cat, amount]) => {
        if (transportKeywords.some((k) => cat.includes(k))) {
          transportSpend += amount;
        }
      });

      if (transportSpend > totalWithdrawals * 0.15) {
        tips.push({
          type: 'tip',
          title: 'Reduce Transport Costs',
          message: 'Consider carpooling, public transport, or combining multiple errands in one trip to save on transportation.',
          icon: '$',
        });
      }

      // 9. Shopping habits
      const shoppingKeywords = ['shopping', 'clothes', 'fashion', 'amazon', 'online'];
      let shoppingSpend = 0;
      Object.entries(categories).forEach(([cat, amount]) => {
        if (shoppingKeywords.some((k) => cat.includes(k))) {
          shoppingSpend += amount;
        }
      });

      if (shoppingSpend > totalWithdrawals * 0.2) {
        tips.push({
          type: 'tip',
          title: 'Smart Shopping',
          message: 'Wait 24-48 hours before making non-essential purchases. Use the 30-day rule for big purchases to avoid impulse buying.',
          icon: '$',
        });
      }

      // 10. General saving tips (always show at least some tips)
      if (tips.length < 3) {
        tips.push({
          type: 'tip',
          title: 'Automate Savings',
          message: 'Set up automatic transfers to a savings account on payday. Pay yourself first before spending.',
          icon: '$',
        });

        tips.push({
          type: 'invest',
          title: 'Start Small Investments',
          message: 'Even 500-1000 BDT monthly in a recurring deposit or mutual fund SIP can grow significantly over time.',
          icon: '+',
        });
      }

      setInsights(tips);
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const getIconStyle = (type) => {
    switch (type) {
      case 'warning':
        return { backgroundColor: '#FFF3E0', color: '#FF9800' };
      case 'success':
        return { backgroundColor: '#E8F5E9', color: '#4CAF50' };
      case 'invest':
        return { backgroundColor: '#E3F2FD', color: '#1E88E5' };
      case 'info':
        return { backgroundColor: '#F3E5F5', color: '#9C27B0' };
      default:
        return { backgroundColor: '#E0F7FA', color: '#00BCD4' };
    }
  };

  const displayedInsights = expanded ? insights : insights.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Insights</Text>
        <Text style={styles.subtitle}>Personalized tips to save money</Text>
      </View>

      {displayedInsights.map((insight, index) => {
        const iconStyle = getIconStyle(insight.type);
        return (
          <View key={index} style={styles.insightCard}>
            <View style={[styles.iconContainer, { backgroundColor: iconStyle.backgroundColor }]}>
              <Text style={[styles.icon, { color: iconStyle.color }]}>{insight.icon}</Text>
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightMessage}>{insight.message}</Text>
            </View>
          </View>
        );
      })}

      {insights.length > 3 && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? 'Show Less' : `Show ${insights.length - 3} More Tips`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  expandButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  expandButtonText: {
    color: '#1E88E5',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FinancialInsights;
