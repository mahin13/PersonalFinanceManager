import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { getTransactions, getAllBalances, getPendingCreditCardBills } from '../services/database';

const FinancialInsights = ({ userId, defaultMonthlyCost, defaultMonthlyDeposit }) => {
  const [insights, setInsights] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (userId) generateInsights();
  }, [userId, defaultMonthlyCost, defaultMonthlyDeposit]);

  const generateInsights = async () => {
    try {
      const [monthlyTransactions, allTransactions, balances, pendingBills] = await Promise.all([
        getTransactions(userId, 'monthly'),
        getTransactions(userId, 'all'),
        getAllBalances(userId),
        getPendingCreditCardBills(userId),
      ]);

      const dataInsights = [];
      const genericTips = [];

      // Analyze current month
      const categories = {};
      let totalWithdrawals = 0;
      let totalDeposits = 0;
      let biggestExpense = { amount: 0, reason: '' };
      const categoryCounts = {};
      let weekdaySpend = 0;
      let weekendSpend = 0;

      monthlyTransactions.forEach((t) => {
        const amount = parseFloat(t.amount);
        if (t.type === 'Withdrawal') {
          totalWithdrawals += amount;
          const reason = t.reason?.toLowerCase() || 'other';
          categories[reason] = (categories[reason] || 0) + amount;
          categoryCounts[reason] = (categoryCounts[reason] || 0) + 1;

          if (amount > biggestExpense.amount) {
            biggestExpense = { amount, reason: t.reason || 'Unknown' };
          }

          const dayOfWeek = new Date(t.date).getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendSpend += amount;
          } else {
            weekdaySpend += amount;
          }
        } else {
          totalDeposits += amount;
        }
      });

      // Last month data for comparison
      const now = new Date();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      let lastMonthWithdrawals = 0;
      let lastMonthDeposits = 0;

      allTransactions.forEach((t) => {
        const tDate = new Date(t.date);
        if (tDate >= lastMonthStart && tDate <= lastMonthEnd) {
          if (t.type === 'Withdrawal') {
            lastMonthWithdrawals += parseFloat(t.amount);
          } else {
            lastMonthDeposits += parseFloat(t.amount);
          }
        }
      });

      const totalBalance = Object.values(balances).reduce(
        (sum, acc) => sum + acc.balance, 0
      );

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dayOfMonth = now.getDate();

      // ========== DATA-DRIVEN INSIGHTS ==========

      // 1. Budget tracking (if set)
      if (defaultMonthlyCost && defaultMonthlyCost > 0) {
        const budgetUsed = (totalWithdrawals / defaultMonthlyCost) * 100;
        const budgetColor = budgetUsed > 90 ? '#F44336' : budgetUsed > 70 ? '#FF9800' : '#4CAF50';
        dataInsights.push({
          type: 'budget',
          title: 'Monthly Budget',
          message: `You've used ${budgetUsed.toFixed(0)}% of your ${defaultMonthlyCost.toLocaleString()} BDT budget`,
          icon: '$',
          progress: Math.min(budgetUsed / 100, 1),
          progressColor: budgetColor,
          detail: `${totalWithdrawals.toLocaleString()} / ${defaultMonthlyCost.toLocaleString()} BDT`,
        });
      }

      // 2. Income tracking (if set)
      if (defaultMonthlyDeposit && defaultMonthlyDeposit > 0) {
        const incomeReceived = (totalDeposits / defaultMonthlyDeposit) * 100;
        const incomeColor = incomeReceived >= 100 ? '#4CAF50' : incomeReceived >= 50 ? '#FF9800' : '#F44336';
        dataInsights.push({
          type: 'income',
          title: 'Expected Income',
          message: `You've received ${incomeReceived.toFixed(0)}% of your expected ${defaultMonthlyDeposit.toLocaleString()} BDT income`,
          icon: '+',
          progress: Math.min(incomeReceived / 100, 1),
          progressColor: incomeColor,
          detail: `${totalDeposits.toLocaleString()} / ${defaultMonthlyDeposit.toLocaleString()} BDT`,
        });
      }

      // 3. Month-over-month comparison
      if (lastMonthWithdrawals > 0) {
        const changePercent = ((totalWithdrawals - lastMonthWithdrawals) / lastMonthWithdrawals) * 100;
        const isHigher = changePercent > 0;
        dataInsights.push({
          type: isHigher ? 'warning' : 'success',
          title: 'Month-over-Month',
          message: `Spending is ${Math.abs(changePercent).toFixed(0)}% ${isHigher ? 'higher' : 'lower'} than last month`,
          icon: isHigher ? '^' : 'v',
          trend: isHigher ? 'up' : 'down',
        });
      }

      // 4. Daily average spending
      if (totalWithdrawals > 0 && dayOfMonth > 0) {
        const dailyAvg = totalWithdrawals / dayOfMonth;
        dataInsights.push({
          type: 'info',
          title: 'Daily Average',
          message: `You spend ~${dailyAvg.toFixed(0).toLocaleString()} BDT per day this month`,
          icon: '#',
        });
      }

      // 5. Biggest single expense
      if (biggestExpense.amount > 0) {
        dataInsights.push({
          type: 'info',
          title: 'Largest Expense',
          message: `Your biggest expense: ${biggestExpense.amount.toLocaleString()} BDT on "${biggestExpense.reason}"`,
          icon: '!',
        });
      }

      // 6. Most frequent category
      const sortedCategoryCounts = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
      if (sortedCategoryCounts.length > 0) {
        const [topCat, topCount] = sortedCategoryCounts[0];
        if (topCount >= 2) {
          dataInsights.push({
            type: 'info',
            title: 'Most Frequent',
            message: `You spent on "${topCat}" ${topCount} times this month`,
            icon: '*',
          });
        }
      }

      // 7. Projected month-end balance
      if (totalWithdrawals > 0 && dayOfMonth > 1) {
        const dailySpendRate = totalWithdrawals / dayOfMonth;
        const remainingDays = daysInMonth - dayOfMonth;
        const projectedSpend = totalWithdrawals + (dailySpendRate * remainingDays);
        const projectedBalance = totalBalance - (dailySpendRate * remainingDays);
        dataInsights.push({
          type: projectedBalance < 0 ? 'warning' : 'info',
          title: 'Month-end Projection',
          message: `At current rate, projected month-end balance: ${projectedBalance.toFixed(0).toLocaleString()} BDT (total spend: ~${projectedSpend.toFixed(0).toLocaleString()} BDT)`,
          icon: '>',
        });
      }

      // 8. Next bill due
      if (pendingBills.length > 0) {
        const totalPending = pendingBills.reduce((sum, b) => sum + parseFloat(b.billAmount), 0);
        dataInsights.push({
          type: 'warning',
          title: 'Pending CC Bills',
          message: `You have ${pendingBills.length} pending bill${pendingBills.length > 1 ? 's' : ''} totaling ${totalPending.toLocaleString()} BDT`,
          icon: 'C',
        });
      }

      // 9. Weekday vs weekend spending
      if (weekdaySpend > 0 && weekendSpend > 0) {
        const weekdayDays = monthlyTransactions.filter(t => {
          const d = new Date(t.date).getDay();
          return t.type === 'Withdrawal' && d > 0 && d < 6;
        }).length || 1;
        const weekendDays = monthlyTransactions.filter(t => {
          const d = new Date(t.date).getDay();
          return t.type === 'Withdrawal' && (d === 0 || d === 6);
        }).length || 1;

        const avgWeekday = weekdaySpend / weekdayDays;
        const avgWeekend = weekendSpend / weekendDays;

        if (avgWeekend > avgWeekday * 1.2) {
          const percentMore = ((avgWeekend - avgWeekday) / avgWeekday * 100).toFixed(0);
          dataInsights.push({
            type: 'tip',
            title: 'Weekend Spending',
            message: `You spend ${percentMore}% more per transaction on weekends`,
            icon: 'W',
          });
        }
      }

      // 10. Spending trend (compare first half vs second half of month)
      if (dayOfMonth > 14) {
        let firstHalf = 0;
        let secondHalf = 0;
        monthlyTransactions.forEach(t => {
          if (t.type === 'Withdrawal') {
            const d = new Date(t.date).getDate();
            if (d <= 15) firstHalf += parseFloat(t.amount);
            else secondHalf += parseFloat(t.amount);
          }
        });
        if (firstHalf > 0) {
          const trend = secondHalf > firstHalf ? 'increasing' : 'decreasing';
          dataInsights.push({
            type: trend === 'increasing' ? 'warning' : 'success',
            title: 'Spending Trend',
            message: `Your spending is ${trend} in the second half of the month`,
            icon: trend === 'increasing' ? '^' : 'v',
            trend: trend === 'increasing' ? 'up' : 'down',
          });
        }
      }

      // ========== GENERIC TIPS (lower priority) ==========

      // Savings Rate Analysis
      if (totalDeposits > 0) {
        const savingsRate = ((totalDeposits - totalWithdrawals) / totalDeposits) * 100;
        if (savingsRate < 20) {
          genericTips.push({
            type: 'warning',
            title: 'Low Savings Rate',
            message: `You're saving only ${savingsRate.toFixed(0)}% of your income. Try to save at least 20-30%.`,
            icon: '!',
          });
        } else if (savingsRate >= 30) {
          genericTips.push({
            type: 'success',
            title: 'Great Savings!',
            message: `You're saving ${savingsRate.toFixed(0)}% of your income. Consider investing the surplus.`,
            icon: '*',
          });
        }
      }

      // Category-wise spending
      const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
      if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const percentage = totalWithdrawals > 0 ? (topAmount / totalWithdrawals) * 100 : 0;
        if (percentage > 40) {
          genericTips.push({
            type: 'info',
            title: `High Spending: ${topCategory}`,
            message: `${percentage.toFixed(0)}% of your expenses go to "${topCategory}".`,
            icon: 'i',
          });
        }
      }

      // Emergency Fund
      if (totalBalance < totalWithdrawals * 3 && totalWithdrawals > 0) {
        genericTips.push({
          type: 'warning',
          title: 'Build Emergency Fund',
          message: `Aim to save 3-6 months of expenses for emergencies.`,
          icon: '!',
        });
      }

      // Investment suggestion
      if (totalBalance > totalWithdrawals * 6 && totalWithdrawals > 0) {
        genericTips.push({
          type: 'invest',
          title: 'Investment Opportunity',
          message: 'You have surplus funds! Consider Fixed Deposits, Sanchayapatra, or Mutual Funds.',
          icon: '+',
        });
      }

      // 50/30/20 Rule
      genericTips.push({
        type: 'tip',
        title: '50/30/20 Budget Rule',
        message: '50% for Needs, 30% for Wants, 20% for Savings & Investments',
        icon: '$',
      });

      // Fallback tips
      if (dataInsights.length + genericTips.length < 3) {
        genericTips.push({
          type: 'tip',
          title: 'Automate Savings',
          message: 'Set up automatic transfers to a savings account on payday.',
          icon: '$',
        });
        genericTips.push({
          type: 'invest',
          title: 'Start Small Investments',
          message: 'Even 500-1000 BDT monthly in a recurring deposit can grow significantly.',
          icon: '+',
        });
      }

      // Data-driven first, then generic tips
      setInsights([...dataInsights, ...genericTips]);
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
      case 'budget':
        return { backgroundColor: '#FFEBEE', color: '#F44336' };
      case 'income':
        return { backgroundColor: '#E8F5E9', color: '#4CAF50' };
      default:
        return { backgroundColor: '#E0F7FA', color: '#00BCD4' };
    }
  };

  const getTrendArrow = (trend) => {
    if (trend === 'up') return { arrow: '^', color: '#F44336' };
    if (trend === 'down') return { arrow: 'v', color: '#4CAF50' };
    return null;
  };

  const displayedInsights = expanded ? insights : insights.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Insights</Text>
        <Text style={styles.subtitle}>Data-driven tips & analysis</Text>
      </View>

      {displayedInsights.map((insight, index) => {
        const iconStyle = getIconStyle(insight.type);
        const trendInfo = insight.trend ? getTrendArrow(insight.trend) : null;
        return (
          <View key={index} style={styles.insightCard}>
            <View style={[styles.iconContainer, { backgroundColor: iconStyle.backgroundColor }]}>
              <Text style={[styles.icon, { color: iconStyle.color }]}>{insight.icon}</Text>
            </View>
            <View style={styles.insightContent}>
              <View style={styles.insightTitleRow}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                {trendInfo && (
                  <Text style={[styles.trendArrow, { color: trendInfo.color }]}>
                    {trendInfo.arrow}
                  </Text>
                )}
              </View>
              <Text style={styles.insightMessage}>{insight.message}</Text>

              {/* Progress bar for budget/income */}
              {insight.progress !== undefined && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(insight.progress * 100, 100)}%`,
                          backgroundColor: insight.progressColor || '#1E88E5',
                        },
                      ]}
                    />
                  </View>
                  {insight.detail && (
                    <Text style={styles.progressDetail}>{insight.detail}</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}

      {insights.length > 4 && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? 'Show Less' : `Show ${insights.length - 4} More Insights`}
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
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  trendArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  insightMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressDetail: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
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
