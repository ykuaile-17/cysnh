import { Game, GachaRecord, GachaItem, Merch, Sale, Schedule, Support, Novel, ReadingLog, Star, Material, Order } from './types';

const monthKey = (iso?: string) => (iso ? iso.slice(0, 7) : '');

export interface Overview {
  totalSpend: number;
  totalIncome: number;
  netSpend: number;
  totalMerch: number;
  totalGames: number;
  totalNovels: number;
  totalStars: number;
  totalMaterials: number;
  totalSchedules: number;
  totalGacha: number;
  totalReadBooks: number;
  totalReadWords: number;
  totalReadMinutes: number;
}

export function computeOverview(data: {
  games: Game[]; merch: Merch[]; sales: Sale[]; schedules: Schedule[];
  supports: Support[]; novels: Novel[]; readingLogs: ReadingLog[]; stars: Star[];
  materials: Material[]; gachaRecords: GachaRecord[]; orders: Order[];
}): Overview {
  const spend =
    data.merch.filter(m => ['own', 'dup', 'lent', 'damaged', 'lost'].includes(m.status))
      .reduce((s, m) => s + (m.totalPrice || 0), 0) +
    data.schedules.reduce((s, x) => s + (x.cost || 0), 0) +
    data.supports.reduce((s, x) => s + (x.amount || 0), 0);
  const income = data.sales
    .filter(s => ['sale', 'exchange'].includes(s.type))
    .reduce((s, x) => s + (x.net || 0), 0);
  return {
    totalSpend: spend,
    totalIncome: income,
    netSpend: spend - income,
    totalMerch: data.merch.filter(m => ['own', 'dup', 'lent'].includes(m.status)).length,
    totalGames: data.games.length,
    totalNovels: data.novels.length,
    totalStars: data.stars.length,
    totalMaterials: data.materials.length,
    totalSchedules: data.schedules.length,
    totalGacha: data.gachaRecords.reduce((s, r) => s + (r.pulls || 0), 0),
    totalReadBooks: data.novels.filter(n => n.status === 'read').length,
    totalReadWords: data.readingLogs.reduce((s, r) => s + (r.words || 0), 0),
    totalReadMinutes: data.readingLogs.reduce((s, r) => s + (r.duration || 0), 0),
  };
}

export function gachaStats(records: GachaRecord[], items: GachaItem[]) {
  const totalPulls = records.reduce((s, r) => s + (r.pulls || 0), 0);
  const outItems = items.filter(i => i.isOut);
  const totalOut = outItems.length;
  const upHits = outItems.filter(i => i.isUp).length;
  const miss = outItems.filter(i => i.isMiss).length;
  const rate = totalPulls ? (totalOut / totalPulls) * 100 : 0;
  const upRate = totalOut ? (upHits / totalOut) * 100 : 0;
  const missRate = totalOut ? (miss / totalOut) * 100 : 0;
  const avgPull = totalOut ? totalPulls / totalOut : 0;
  return { totalPulls, totalOut, upHits, miss, rate, upRate, missRate, avgPull };
}

export function monthlyTrend<T extends { acquireDate?: string; date?: string; datetime?: string }>(
  list: T[],
  valueOf: (item: T) => number,
  months = 6,
): { month: string; value: number }[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const map = new Map<string, number>(keys.map(k => [k, 0]));
  list.forEach(item => {
    const k = monthKey(item.acquireDate || item.date || item.datetime);
    if (map.has(k)) map.set(k, (map.get(k) || 0) + valueOf(item));
  });
  return keys.map(k => ({ month: k.slice(2), value: map.get(k) || 0 }));
}

export function distributeBy<T>(list: T[], keyOf: (item: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  list.forEach(item => {
    const k = keyOf(item);
    if (!k) return;
    map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}
