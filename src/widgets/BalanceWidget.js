import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function BalanceWidget({ accounts = [], totalBalance = 0, creditCardCosts = 0, widgetHeight = 110 }) {
  const formatAmount = (amount) => {
    return amount.toLocaleString('en-BD', { maximumFractionDigits: 0 });
  };

  // Dynamic sizing: header ~50dp, each account row ~20dp, CC section ~24dp
  const headerHeight = 55;
  const ccSectionHeight = creditCardCosts > 0 ? 26 : 0;
  const availableHeight = widgetHeight - headerHeight - ccSectionHeight;
  const rowHeight = 20;
  const maxRows = Math.max(1, Math.floor(availableHeight / rowHeight));
  const visibleAccounts = accounts.slice(0, maxRows);
  const hasMore = accounts.length > maxRows;

  // Compact mode for small widgets
  const isCompact = widgetHeight < 130;
  const titleSize = isCompact ? 18 : 22;
  const rowFontSize = isCompact ? 11 : 12;
  const padding = isCompact ? 10 : 14;

  const getAccountIcon = (type) => {
    if (type === 'mfs') return '📱 ';
    return '🏦 ';
  };

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: padding,
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
          marginBottom: 4,
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
          fontSize: titleSize,
          color: '#1E88E5',
          fontFamily: 'sans-serif-bold',
          marginBottom: 4,
        }}
      />

      {/* Divider */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 1,
          backgroundColor: '#E0E0E0',
          marginBottom: 4,
        }}
      />

      {/* Account List - All accounts (bank + MFS), no credit cards */}
      {visibleAccounts.map((account, index) => (
        <FlexWidget
          key={`acc-${index}`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            paddingVertical: 2,
          }}
        >
          <TextWidget
            text={`${getAccountIcon(account.type)}${account.name}`}
            style={{ fontSize: rowFontSize, color: '#666666', fontFamily: 'sans-serif' }}
          />
          <TextWidget
            text={`BDT ${formatAmount(account.balance)}`}
            style={{
              fontSize: rowFontSize,
              color: account.balance >= 0 ? '#4CAF50' : '#F44336',
              fontFamily: 'sans-serif-medium',
            }}
          />
        </FlexWidget>
      ))}

      {/* Show more indicator if accounts overflow */}
      {hasMore && (
        <TextWidget
          text={`+${accounts.length - maxRows} more...`}
          style={{ fontSize: 10, color: '#999999', fontFamily: 'sans-serif', marginTop: 1 }}
        />
      )}

      {accounts.length === 0 && (
        <TextWidget
          text="Open app to set up accounts"
          style={{ fontSize: 12, color: '#999999', fontFamily: 'sans-serif' }}
        />
      )}

      {/* Credit Card Costs Section */}
      {creditCardCosts > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 4,
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
          }}
        >
          <TextWidget
            text="💳 CC Costs"
            style={{ fontSize: rowFontSize, color: '#FF5722', fontFamily: 'sans-serif-medium' }}
          />
          <TextWidget
            text={`BDT ${formatAmount(creditCardCosts)}`}
            style={{
              fontSize: rowFontSize,
              color: '#FF5722',
              fontFamily: 'sans-serif-medium',
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
