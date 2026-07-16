import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { latraAPI, getErrorMessage } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, Radius, Shadow, Layout, Spacing } from '../../../src/utils/design';
import { Card, EmptyState } from '../../../src/components/ui';

interface UserRecord { _id: string; fullName: string; email: string; phone: string; role: string; isBanned: boolean; createdAt: string; }

const ROLES = ['all', 'passenger', 'car_owner', 'latra'] as const;
const RI: Record<string, React.ComponentProps<typeof Ionicons>['name']> = { all: 'people-outline', passenger: 'person-outline', car_owner: 'bus-outline', latra: 'shield-checkmark-outline' };

function fmtDate(d: string) { return new Date(d).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: '2-digit' }); }

export default function LatraUsersTab() {
  const { t } = useTranslation();
  const RL: Record<string, string> = { all: t('latra.filterAllUsers'), passenger: t('latra.filterPassengers'), car_owner: t('latra.filterDrivers'), latra: t('latra.filterLatra') };

  const [users, setUsers]       = useState<UserRecord[]>([]);
  const [search, setSearch]     = useState('');
  const [role, setRole]         = useState('all');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (pg: number, q: string, rl: string, refresh = false) => {
    if (pg === 1) { if (refresh) setRefreshing(true); else setLoading(true); } else setLoadingMore(true);
    try {
      const params: { page: number; limit: number; search?: string; role?: string } = { page: pg, limit: 30 };
      if (q.trim()) params.search = q.trim();
      if (rl !== 'all') params.role = rl;
      const r = await latraAPI.users(params);
      const { data, pagination } = r.data;
      setUsers(prev => pg === 1 ? data : [...prev, ...data]);
      setTotalPages(Math.ceil((pagination.total ?? data.length) / 30)); setPage(pg);
    } catch { }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(1, search, role); }, [role]);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, search, role), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const toggleBan = (u: UserRecord) => {
    Alert.alert(u.isBanned ? t('latra.unbanConfirmTitle') : t('latra.banConfirmTitle'),
      t('latra.banConfirmMsg', { action: u.isBanned ? t('latra.unban') : t('latra.ban'), name: u.fullName }),
      [
        { text: t('common.yes'), style: 'destructive', onPress: async () => {
          try { await latraAPI.banUser(u._id, !u.isBanned); setUsers(prev => prev.map(x => x._id === u._id ? {...x, isBanned: !u.isBanned} : x)); }
          catch (e) { Alert.alert(t('common.error'), getErrorMessage(e)); }
        }},
        { text: t('common.no') },
      ]
    );
  };

  const renderItem = ({ item: u }: { item: UserRecord }) => (
    <Card style={s.card}>
      <TouchableOpacity style={s.cardRow} onPress={() => router.push({ pathname: '/(latra)/user-detail', params: { userId: u._id } })} activeOpacity={0.75}>
        <View style={s.avatar}><Text style={s.avatarTxt}>{(u.fullName?.[0] ?? '?').toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{u.fullName}</Text>
            {u.isBanned && <View style={s.bannedBadge}><Ionicons name="ban-outline" size={10} color={Colors.error} /><Text style={s.bannedTxt}>{t('latra.banned')}</Text></View>}
          </View>
          <Text style={s.phone}>{u.phone}</Text>
          <View style={s.metaRow}>
            <Ionicons name={RI[u.role] ?? 'person-outline'} size={11} color={Colors.textHint} />
            <Text style={s.roleTxt}>{RL[u.role] ?? u.role}</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.dateTxt}>{fmtDate(u.createdAt)}</Text>
          </View>
        </View>
        {u.role !== 'latra' && (
          <TouchableOpacity style={[s.banBtn, u.isBanned && s.unbanBtn]} onPress={() => toggleBan(u)}>
            <Text style={[s.banTxt, u.isBanned && s.unbanTxt]}>{u.isBanned ? t('latra.unban') : t('latra.ban')}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <Text style={s.title}>{t('latra.usersTitle')}</Text>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput style={s.searchInput} placeholder={t('latra.searchUsersPlaceholder')} placeholderTextColor={Colors.textHint} value={search} onChangeText={setSearch} autoCorrect={false} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={Colors.textMuted} /></TouchableOpacity>}
        </View>
        <View style={s.roleRow}>
          {ROLES.map(r => (
            <TouchableOpacity key={r} style={[s.roleBtn, role === r && s.roleBtnActive]} onPress={() => setRole(r)}>
              <Ionicons name={RI[r]} size={13} color={role === r ? '#fff' : Colors.textMuted} />
              <Text style={[s.roleBtnTxt, role === r && s.roleBtnTxtActive]}>{RL[r]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading && !refreshing ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.brand} /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, search, role, true)} colors={[Colors.brand]} />}
          onEndReached={() => { if (!loadingMore && page < totalPages) load(page + 1, search, role); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.brand} style={{ margin: 20 }} /> : null}
          ListEmptyComponent={<EmptyState icon="people-outline" title={t('latra.usersTitle')} subtitle={t('latra.noUsersMatch')} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  safeTop:       { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, paddingBottom: 10 },
  title:         { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingHorizontal: Layout.screenPad, paddingTop: 14, paddingBottom: 10 },
  searchBox:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.xl, paddingHorizontal: 14, height: 44, marginHorizontal: Layout.screenPad, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput:   { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary },
  roleRow:       { flexDirection: 'row', gap: 6, paddingHorizontal: Layout.screenPad, flexWrap: 'wrap' },
  roleBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  roleBtnActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  roleBtnTxt:    { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  roleBtnTxtActive:{ color: '#fff', fontWeight: FontWeight.semibold },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:          { padding: Layout.screenPad, paddingBottom: 80 },
  card:          { marginBottom: 8 },
  cardRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.brand },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name:          { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary, flex: 1 },
  bannedBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.errorLight, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  bannedTxt:     { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.semibold },
  phone:         { fontSize: FontSize.sm, color: Colors.textMuted },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  roleTxt:       { fontSize: FontSize.xs, color: Colors.textHint },
  dot:           { color: Colors.textHint, fontSize: FontSize.xs },
  dateTxt:       { fontSize: FontSize.xs, color: Colors.textHint },
  banBtn:        { backgroundColor: Colors.errorLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  unbanBtn:      { backgroundColor: Colors.successLight },
  banTxt:        { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.error },
  unbanTxt:      { color: Colors.success },
});
