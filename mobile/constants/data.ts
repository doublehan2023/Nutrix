import { icons } from './icons';

export const tabs = [
  { name: 'index', title: 'Today', icon: icons.home },
  { name: 'log-meal', title: 'Log a meal', icon: icons.meal },
  { name: 'insights', title: 'Insights', icon: icons.insights },
  { name: 'settings', title: 'Settings', icon: icons.settings },
] as const;
