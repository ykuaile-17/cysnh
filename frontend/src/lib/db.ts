import Dexie, { Table } from 'dexie';
import {
  Game, GameStory, GachaPool, GachaRecord, GachaItem, Card, GameAccount,
  Star, Material, Schedule, Support, Media,
  Novel, ReadingLog, Note, Excerpt, Character, BookList,
  Merch, Order, OrderItem, Sale, Storage, Wish,
  Reminder, Tag, AppSettings, Photocard, HistoryEntry,
} from './types';

class CiyuanDB extends Dexie {
  settings!: Table<AppSettings, string>;
  games!: Table<Game, string>;
  gameStories!: Table<GameStory, string>;
  gachaPools!: Table<GachaPool, string>;
  gachaRecords!: Table<GachaRecord, string>;
  gachaItems!: Table<GachaItem, string>;
  cards!: Table<Card, string>;
  stars!: Table<Star, string>;
  materials!: Table<Material, string>;
  schedules!: Table<Schedule, string>;
  supports!: Table<Support, string>;
  media!: Table<Media, string>;
  novels!: Table<Novel, string>;
  readingLogs!: Table<ReadingLog, string>;
  notes!: Table<Note, string>;
  excerpts!: Table<Excerpt, string>;
  characters!: Table<Character, string>;
  bookLists!: Table<BookList, string>;
  merch!: Table<Merch, string>;
  orders!: Table<Order, string>;
  orderItems!: Table<OrderItem, string>;
  sales!: Table<Sale, string>;
  storage!: Table<Storage, string>;
  wishes!: Table<Wish, string>;
  reminders!: Table<Reminder, string>;
  tags!: Table<Tag, string>;
  accounts!: Table<GameAccount, string>;
  photocards!: Table<Photocard, string>;
  history!: Table<HistoryEntry, string>;

  constructor() {
    super('ciyuan-storage');
    this.version(1).stores({
      settings: 'key',
      games: 'id, name, status, archived, deletedAt, updatedAt',
      gameStories: 'id, gameId, deletedAt, createdAt',
      gachaPools: 'id, gameId, deletedAt',
      gachaRecords: 'id, gameId, poolId, deletedAt, datetime',
      gachaItems: 'id, recordId',
      cards: 'id, gameId, deletedAt',
      stars: 'id, name, status, deletedAt, updatedAt',
      materials: 'id, starId, deletedAt',
      schedules: 'id, starId, deletedAt, datetime',
      supports: 'id, starId, deletedAt',
      media: 'id, starId, deletedAt',
      novels: 'id, title, status, deletedAt, updatedAt',
      readingLogs: 'id, novelId, deletedAt, datetime',
      notes: 'id, novelId, deletedAt',
      excerpts: 'id, novelId, deletedAt',
      characters: 'id, novelId, deletedAt',
      bookLists: 'id, deletedAt',
      merch: 'id, name, ip, status, deletedAt, updatedAt',
      orders: 'id, deletedAt, orderDate',
      orderItems: 'id, orderId, merchId',
      sales: 'id, merchId, deletedAt, date',
      storage: 'id, merchId, deletedAt',
      wishes: 'id, deletedAt',
      reminders: 'id, module, targetId, deletedAt, datetime, status',
      tags: 'id, module, deletedAt',
      accounts: 'id, gameId, deletedAt',
      photocards: 'id, starId, deletedAt',
      history: 'id, table, recordId, createdAt',
    });
  }
}

export const db = new CiyuanDB();

