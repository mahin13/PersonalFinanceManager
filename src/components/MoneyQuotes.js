import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const QUOTES = [
  // Mesbaul Hasan Quote
  {
    text: 'Whatever you have achieved has already been written in your rizq by Allah. If you feel your manager or boss has given you less salary or bonus than you deserve, then they have taken your right — and you will receive justice for it from Allah.',
    author: 'Mesbaul Hasan',
    category: 'islamic',
  },
  // Islamic Savings & Finance
  {
    text: 'And those who, when they spend, are neither extravagant nor miserly, but hold a medium (way) between those (extremes).',
    author: 'Quran 25:67',
    category: 'islamic',
  },
  {
    text: 'Take benefit of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your preoccupation, and your life before your death.',
    author: 'Prophet Muhammad (PBUH)',
    category: 'islamic',
  },
  {
    text: 'Wealth is not in having many possessions. Rather, true wealth is the richness of the soul.',
    author: 'Prophet Muhammad (PBUH)',
    category: 'islamic',
  },
  {
    text: 'Charity does not decrease wealth.',
    author: 'Prophet Muhammad (PBUH)',
    category: 'islamic',
  },
  {
    text: 'And do not make your hand tied to your neck (be miserly), nor stretch it forth to its utmost reach (be extravagant), so that you become blameworthy and in severe poverty.',
    author: 'Quran 17:29',
    category: 'islamic',
  },
  {
    text: 'Allah loves to see His servant making effort to earn a halal livelihood.',
    author: 'Hadith',
    category: 'islamic',
  },
  {
    text: 'The upper hand is better than the lower hand. The upper hand is the one that gives, and the lower hand is the one that receives.',
    author: 'Prophet Muhammad (PBUH)',
    category: 'islamic',
  },
  // Famous Money Quotes
  {
    text: 'Do not save what is left after spending, but spend what is left after saving.',
    author: 'Warren Buffett',
    category: 'money',
  },
  {
    text: 'The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order.',
    author: 'T.T. Munger',
    category: 'money',
  },
  {
    text: 'A penny saved is a penny earned.',
    author: 'Benjamin Franklin',
    category: 'money',
  },
  {
    text: 'It is not the man who has too little, but the man who craves more, that is poor.',
    author: 'Seneca',
    category: 'money',
  },
  {
    text: 'Money is a terrible master but an excellent servant.',
    author: 'P.T. Barnum',
    category: 'money',
  },
  {
    text: 'The art is not in making money, but in keeping it.',
    author: 'Proverb',
    category: 'money',
  },
  {
    text: 'Beware of little expenses. A small leak will sink a great ship.',
    author: 'Benjamin Franklin',
    category: 'money',
  },
  {
    text: 'Financial peace is not the acquisition of stuff. It is learning to live on less than you make.',
    author: 'Dave Ramsey',
    category: 'money',
  },
  {
    text: 'The goal is not to be rich. The goal is to be free.',
    author: 'Unknown',
    category: 'money',
  },
  {
    text: 'Rich people stay rich by living like they are broke. Broke people stay broke by living like they are rich.',
    author: 'Unknown',
    category: 'money',
  },
];

const MoneyQuotes = () => {
  const [currentQuote, setCurrentQuote] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Show a random quote on load
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    setCurrentQuote(QUOTES[randomIndex]);
  }, []);

  const getNewQuote = () => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * QUOTES.length);
    } while (QUOTES[newIndex] === currentQuote && QUOTES.length > 1);
    setCurrentQuote(QUOTES[newIndex]);
  };

  const getCategoryStyle = (category) => {
    if (category === 'islamic') {
      return { bg: '#E8F5E9', color: '#2E7D32', label: 'Islamic' };
    }
    return { bg: '#E3F2FD', color: '#1565C0', label: 'Finance' };
  };

  if (!currentQuote) return null;

  const catStyle = getCategoryStyle(currentQuote.category);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Words of Wisdom</Text>
        <TouchableOpacity onPress={getNewQuote} style={styles.refreshButton}>
          <Text style={styles.refreshText}>New Quote</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quoteCard}>
        <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
          <Text style={[styles.categoryText, { color: catStyle.color }]}>
            {catStyle.label}
          </Text>
        </View>
        <Text style={styles.quoteText}>"{currentQuote.text}"</Text>
        <Text style={styles.authorText}>- {currentQuote.author}</Text>
      </View>

      {showAll && (
        <>
          {QUOTES.filter(q => q !== currentQuote).map((quote, index) => {
            const qStyle = getCategoryStyle(quote.category);
            return (
              <View key={index} style={styles.quoteCard}>
                <View style={[styles.categoryBadge, { backgroundColor: qStyle.bg }]}>
                  <Text style={[styles.categoryText, { color: qStyle.color }]}>
                    {qStyle.label}
                  </Text>
                </View>
                <Text style={styles.quoteText}>"{quote.text}"</Text>
                <Text style={styles.authorText}>- {quote.author}</Text>
              </View>
            );
          })}
        </>
      )}

      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setShowAll(!showAll)}
      >
        <Text style={styles.expandButtonText}>
          {showAll ? 'Show Less' : `View All ${QUOTES.length} Quotes`}
        </Text>
      </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  refreshText: {
    color: '#1E88E5',
    fontSize: 12,
    fontWeight: '600',
  },
  quoteCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1E88E5',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quoteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  authorText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
    fontWeight: '600',
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

export default MoneyQuotes;
