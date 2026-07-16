import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector, logoutAsync } from '../../../src/store/index';
import { latraAPI, getErrorMessage } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, Radius, Shadow, Layout, Spacing } from '../../../src/utils/design';
import { Card, StatCard, Badge, LoadingScreen, SectionTitle } from '../../../src/components/ui';
import { router } from 'expo-router';

interface DashStats { users: number; passengerCount: number; ownerCount: number; vehicles: number; routes: number; activeTrips: number; tripsToday: number; completedToday: number; }
interface ComplianceVehicle { _id: string; plateNumber: string; latraExpiryDate: string; ownerId: { fullName: string; phone: string }; }
interface Compliance { expLatra: ComplianceVehicle[]; total: number; }

export default function LatraDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user }  = useAppSelector(s => s.auth);
  const [stats, setStats]           = useState<DashStats | null>(null);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!refreshing) setLoading(true);
    try {
      const [d, c] = await Promise.all([latraAPI.dashboard(), latraAPI.compliance()]);
      setStats(d.data.data); setCompliance(c.data.data);
    } catch (e) { Alert.alert(t('common.error'), getErrorMessage(e)); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('common.confirm'), [
      { text: t('common.yes'), style: 'destructive', onPress: async () => { await dispatch(logoutAsync()); router.replace('/(auth)/login'); }},
      { text: t('common.no') },
    ]);
  };

  if (loading && !refreshing) return <LoadingScreen />;

  const QUICK_LINKS = [
    { icon: 'add-circle-outline' as const,    label: t('latra.createRoute'),    onPress: () => router.push('/(latra)/create-route') },
    { icon: 'people-outline' as const,        label: t('latra.searchUsers'),    onPress: () => router.push('/(latra)/(tabs)/users') },
    { icon: 'navigate-outline' as const,      label: t('latra.viewTrips'),      onPress: () => router.push('/(latra)/(tabs)/trips') },
    { icon: 'bus-outline' as const,           label: t('latra.manageVehicles'), onPress: () => router.push('/(latra)/(tabs)/vehicles') },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.hdr}>
          <View>
            <Text style={s.hdrTitle}>{t('latra.dashboardTitle')}</Text>
            <Text style={s.hdrSub}>{user?.fullName}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.brand]} />}
      >
        {/* Stats grid */}
        {stats && (
          <>
            <SectionTitle title={t('latra.overallStats')} />
            <View style={s.statsGrid}>
              <StatCard icon="people-outline"          value={stats.users}           label={t('latra.users')}     color={Colors.brand}   />
              <StatCard icon="person-outline"          value={stats.passengerCount}  label={t('latra.passengersCount')}        color={Colors.brandMid}/>
            </View>
            <View style={s.statsGrid}>
              <StatCard icon="bus-outline"             value={stats.vehicles}        label={t('latra.vehicles')}        color={Colors.success} />
              <StatCard icon="git-branch-outline"      value={stats.routes}          label={t('latra.routesCount')}          color={Colors.info}    />
            </View>
            <View style={s.statsGrid}>
              <StatCard icon="navigate-outline"        value={stats.activeTrips}     label={t('latra.activeTrips')}    color={Colors.warning} />
              <StatCard icon="checkmark-circle-outline"value={stats.completedToday}  label={t('latra.completedToday')} color={Colors.success}/>
            </View>
          </>
        )}

        {/* Quick links */}
        <SectionTitle title={t('latra.quickActions')} style={{ marginTop: 8 }} />
        <View style={s.quickGrid}>
          {QUICK_LINKS.map(q => (
            <TouchableOpacity key={q.label} style={s.quickCard} onPress={q.onPress} activeOpacity={0.82}>
              <View style={s.quickIcon}><Ionicons name={q.icon} size={22} color={Colors.brand} /></View>
              <Text style={s.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Compliance alerts */}
        {compliance && compliance.total > 0 && (
          <>
            <SectionTitle title={t('latra.complianceAlerts')} style={{ marginTop: 8 }} />
            {compliance.expLatra.map(v => (
              <Card key={v._id} style={s.alertCard}>
                <View style={s.alertLeft}>
                  <View style={[s.alertIcon, { backgroundColor: Colors.warningLight }]}>
                    <Ionicons name="warning-outline" size={18} color={Colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertTitle}>{t('latra.latraExpiring', { plate: v.plateNumber })}</Text>
                    <Text style={s.alertDate}>{new Date(v.latraExpiryDate).toLocaleDateString('sw-TZ')}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.bg },
  safeTop:    { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  hdr:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPad, paddingVertical: 14 },
  hdrTitle:   { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  hdrSub:     { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  logoutBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.errorLight, alignItems: 'center', justifyContent: 'center' },
  scroll:     { flex: 1, padding: Layout.screenPad },
  statsGrid:  { flexDirection: 'row', gap: 10, marginBottom: 10 },
  quickGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  quickCard:  { width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, alignItems: 'center', gap: 10, ...Shadow.xs },
  quickIcon:  { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textBody, textAlign: 'center' },
  alertCard:  { marginBottom: 8 },
  alertLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertIcon:  { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  alertDate:  { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