export const uid = () =>
  (crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

const now = () => Date.now();
const DAY = 86400000;
const iso = (offsetDays = 0) => new Date(now() + offsetDays * DAY).toISOString().slice(0, 10);

function base(extra: any = {}) {
  const t = now();
  return { id: uid(), createdAt: t, updatedAt: t, deletedAt: null, ...extra };
}

// 软删除 / 恢复 / 彻底删除
export async function softDelete(table: Table<any, any>, id: string) {
  await table.update(id, { deletedAt: now(), updatedAt: now() });
}
export async function restore(table: Table<any, any>, id: string) {
  await table.update(id, { deletedAt: null, updatedAt: now() });
}
export async function hardDelete(table: Table<any, any>, id: string) {
  await table.delete(id);
}

export async function seedIfEmpty() {
  const count = await db.games.count();
  if (count > 0) return;

  // ===== 游戏 =====
  const g1 = base({ name: '星轨幻想', cover: '🌌', platform: 'iOS/Android', type: '开放世界', status: 'playing', startDate: iso(-120), progress: '主线第三章', tags: ['抽卡', '养成'], note: '', archived: false, pityBase: 90 });
  const g2 = base({ name: '苍焰契约', cover: '🔥', platform: 'PC', type: '卡牌', status: 'paused', startDate: iso(-60), progress: '活动进度 70%', tags: ['回合制'], note: '', archived: false, pityBase: 80 });
  const g3 = base({ name: '猫国物语', cover: '🐱', platform: 'Switch', type: '休闲', status: 'completed', startDate: iso(-200), progress: '全收集', tags: ['治愈'], note: '', archived: false, pityBase: 0 });
  await db.games.bulkAdd([g1, g2, g3]);

  // 游戏账号
  await db.accounts.bulkAdd([
    base({ gameId: g1.id, name: '主号', server: '天空岛', uid: '800000123', role: '莉莉党', note: '' }),
    base({ gameId: g1.id, name: '小号', server: '世界树', uid: '800000456', role: '', note: '囤原石' }),
    base({ gameId: g2.id, name: '苍焰号', server: '炎之境', uid: '200000789', role: '', note: '' }),
  ]);

  // 剧情
  await db.gameStories.bulkAdd([
    base({ gameId: g1.id, type: 'main', title: '风起之章', chapter: '3-2', status: 'watching', progress: '进行中', feeling: '剧情太好哭了', rating: 5, spoiler: true, tags: [] }),
    base({ gameId: g1.id, type: 'event', title: '夏日祭活动', chapter: '活动', status: 'watched', progress: '已完成', feeling: '立绘好看', rating: 4, spoiler: false, tags: [] }),
    base({ gameId: g2.id, type: 'main', title: '契约之始', chapter: '1-1', status: 'watched', progress: '已完成', feeling: '', rating: 4, spoiler: false, tags: [] }),
  ]);

  // 卡池 + 抽卡
  const p1 = base({ gameId: g1.id, name: '限定UP·星之少女', type: 'limited', startDate: iso(-10), endDate: iso(5) });
  await db.gachaPools.add(p1);
  const gr1 = base({ gameId: g1.id, poolId: p1.id, datetime: iso(-3), pulls: 80, costType: '原石', costAmount: 12800, note: '冲当期UP' });
  await db.gachaRecords.add(gr1);
  await db.gachaItems.bulkAdd([
    { id: uid(), recordId: gr1.id, cardName: '星之少女', character: '莉莉', rarity: 'SSR', isUp: true, isOut: true, pullIndex: 78, isGuaranteed: true, isMiss: false },
    { id: uid(), recordId: gr1.id, cardName: '炎之骑士', character: '凯', rarity: 'SR', isUp: false, isOut: true, pullIndex: 40, isGuaranteed: false, isMiss: false },
    { id: uid(), recordId: gr1.id, cardName: '风之精灵', character: '风', rarity: 'R', isUp: false, isOut: true, pullIndex: 10, isGuaranteed: false, isMiss: false },
  ]);
  const gr2 = base({ gameId: g1.id, poolId: p1.id, datetime: iso(-1), pulls: 10, costType: '原石', costAmount: 1600, note: '' });
  await db.gachaRecords.add(gr2);
  await db.cards.bulkAdd([
    base({ gameId: g1.id, name: '星之少女', character: '莉莉', rarity: 'SSR', owned: true, obtainWay: '抽卡', obtainDate: iso(-3) }),
    base({ gameId: g1.id, name: '炎之骑士', character: '凯', rarity: 'SR', owned: true, obtainWay: '抽卡', obtainDate: iso(-3) }),
    base({ gameId: g1.id, name: '深渊之王', character: '深渊', rarity: 'SSR', owned: false, obtainWay: '', obtainDate: '' }),
  ]);

  // ===== 追星 =====
  const s1 = base({ name: '星野遥', alias: '遥遥', cover: '⭐', type: 'solo', group: '', company: 'Stella', birthday: iso(40), debutDate: iso(-400), color: '#7c5cff', startDate: iso(-300), reason: '一首歌入坑', status: 'active', level: '本命', tags: ['歌手'], note: '' });
  const s2 = base({ name: 'Lumina 组合', alias: 'LM', cover: '✨', type: 'group', group: 'Lumina', company: 'Apex', birthday: '', debutDate: iso(-500), color: '#ff7eb6', startDate: iso(-200), reason: '团综', status: 'stable', level: '关注', tags: ['女团'], note: '' });
  await db.stars.bulkAdd([s1, s2]);

  // 小卡 / 专辑图鉴
  await db.photocards.bulkAdd([
    base({ starId: s1.id, album: '首专《夜空》', name: '遥遥 主打曲', kind: 'album', rarity: 'SSR', total: 1, owned: 1, dup: 0, note: '' }),
    base({ starId: s1.id, album: '首专《夜空》', name: '遥遥 特典', kind: 'event', rarity: 'R', total: 3, owned: 1, dup: 2, note: '重复可出' }),
    base({ starId: s2.id, album: '团综三季', name: 'LM 签名卡', kind: 'event', rarity: 'SR', total: 1, owned: 1, dup: 0, note: '' }),
  ]);
  await db.materials.bulkAdd([
    base({ starId: s1.id, type: 'mv', title: '夜空的歌 MV', album: '首专', date: iso(-20), platform: 'YouTube', url: '', status: 'watched', rating: 5, feeling: '封神现场', highlight: '副歌直拍', tags: [] }),
    base({ starId: s1.id, type: 'live', title: '巡演首场', episode: '东京', date: iso(-5), platform: '', url: '', status: 'want', rating: 0, feeling: '', highlight: '', tags: [] }),
    base({ starId: s2.id, type: 'variety', title: '团综第三季', episode: 'EP3', date: iso(-15), platform: '站内', url: '', status: 'watching', rating: 4, feeling: '好甜', highlight: '', tags: [] }),
  ]);
  await db.schedules.bulkAdd([
    base({ starId: s1.id, title: '遥遥生日应援', type: 'birthday', datetime: iso(40), city: '上海', venue: '广场', tier: '', price: 0, cost: 800, status: 'want', repo: '', tags: [] }),
    base({ starId: s1.id, title: '巡回演唱会', type: 'concert', datetime: iso(12), city: '北京', venue: '体育馆', tier: 'VIP', price: 1280, seat: 'A区', cost: 1280, status: 'booked', repo: '', tags: [] }),
  ]);
  await db.supports.bulkAdd([
    base({ starId: s1.id, project: '新专冲榜', type: 'chart', platform: '音源', date: iso(-8), target: '日冠', method: '音源购买', amount: 200, count: 20, result: '达成', note: '' }),
  ]);
  await db.media.bulkAdd([
    base({ starId: s1.id, type: 'fancam', title: '安可直拍', source: '饭拍', author: '站姐A', date: iso(-6), favorite: true, best: true, tags: [] }),
  ]);

  // ===== 小说 =====
  const n1 = base({ title: '剑与花的物语', author: '青霖', cover: '📖', type: '奇幻', theme: '冒险', source: '晋江', status: 'reading', serialStatus: '连载中', words: 1200000, chapters: 480, startDate: iso(-50), finishDate: '', rating: 5, tags: ['HE', '群像'], note: '' });
  const n2 = base({ title: '深海回声', author: '默白', cover: '🌊', type: '悬疑', theme: '治愈', source: '实体', status: 'read', serialStatus: '已完结', words: 300000, chapters: 32, startDate: iso(-100), finishDate: iso(-30), rating: 4, tags: ['BE', '细腻'], note: '' });
  const n3 = base({ title: '星屑食堂', author: '夜行', cover: '🍜', type: '治愈', theme: '日常', source: '番茄', status: 'want', serialStatus: '连载中', words: 200000, chapters: 80, startDate: '', finishDate: '', rating: 0, tags: ['美食'], note: '' });
  await db.novels.bulkAdd([n1, n2, n3]);
  await db.readingLogs.bulkAdd([
    base({ novelId: n1.id, datetime: iso(-2), mode: 'ebook', startChapter: '210', endChapter: '215', words: 15000, duration: 90, progress: '215/480', mood: '😊', feeling: '节奏起来了' }),
    base({ novelId: n1.id, datetime: iso(-5), mode: 'ebook', startChapter: '200', endChapter: '210', words: 30000, duration: 180, progress: '210/480', mood: '🥺', feeling: '虐但好看' }),
    base({ novelId: n2.id, datetime: iso(-35), mode: 'paper', startChapter: '1', endChapter: '32', words: 300000, duration: 600, progress: '完结', mood: '😭', feeling: '意难平' }),
  ]);
  await db.notes.bulkAdd([
    base({ novelId: n1.id, type: 'character', title: '主角团分析', chapter: '', rating: 5, content: '三人羁绊写得很动人，尤其是男二的牺牲。', mood: '🥺', spoiler: true, tags: ['人物'] }),
    base({ novelId: n2.id, type: 'roast', title: '结局吐槽', chapter: '', rating: 3, content: '为什么要把他写死啊！', mood: '😭', spoiler: true, tags: ['结局'] }),
  ]);
  await db.excerpts.bulkAdd([
    base({ novelId: n1.id, content: '光会照亮每一个迷路的人，只要你还愿意向前走。', source: '第212章', type: '台词', feeling: '被治愈了', favorite: true, best: true, tags: ['治愈'] }),
    base({ novelId: n2.id, content: '海的声音，是故乡在呼唤。', source: '终章', type: '描写', feeling: '', favorite: false, best: false, tags: [] }),
  ]);
  await db.characters.bulkAdd([
    base({ novelId: n1.id, name: '艾琳', type: '女主', gender: '女', identity: '剑士', appearance: '银发', personality: '坚毅', ending: 'HE', favor: 5, tags: [] }),
    base({ novelId: n1.id, name: '凯恩', type: '男二', gender: '男', identity: '法师', appearance: '金发', personality: '温柔', ending: '牺牲', favor: 4, tags: [] }),
  ]);

  // ===== 周边 =====
  const m1 = base({ name: '星之少女 1/7 手办', cover: '🎎', ip: '星轨幻想', character: '莉莉', type: '手办', pattern: '常规', version: '初版', official: 'official', condition: '全新', qty: 1, unitPrice: 899, totalPrice: 899, acquireDate: iso(-3), platform: '官网', shop: '官方', orderNo: 'A001', logistics: '已到货', status: 'own', location: '展示柜A', tags: ['手办'], note: '' });
  const m2 = base({ name: '遥遥生写', cover: '📷', ip: '星野遥', character: '星野遥', type: '写真', pattern: '', version: '', official: 'doujin', condition: '全新', qty: 2, unitPrice: 45, totalPrice: 90, acquireDate: iso(-20), platform: '闲鱼', shop: '谷店', orderNo: '', logistics: '已到货', status: 'own', location: '收纳盒1', tags: [], note: '' });
  const m3 = base({ name: 'Lumina 应援棒', cover: '🪄', ip: 'Lumina', character: '', type: '应援', pattern: '', version: '', official: 'official', condition: '全新', qty: 1, unitPrice: 199, totalPrice: 199, acquireDate: iso(-15), platform: '官网', shop: '官方', orderNo: 'B002', logistics: '已到货', status: 'own', location: '演唱会包', tags: [], note: '' });
  const m4 = base({ name: '剑与花 设定集', cover: '📚', ip: '剑与花的物语', character: '', type: '书', pattern: '', version: '', official: 'official', condition: '全新', qty: 1, unitPrice: 128, totalPrice: 128, acquireDate: iso(-40), platform: '当当', shop: '', orderNo: '', logistics: '已到货', status: 'own', location: '书架', tags: [], note: '' });
  const m5 = base({ name: '重复色纸', cover: '🎴', ip: '星野遥', character: '星野遥', type: '色纸', pattern: '', version: '', official: 'doujin', condition: '瑕疵', qty: 3, unitPrice: 20, totalPrice: 60, acquireDate: iso(-10), platform: '拼团', shop: '团长', orderNo: '', logistics: '已到货', status: 'dup', location: '待出', tags: [], note: '重复可出' });
  await db.merch.bulkAdd([m1, m2, m3, m4, m5]);
  await db.orders.bulkAdd([
    base({ name: '星之少女手办订单', ip: '星轨幻想', orderDate: iso(-30), platform: '官网', shop: '官方', orderNo: 'A001', originPrice: 899, shipping: 0, tax: 0, discount: 0, total: 899, currency: 'CNY', payMethod: '支付宝', status: 'arrived', logistics: '顺丰', trackingNo: 'SF123', depositDate: '', balance: 0, arrivalDate: iso(-3), note: '' }),
    base({ name: 'Lumina周边拼团', ip: 'Lumina', orderDate: iso(-18), platform: '拼团', shop: '团长', orderNo: 'B002', originPrice: 199, shipping: 10, tax: 0, discount: 0, total: 209, currency: 'CNY', payMethod: '微信', status: 'deposit', logistics: '', trackingNo: '', depositDate: iso(-18), balance: 100, arrivalDate: '', note: '待补款' }),
  ]);
  await db.sales.bulkAdd([
    base({ merchId: m5.id, type: 'sale', date: iso(2), platform: '闲鱼', buyer: '小A', price: 25, shipping: 8, fee: 0, net: 17, status: 'done', reason: '重复出', note: '' }),
  ]);
  await db.storage.bulkAdd([
    base({ merchId: m1.id, location: '展示柜A', box: '', layer: '上层', display: true, moisture: false, lightproof: false, lent: false, lentTo: '', lentDate: '', returnDate: '', note: '' }),
    base({ merchId: m2.id, location: '收纳盒1', box: '盒1', layer: '', display: false, moisture: true, lightproof: true, lent: false, lentTo: '', lentDate: '', returnDate: '', note: '' }),
  ]);
  await db.wishes.bulkAdd([
    base({ name: '深渊之王 手办', ip: '星轨幻想', character: '深渊', type: '手办', pattern: '', version: '', official: 'official', targetPrice: 999, currentPrice: 1099, priority: 'high', status: '关注', channel: '官网', remind: true, budget: 1200, note: '' }),
  ]);

  // ===== 提醒 =====
  await db.reminders.bulkAdd([
    base({ title: '星轨幻想 卡池结束', module: 'game', targetId: g1.id, type: 'gacha_end', datetime: iso(5), repeat: 'none', advance: 1440, priority: '高', status: 'pending', note: '' }),
    base({ title: 'Lumina 拼团补款', module: 'merch', targetId: null, type: 'merch_deposit', datetime: iso(3), repeat: 'none', advance: 1440, priority: '高', status: 'pending', note: '' }),
    base({ title: '遥遥生日', module: 'star', targetId: s1.id, type: 'birthday', datetime: iso(40), repeat: 'year', advance: 2880, priority: '中', status: 'pending', note: '' }),
    base({ title: '巡回演唱会', module: 'star', targetId: s1.id, type: 'concert', datetime: iso(12), repeat: 'none', advance: 1440, priority: '高', status: 'pending', note: '' }),
  ]);

  // ===== 标签 =====
  await db.tags.bulkAdd([
    base({ name: '抽卡', module: 'game', color: '#7c5cff' }),
    base({ name: '本命', module: 'star', color: '#ff7eb6' }),
    base({ name: 'HE', module: 'novel', color: '#22c55e' }),
    base({ name: '手办', module: 'merch', color: '#f59e0b' }),
  ]);

  // ===== 设置 =====
  await db.settings.put({ key: 'profile', value: { nickname: '谷主', avatar: '🌟', signature: '把每一份热爱都收进谷里', joinedDate: now() - 365 * DAY } });
  await db.settings.put({ key: 'ui', value: { theme: 'system', hideAmount: false, hideSpoiler: false } });
  await db.settings.put({ key: 'modules', value: { games: true, stars: true, novels: true, merch: true } });
  await db.settings.put({ key: 'pin', value: { enabled: false, code: '' } });
}
