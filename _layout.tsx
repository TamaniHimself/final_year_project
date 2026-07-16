import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Layout } from '../../../src/utils/design';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
interface TabDef { name: string; icon: IoniconName; activeIcon: IoniconName; label: string; }

export default function LatraTabs() {
  const { t } = useTranslation();
  const TABS: TabDef[] = [
    { name: 'index',    icon: 'grid-outline',       activeIcon: 'grid',           label: t('nav.dashboard') },
    { name: 'routes',   icon: 'git-branch-outline', activeIcon: 'git-branch',     label: t('nav.routes')   },
    { name: 'vehicles', icon: 'bus-outline',        activeIcon: 'bus',            label: t('nav.vehicles') },
    { name: 'trips',    icon: 'navigate-outline',   activeIcon: 'navigate',       label: t('nav.trip')     },
    { name: 'users',    icon: 'people-outline',     activeIcon: 'people',         label: t('nav.users')    },
  ];

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: s.bar,
      tabBarActiveTintColor: Colors.brand,
      tabBarInactiveTintColor: Colors.textHint,
      tabBarLabelStyle: s.label,
      tabBarShowLabel: true,
    }}>
      {TABS.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.label,
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? s.iconActive : s.iconInactive}>
              <Ionicons name={focused ? tab.activeIcon : tab.icon} size={22} color={color} />
            </View>
          ),
        }} />
      ))}
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar:         { backgroundColor: Colors.surface, height: Layout.tabBarHeight, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 8, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 12 },
  label:       { fontSize: 10, fontWeight: '500', marginTop: 2 },
  iconActive:  { backgroundColor: Colors.brandLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  iconInactive:{ paddingHorizontal: 12, paddingVertical: 4 },
});
