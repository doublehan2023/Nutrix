import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabs } from '../../../constants/data';
import { components } from '../../../constants/theme';

const tabBar = components.tabBar;
const activeTabColor = '#2861f5';
const inactiveTabColor = '#6b7280';

function PatientTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      style={[
        styles.tabBar,
        {
          height: tabBar.height + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
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
            <Image
              source={tab.icon}
              resizeMode="contain"
              style={[styles.tabIcon, { tintColor: isFocused ? activeTabColor : inactiveTabColor }]}
            />
            <Text style={[styles.tabLabel, { color: isFocused ? activeTabColor : inactiveTabColor }]}>
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PatientTabsLayout() {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <PatientTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        animation: reduceMotion ? 'none' : 'fade',
        sceneStyle: { paddingBottom: tabBar.height + insets.bottom },
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
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopColor: '#e5e7eb',
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  tabIcon: {
    width: tabBar.iconSize,
    height: tabBar.iconSize,
  },
  tabLabel: {
    marginTop: tabBar.labelTopMargin,
    fontSize: 12,
    fontWeight: '600',
  },
});
