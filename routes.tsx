import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, StatusBar } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { routeAPI, getErrorMessage } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, Radius, Shadow, Layout } from '../../../src/utils/design';
import { Card, RouteCode, EmptyState, LoadingScreen } from '../../../src/components/ui';
import { MAPBOX_PUBLIC_TOKEN, MAP_STYLES } from '../../../src/utils/mapbox';
import { router } from 'expo-router';

MapboxGL.setAccessToken(MAPBOX_PUBLIC_TOKEN);

interface Waypoint { nameSwahili: string; location: { coordinates: [number, number] }; isTerminal: boolean; }
interface Route { _id: string; nameSwahili: string; code: string; totalDistanceKm: number; estimatedDurationMin: number; waypoints: Waypoint[]; path: { coordinates: [number, number][] }; isActive: boolean; baseFare: number; }

export default function LatraRoutesTab() {
  const { t } = useTranslation();
  const [routes, setRoutes]         = useState<Route[]>([]);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (r = false) => {
    if (r) setRefreshing(true); else setLoading(true);
    try { const res = await routeAPI.list(); setRoutes(res.data.data); }
    catch (e) { Alert.alert(t('common.error'), getErrorMessage(e)); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading && !refreshing) return <LoadingScreen />;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.hdr}>
          <Text style={s.title}>{t('latra.routesTitle', { count: routes.length })}</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(latra)/create-route')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnTxt}>{t('latra.create')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[Colors.brand]} />}
      >
        {routes.length === 0 ? (
          <EmptyState icon="git-branch-outline" title={t('latra.noRoutesYet')} subtitle={t('latra.createFirstRoute')} action={t('latra.createRoute')} onAction={() => router.push('/(latra)/create-route')} />
        ) : routes.map(r => (
          <Card key={r._id} style={s.card}>
            {/* Card header — name/code tap goes straight to map preview; chevron toggles inline expand */}
            <View style={s.cardTop}>
              <TouchableOpacity style={s.cardTopTap} onPress={() => router.push({ pathname: '/(shared)/route-preview', params: { routeId: r._id } })} activeOpacity={0.7}>
                <RouteCode code={r.code} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.routeName}>{r.nameSwahili}</Text>
                  <Text style={s.routeMeta}>{r.totalDistanceKm} km · {r.estimatedDurationMin} {t('passenger.minutes')} · {t('routes.minFare')} {r.baseFare.toLocaleString()} TZS</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setExpanded(expanded === r._id ? null : r._id)} style={{ alignItems: 'flex-end', gap: 4, paddingLeft: 8 }}>
                <View style={[s.activeDot, { backgroundColor: r.isActive ? Colors.success : Colors.error }]} />
                <Ionicons name={expanded === r._id ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textHint} />
              </TouchableOpacity>
            </View>

            {/* Edit + View on Map buttons */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.editRow} onPress={() => router.push({ pathname: '/(latra)/edit-route', params: { routeId: r._id } })}>
                <Ionicons name="create-outline" size={14} color={Colors.brand} />
                <Text style={s.editTxt}>{t('latra.editFares')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.viewMapBtn} onPress={() => router.push({ pathname: '/(shared)/route-preview', params: { routeId: r._id } })}>
                <Ionicons name="map-outline" size={14} color={Colors.brandDark} />
                <Text style={s.viewMapTxt}>{t('latra.viewOnMap')}</Text>
              </TouchableOpacity>
            </View>

            {/* Expanded: waypoints + Mapbox mini-map */}
            {expanded === r._id && (
              <View style={s.expanded}>
                <Text style={s.expandLabel}>{t('latra.stopsCount', { count: r.waypoints.length })}</Text>
                {r.waypoints.map((wp, i) => (
                  <View key={i} style={s.wpRow}>
                    <View style={[s.wpDot, wp.isTerminal && s.wpDotTerminal]} />
                    {i < r.waypoints.length - 1 && <View style={s.wpLine} />}
                    <Text style={s.wpName}>{wp.nameSwahili}</Text>
                    {wp.isTerminal && <View style={s.termBadge}><Text style={s.termTxt}>Terminal</Text></View>}
                  </View>
                ))}

                {/* Mapbox mini-map with route */}
                {r.path.coordinates.length > 1 && (() => {
                  const routeShape = {
                    type: 'FeatureCollection' as const,
                    features: [{ type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: r.path.coordinates }, properties: {} }],
                  };
                  const lngs = r.path.coordinates.map(c => c[0]);
                  const lats  = r.path.coordinates.map(c => c[1]);
                  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
                  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
                  return (
                    <View style={s.miniMapWrap}>
                      <MapboxGL.MapView
                        style={{ height: 140 }}
                        styleURL={MAP_STYLES.light}
                        logoEnabled={false}
                        attributionEnabled={false}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        scaleBarEnabled={false}
                      >
                        <MapboxGL.Camera
                          centerCoordinate={[centerLng, centerLat]}
                          zoomLevel={11}
                          animationDuration={0}
                        />
                        <MapboxGL.ShapeSource id={`mini-route-${r._id}`} shape={routeShape}>
                          <MapboxGL.LineLayer id={`mini-line-${r._id}`} style={{ lineColor: Colors.brand, lineWidth: 3, lineOpacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
                        </MapboxGL.ShapeSource>
                        {r.waypoints.map((wp, i) => (
                          <MapboxGL.MarkerView key={`mwp-${r._id}-${i}`} coordinate={wp.location.coordinates} anchor={{ x: 0.5, y: 1 }}>
                            <View style={[s.mPin, wp.isTerminal && s.mPinTerminal]}>
                              <Text style={s.mPinTxt}>{i + 1}</Text>
                            </View>
                          </MapboxGL.MarkerView>
                        ))}
                      </MapboxGL.MapView>
                    </View>
                  );
                })()}
              </View>
            )}
          </Card>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.bg },
  safeTop:      { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  hdr:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPad, paddingVertical: 14 },
  title:        { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.brand, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnTxt:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#fff' },
  scroll:       { flex: 1, padding: Layout.screenPad },
  card:         { marginBottom: 10 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTopTap:   { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  routeName:    { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  routeMeta:    { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  activeDot:    { width: 8, height: 8, borderRadius: 4 },
  actionRow:    { flexDirection: 'row', gap: 8 },
  editRow:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.brandLight, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  editTxt:      { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.brand },
  viewMapBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  viewMapTxt:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.brandDark },
  expanded:     { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 12, marginTop: 10 },
  expandLabel:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  wpRow:        { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  wpDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border, marginTop: 5, marginRight: 10, flexShrink: 0 },
  wpDotTerminal:{ backgroundColor: Colors.brand },
  wpLine:       { position: 'absolute', left: 3.5, top: 13, bottom: -4, width: 1, backgroundColor: Colors.borderLight },
  wpName:       { fontSize: FontSize.sm, color: Colors.textBody, flex: 1 },
  termBadge:    { backgroundColor: Colors.brandLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  termTxt:      { fontSize: FontSize.xs, color: Colors.brand, fontWeight: FontWeight.semibold },
  miniMapWrap:  { marginTop: 12, borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  mPin:         { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.brand },
  mPinTerminal: { backgroundColor: Colors.brand },
  mPinTxt:      { fontSize: 9, fontWeight: FontWeight.bold, color: '#fff' },
});
