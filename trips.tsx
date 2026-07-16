import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { latraAPI, getErrorMessage } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, Radius, Shadow, Layout, Spacing } from '../../../src/utils/design';
import { Card, RouteCode, EmptyState } from '../../../src/components/ui';

interface TripRecord { _id: string; status: string; startTime: string; endTime?: string; durationMinutes?: number; distanceCoveredKm: number; passengerCount: number; routeId?: { _id?: string; nameSwahili: string; code: string }; ownerId?: { fullName: string }; vehicleId?: { plateNumber: string }; }

const FILTERS = ['all', 'in_progress', 'completed', 'cancelled'] as const;
const FI: Record<string, React.ComponentProps<typeof Ionicons>['name']> = { all: 'list-outline', in_progress: 'navigate-outline', completed: 'checkmark-circle-outline', cancelled: 'close-circle-outline' };

function fmt(min: number) { const h = Math.floor(min / 60), m = min % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; }
function fmtDate(d: string) { return new Date(d).toLocaleString('sw-TZ', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

export default function LatraTripsTab() {
  const { t } = useTranslation();
  const FL: Record<string, string> = { all: t('latra.filterAll'), in_progress: t('latra.filterInProgress'), completed: t('latra.filterCompleted'), cancelled: t('latra.filterCancelled') };
  const ST: Record<string, { label: string; color: string; bg: string }> = {
    completed:   { label: t('history.statusCompleted'), color: Colors.success, bg: Colors.successLight },
    in_progress: { label: t('history.statusInProgress'), color: Colors.warning, bg: Colors.warningLight },
    cancelled:   { label: t('history.statusCancelled'),  color: Colors.error,   bg: Colors.errorLight   },
  };

  const [trips, setTrips]       = useState<TripRecord[]>([]);
  const [filter, setFilter]     = useState<string>('all');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);

  const load = useCallback(async (pg: number, fl: string, refresh = false) => {
    if (pg === 1) { if (refresh) setRefreshing(true); else setLoading(true); } else setLoadingMore(true);
    try {
      const params: { status?: string; page: number; limit: number } = { page: pg, limit: 25 };
      if (fl !== 'all') params.status = fl;
      const r = await latraAPI.trips(params);
      const { data, pagination } = r.data;
      setTrips(prev => pg === 1 ? data : [...prev, ...data]);
      setTotalPages(pagination.pages ?? 1); setPage(pg);
    } catch { }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(1, filter); }, [filter]);

  const renderItem = ({ item: trip }: { item: TripRecord }) => {
    const st = ST[trip.status] ?? ST.cancelled;
    const routeRef = trip.routeId as { _id?: string; nameSwahili?: string; code?: string } | undefined;
    return (
      <Card style={s.card}>
        <View style={s.cardTop}>
          <TouchableOpacity
            style={s.cardTopTap}
            disabled={!routeRef?._id}
            onPress={() => routeRef?._id && router.push({ pathname: '/(shared)/route-preview', params: { routeId: routeRef._id! } })}
          >
            <RouteCode code={routeRef?.code ?? '--'} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.routeName} numberOfLines={1}>{routeRef?.nameSwahili ?? t('nav.routes')}</Text>
              <Text style={s.date}>{fmtDate(trip.startTime)}</Text>
            </View>
          </TouchableOpacity>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeTxt, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <View style={s.infoRow}>
          <View style={s.infoItem}><Ionicons name="bus-outline" size={13} color={Colors.textMuted} /><Text style={s.infoTxt}>{(trip.vehicleId as { plateNumber?: string })?.plateNumber ?? '--'}</Text></View>
          <View style={s.infoItem}><Ionicons name="person-outline" size={13} color={Colors.textMuted} /><Text style={s.infoTxt} numberOfLines={1}>{(trip.ownerId as { fullName?: string })?.fullName ?? '--'}</Text></View>
          {trip.durationMinutes ? <View style={s.infoItem}><Ionicons name="time-outline" size={13} color={Colors.textMuted} /><Text style={s.infoTxt}>{fmt(trip.durationMinutes)}</Text></View> : null}
        </View>
      </Card>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <Text style={s.title}>{t('latra.tripsTitle')}</Text>
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
              <Ionicons name={FI[f]} size={14} color={filter === f ? '#fff' : Colors.textMuted} />
              <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{FL[f]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading && !refreshing ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.brand} /></View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={trip => trip._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, filter, true)} colors={[Colors.brand]} />}
          onEndReached={() => { if (!loadingMore && page < totalPages) load(page + 1, filter); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.brand} style={{ margin: 20 }} /> : null}
          ListEmptyComponent={<EmptyState icon="navigate-outline" title={t('latra.tripsTitle')} subtitle={t('latra.noTripsMatch')} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  safeTop:       { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, paddingBottom: 10 },
  title:         { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingHorizontal: Layout.screenPad, paddingTop: 14, paddingBottom: 12 },
  filterRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: Layout.screenPad },
  filterBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive:{ backgroundColor: Colors.brand, borderColor: Colors.brand },
  filterTxt:     { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  filterTxtActive:{ color: '#fff', fontWeight: FontWeight.semibold },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:          { padding: Layout.screenPad, paddingBottom: 80 },
  card:          { marginBottom: 10 },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTopTap:    { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  routeName:     { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  date:          { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  badge:         { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, marginLeft: 6, alignSelf: 'flex-start' },
  badgeTxt:      { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  infoRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8 },
  infoItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoTxt:       { fontSize: FontSize.xs, color: Colors.textMuted },
});
