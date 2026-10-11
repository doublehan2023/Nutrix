import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabs } from '../../../constants/data';
import { colors, components } from '../../../constants/theme';
import { useLanguage } from '@/features/localization/language-context';

const tabBar = components.tabBar;
const activeTabColor = tabBar.activeColor;
const inactiveTabColor = tabBar.inactiveColor;

function PatientTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { t } = useLanguage();
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
        const translatedTitle = t(tab.name === 'index' ? 'today' : tab.name);
        const accessibilityLabel = options.tabBarAccessibilityLabel ?? translatedTitle;

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
              {translatedTitle}
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
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: colors.foreground,
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
