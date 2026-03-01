import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function QuickActionsWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 8,
      }}
    >
      <FlexWidget
        style={{
          flex: 1,
          height: 'match_parent',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#E8F5E9',
          borderRadius: 16,
          margin: 4,
        }}
        clickAction="OPEN_APP"
        clickActionData={{ screen: 'Dashboard', quickAction: 'Deposit' }}
      >
        <TextWidget
          text="+"
          style={{ fontSize: 28, color: '#4CAF50', fontFamily: 'sans-serif-medium' }}
        />
        <TextWidget
          text="Deposit"
          style={{ fontSize: 13, color: '#2E7D32', fontFamily: 'sans-serif-medium' }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flex: 1,
          height: 'match_parent',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFEBEE',
          borderRadius: 16,
          margin: 4,
        }}
        clickAction="OPEN_APP"
        clickActionData={{ screen: 'Dashboard', quickAction: 'Withdrawal' }}
      >
        <TextWidget
          text="-"
          style={{ fontSize: 28, color: '#F44336', fontFamily: 'sans-serif-medium' }}
        />
        <TextWidget
          text="Cost"
          style={{ fontSize: 13, color: '#C62828', fontFamily: 'sans-serif-medium' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
