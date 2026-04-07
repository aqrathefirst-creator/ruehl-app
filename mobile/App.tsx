import React from 'react';
import { StatusBar, View } from 'react-native';
import HomeFeedScreen from './HomeFeedScreen';

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <HomeFeedScreen />
    </View>
  );
}
