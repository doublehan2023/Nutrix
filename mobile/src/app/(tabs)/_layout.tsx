import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { tabs } from '../../../constants/data';
import { colors, components } from '../../../constants/theme';

const tabBar = components.tabBar;
const animationDuration = 220;

function PatientTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  const indicatorOffset = useSharedValue(0);
  const hasPositionedIndicator = useRef(false);

  useEffect(() => {
    if (barWidth === 0) {
      return;
    }

    const itemWidth = barWidth / state.routes.length;
    const nextOffset = state.index * itemWidth + (itemWidth - tabBar.iconFrame) / 2;

    const shouldAnimate = hasPositionedIndicator.current && !reduceMotion;
    indicatorOffset.value = shouldAnimate
      ? withTiming(nextOffset, {
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
        })
      : nextOffset;
    hasPositionedIndicator.current = true;
  }, [barWidth, indicatorOffset, reduceMotion, state.index, state.routes.length]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorOffset.value }],
  }));

  return (
    <View
      onLayout={({ nativeEvent }) => setBarWidth(nativeEvent.layout.width)}
      style={[
        styles.tabBar,
        {
          bottom: Math.max(insets.bottom, tabBar.horizontalInset),
          height: tabBar.height,
          borderRadius: tabBar.radius,
          backgroundColor: colors.primary,
        },
      ]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activePill,
          {
            width: tabBar.iconFrame,
            height: tabBar.iconFrame,
            borderRadius: tabBar.iconFrame / 2,
            backgroundColor: colors.accent,
          },
          animatedPillStyle,
        ]}
      />
      {state.routes.map((route, index) => {
        const tab = tabs.find((item) => item.name === route.name);

        if (!tab) {
          return null;
        }

        const isFocused = state.index === index;
        const options = descriptors[route.key].options;
        const accessibilityLabel = options.tabBarAccessibilityLabel ?? options.title ?? tab.title;

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable
            key={route.key}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            onPress={onPress}
            style={styles.tabButton}>
            <Image source={tab.icon} resizeMode="contain" style={styles.tabIcon} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PatientTabsLayout() {
  const reduceMotion = useReducedMotion();

  return (
    <Tabs
      tabBar={(props) => <PatientTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        animation: reduceMotion ? 'none' : 'fade',
      }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: tabBar.horizontalInset,
    right: tabBar.horizontalInset,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 0,
  },
  activePill: {
    position: 'absolute',
    top: (tabBar.height - tabBar.iconFrame) / 2,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
});
