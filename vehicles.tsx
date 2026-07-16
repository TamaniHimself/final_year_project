import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { latraAPI, getErrorMessage } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, Radius, Shadow, Layout, Spacing } from '../../../src/utils/design';
import { Card, RouteCode, LoadingScreen, EmptyState, SectionTitle } from '../../../src/components/ui';

interface VehicleAdmin { _id: string; plateNumber: string; make: string; vehicleModel: string; status: string; ownerId: { fullName: string; phone: string }; routeId?: { _id?: string; name: string; code: string }; pendingRouteId?: { nameSwahili: string; code: string }; routeChangeRequestedAt?: string; latraExpiryDate: string; }

const STAT_C: Record<string, string> = { online: Colors.success, on_trip: Colors.warning, offline: Colors.textMuted, suspended: Colors.error };
function exp(d: string) { return (new Date(d).getTime() - Date.now()) < 30 * 24 * 3600 * 1000; }
function fmtD(d: string) { return new Date(d).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: '2-digit' }); }

export default function LatraVehiclesTab() {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<VehicleAdmin[]>([]);
  const [pending, setPending]   = useState<VehicleAdmin[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (r = false) => {
    if (r) setRefreshing(true); else setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([latraAPI.vehicles(), latraAPI.pendingRoutes()]);
      setVehicles(vRes.data.data); setPending(pRes.data.data);
    } catch (e) { Alert.alert(t('common.error'), getErrorMessage(e)); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const suspend = (v: VehicleAdmin) => {
    const isSusp = v.status !== 'suspended';
    Alert.alert(
      isSusp ? t('latra.suspendConfirmTitle') : t('latra.restoreConfirmTitle'),
      t('latra.suspendConfirmMsg', { action: isSusp ? t('latra.suspend') : t('latra.restore'), plate: v.plateNumber }),
      [
        { text: t('common.yes'), style: 'destructive', onPress: async () => {
          try { await latraAPI.suspendVehicle(v._id, isSusp); load(); }
          catch (e) { Alert.alert(t('common.error'), getErrorMessage(e)); }
        }},
        { text: t('common.no') },
      ]
    );
  };

  const approveRoute = (v: VehicleAdmin, approve: boolean) => {
    Alert.alert(
      approve ? t('latra.approveRouteTitle') : t('latra.rejectRouteTitle'),
      t('latra.approveRouteMsg', { action: approve ? t('common.approve') : t('common.reject'), plate: v.plateNumber, route: (v.pendingRouteId as { nameSwahili?: string })?.nameSwahili ?? '--' }),
      [
        { text: approve ? t('common.yes') + ', ' + t('common.approve') : t('common.yes') + ', ' + t('common.reject'), style: approve ? 'default' : 'destructive',
          onPress: async () => {
            try { await latraAPI.approveRoute(v._id, approve); load(); Alert.alert(t('common.doneSuccess')); }
            catch (e) { Alert.alert(t('common.error'), getErrorMessage(e)); }
          }
        },
        { text: t('common.no') },
      ]
    );
  };

  if (loading && !refreshing) return <LoadingScreen />;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <Text style={s.title}>{t('latra.vehiclesTitle', { count: vehicles.length })}</Text>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[Colors.brand]} />}
      >
        {/* Pending approvals */}
        {pending.length > 0 && (
          <>
            <SectionTitle title={t('latra.pendingTitle', { count: pending.length })} />
            {pending.map(v => (
              <Card key={v._id + 'p'} style={[s.pendingCard]}>
                <View style={s.pendingHdr}>
                  <View style={s.pendingIcon}><Ionicons name="hourglass-outline" size={18} color={Colors.warning} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pendingPlate}>{v.plateNumber}</Text>
                    <Text style={s.pendingOwner}>{(v.ownerId as { fullName: string })?.fullName}</Text>
                  </View>
                </View>
                <View style={s.pendingRoutes}>
                  <View style={s.pendingRouteItem}>
                    <Text style={s.pendingLabel}>{t('latra.currentRoute')}</Text>
                    <RouteCode code={(v.routeId as { code?: string })?.code ?? t('latra.none')} />
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={Colors.textHint} />
                  <View style={s.pendingRouteItem}>
                    <Text style={s.pendingLabel}>{t('latra.newRoute')}</Text>
                    <View style={[s.pendingNewCode, { backgroundColor: Colors.warningLight }]}>
                      <Text style={[s.pendingNewCodeTxt, { color: Colors.warning }]}>{(v.pendingRouteId as { code?: string })?.code ?? '--'}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.pendingBtns}>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => approveRoute(v, false)}>
                    <Ionicons name="close" size={16} color={Colors.error} />
                    <Text style={s.rejectTxt}>{t('common.reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.approveBtn} onPress={() => approveRoute(v, true)}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={s.approveTxt}>{t('common.approve')}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* All vehicles */}
        <SectionTitle title={t('latra.allVehicles')} style={{ marginTop: pending.length ? 8 : 0 }} />
        {vehicles.length === 0 ? (
          <EmptyState icon="bus-outline" title={t('latra.noVehicles')} subtitle={t('latra.noVehiclesSub')} />
        ) : vehicles.map(v => (
          <Card key={v._id} style={s.vcard}>
            <View style={s.vcardTop}>
              <View style={[s.vstatDot, { backgroundColor: STAT_C[v.status] ?? Colors.offline }]} />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(latra)/vehicle-detail', params: { vehicleId: v._id } })}>
                <Text style={s.plate}>{v.plateNumber}</Text>
                <Text style={s.make}>{v.make} {v.vehicleModel}</Text>
                <Text style={s.owner}>{(v.ownerId as { fullName: string })?.fullName}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.suspBtn, v.status === 'suspended' && s.unsuspBtn]} onPress={() => suspend(v)}>
                <Text style={[s.suspTxt, v.status === 'suspended' && s.unsuspTxt]}>{v.status === 'suspended' ? t('latra.restore') : t('latra.suspend')}</Text>
              </TouchableOpacity>
            </View>
            {v.routeId && (
              <TouchableOpacity style={s.vcardRouteRow} onPress={() => v.routeId?._id && router.push({ pathname: '/(shared)/route-preview', params: { routeId: v.routeId._id } })}>
                <RouteCode code={(v.routeId as { code?: string })?.code ?? ''} />
              </TouchableOpacity>
            )}
            <View style={s.vcardBottom}>
              <View style={s.dateItem}>
                <Ionicons name="shield-checkmark-outline" size={13} color={exp(v.latraExpiryDate) ? Colors.error : Colors.textMuted} />
                <Text style={[s.dateTxt, exp(v.latraExpiryDate) && s.dateTxtWarn]}>LATRA: {fmtD(v.latraExpiryDate)}</Text>
              </View>
            </View>
          </Card>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  safeTop:       { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title:         { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingHorizontal: Layout.screenPad, paddingVertical: 14 },
  scroll:        { flex: 1, padding: Layout.screenPad },
  pendingCard:   { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  pendingHdr:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pendingIcon:   { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.warningLight, alignItems: 'center', justifyContent: 'center' },
  pendingPlate:  { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  pendingOwner:  { fontSize: FontSize.xs, color: Colors.textMuted },
  pendingRoutes: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  pendingRouteItem: { flex: 1, gap: 4 },
  pendingLabel:  { fontSize: FontSize.xs, color: Colors.textMuted },
  pendingNewCode:{ borderRadius: Radius.md, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  pendingNewCodeTxt:{ fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  pendingBtns:   { flexDirection: 'row', gap: 8 },
  rejectBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 40, borderRadius: Radius.xl, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error },
  rejectTxt:     { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.error },
  approveBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 40, borderRadius: Radius.xl, backgroundColor: Colors.brand },
  approveTxt:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#fff' },
  vcard:         { marginBottom: 10 },
  vcardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  vcardRouteRow: { marginBottom: 10, alignSelf: 'flex-start' },
  vstatDot:      { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  plate:         { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  make:          { fontSize: FontSize.xs, color: Colors.textMuted },
  owner:         { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  suspBtn:       { backgroundColor: Colors.errorLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  unsuspBtn:     { backgroundColor: Colors.successLight },
  suspTxt:       { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.error },
  unsuspTxt:     { color: Colors.success },
  vcardBottom:   { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8 },
  dateItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt:       { fontSize: FontSize.xs, color: Colors.textMuted },
  dateTxtWarn:   { color: Colors.error, fontWeight: FontWeight.semibold },
});
