import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function BalanceWidget({ accounts = [], totalBalance = 0 }) {
  const formatAmount = (amount) => {
    return amount.toLocaleString('en-BD', { maximumFractionDigits: 0 });
  };

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 14,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 6,
        }}
      >
        <TextWidget
          text="Finance Manager"
          style={{ fontSize: 11, color: '#999999', fontFamily: 'sans-serif' }}
        />
        <TextWidget
          text="Total Balance"
          style={{ fontSize: 11, color: '#1E88E5', fontFamily: 'sans-serif-medium' }}
        />
      </FlexWidget>

      {/* Total Balance */}
      <TextWidget
        text={`BDT ${formatAmount(totalBalance)}`}
        style={{
          fontSize: 22,
          color: '#1E88E5',
          fontFamily: 'sans-serif-bold',
          marginBottom: 8,
        }}
      />

      {/* Divider */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 1,
          backgroundColor: '#E0E0E0',
          marginBottom: 6,
        }}
      />

      {/* Account List */}
      {accounts.slice(0, 5).map((account, index) => (
        <FlexWidget
          key={`acc-${index}`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={account.name}
            style={{ fontSize: 12, color: '#666666', fontFamily: 'sans-serif' }}
          />
          <TextWidget
            text={`BDT ${formatAmount(account.balance)}`}
            style={{
              fontSize: 12,
              color: account.balance >= 0 ? '#4CAF50' : '#F44336',
              fontFamily: 'sans-serif-medium',
            }}
          />
        </FlexWidget>
      ))}

      {accounts.length === 0 && (
        <TextWidget
          text="Open app to set up accounts"
          style={{ fontSize: 12, color: '#999999', fontFamily: 'sans-serif' }}
        />
      )}
    </FlexWidget>
  );
}
