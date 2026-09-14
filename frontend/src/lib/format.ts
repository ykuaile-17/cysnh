import { format, formatDistanceToNow, isToday, isFuture, differenceInCalendarDays } from 'date-fns';

export const fmtMoney = (n: number | undefined | null, hide = false) => {
  if (hide) return '***';
  if (n === undefined || n === null) return '¥0';
  return '¥' + n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
};

export const fmtNum = (n: number | undefined | null) => {
  if (n === undefined || n === null) return '0';
  return n.toLocaleString('zh-CN');
};

export const fmtDate = (iso?: string) => {
  if (!iso) return '';
  return format(new Date(iso), 'yyyy-MM-dd');
};

export const fmtDateTime = (iso?: string) => {
  if (!iso) return '';
  return format(new Date(iso), 'MM-dd HH:mm');
};

export const fromNow = (iso?: string) => {
  if (!iso) return '';
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
};

export const isUpcoming = (iso?: string) => !!iso && isFuture(new Date(iso));
export const isDateToday = (iso?: string) => !!iso && isToday(new Date(iso));

export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  return differenceInCalendarDays(new Date(iso), new Date());
};

export const countdownText = (iso?: string) => {
  const d = daysUntil(iso);
  if (d === null) return '';
  if (d > 0) return `还有 ${d} 天`;
  if (d === 0) return '就是今天';
  return `已过 ${Math.abs(d)} 天`;
};

// 标签 / 状态中文映射
export const GAME_STATUS: Record<string, string> = {
  playing: '在玩', paused: '暂停', abandoned: '弃坑', completed: '通关',
};
export const STORY_STATUS: Record<string, string> = {
  unwatch: '未看', watching: '在看', watched: '已看', skip: '跳过',
};
export const STORY_TYPE: Record<string, string> = {
  main: '主线', event: '活动', card: '卡面', other: '其他',
};
export const POOL_TYPE: Record<string, string> = {
  limited: '限定UP', permanent: '常驻', character: '角色池', weapon: '武器池',
  novice: '新手池', event: '活动池', rerun: '复刻池', collab: '联动池', other: '其他',
};
export const STAR_STATUS: Record<string, string> = {
  active: '热恋', stable: '平稳', cooling: '淡坑', quit: '退坑', watching: '观望',
};
export const STAR_TYPE: Record<string, string> = {
  solo: '单人', group: '团体', cp: 'CP', virtual: '虚拟偶像', other: '其他',
};
export const MATERIAL_TYPE: Record<string, string> = {
  stage: '舞台/直拍', mv: 'MV/练习室', variety: '综艺/团综', live: '直播/电台',
  interview: '采访/杂志', music: '歌曲/专辑', drama: '影视/剧集', bts: '花絮/vlog', other: '其他',
};
export const MATERIAL_STATUS: Record<string, string> = {
  want: '想看', watching: '在看', watched: '已看', skip: '跳过',
};
export const SCHEDULE_TYPE: Record<string, string> = {
  concert: '演唱会', fanmeet: '见面会/签售', stage: '打歌/预录', birthday: '生日应援',
  popups: '快闪店', festival: '音乐节', other: '其他',
};
export const SCHEDULE_STATUS: Record<string, string> = {
  want: '想去', booked: '已抢票', done: '已去', cancel: '取消', miss: '错过',
};
export const SUPPORT_TYPE: Record<string, string> = {
  vote: '投票/打投', fund: '集资', birthday: '生日应援', album: '专辑冲量',
  audio: '音源/油管', chart: '打榜', offline: '线下应援', charity: '公益应援',
};
export const MEDIA_TYPE: Record<string, string> = {
  official: '官方图', fanpic: '饭拍', fancam: '直拍', edit: '修图', meme: '表情包', video: '视频', audio: '音频',
};
export const NOVEL_STATUS: Record<string, string> = {
  want: '想读', reading: '在读', read: '已读', abandon: '弃文', hold: '搁置', reread: '重读',
};
export const READ_MODE: Record<string, string> = { ebook: '电子', paper: '实体', audio: '听书' };
export const NOTE_TYPE: Record<string, string> = {
  short: '短评', long: '长评', chapter: '章节感想', character: '人物分析',
  cp: 'CP分析', plot: '剧情分析', world: '世界观', roast: '吐槽', recommend: '推荐语',
};
export const MERCH_STATUS: Record<string, string> = {
  own: '拥有', dup: '重复', wish: '心愿', sold: '已出', lent: '出借', lost: '丢失', damaged: '损坏',
};
export const MERCH_CATEGORY: Record<string, string> = {
  game: '游戏周边', star: '追星周边', other: '其他',
};
export const ORDER_STATUS: Record<string, string> = {
  unpaid: '待付款', paid: '已付款', deposit: '待补款', unshipped: '待发货',
  shipped: '已发货', arrived: '已到货', cancel: '已取消', refund: '退款',
};
export const SALE_TYPE: Record<string, string> = {
  sale: '出物', exchange: '交换', gift: '赠送', lost: '丢失', damage: '损坏', lend: '出借',
};
export const WISH_PRIORITY: Record<string, string> = { high: '高', mid: '中', low: '低' };

export const REMINDER_TYPE_LABEL: Record<string, string> = {
  gacha_end: '卡池结束', event_end: '活动结束', birthday: '生日', comeback: '回归',
  ticket: '开票', concert: '演唱会', vote_end: '打投截止', novel_update: '小说更新',
  novel_end: '小说完结', book_publish: '实体书出版', merch_deposit: '周边补款',
  merch_balance: '周边尾款', merch_ship: '周边发货', merch_arrive: '周边到货',
  sale_end: '出物截止', reprint: '再贩', group_end: '拼团截止', budget: '预算', anniversary: '纪念日',
};

export const RARITY_COLOR: Record<string, string> = {
  '6★': '#ff4d6d', '5★': '#ff9f1c', '4★': '#c77dff', '3★': '#4cc9f0', '2★': '#90be6d', '1★': '#adb5b8',
  SSR: '#f59e0b', UR: '#ef4444', SR: '#a855f7', R: '#3b82f6', N: '#94a3b8',
  '红卡': '#ef4444', '黄卡': '#eab308', '绿卡': '#22c55e', '普卡': '#94a3b8',
};

// 稀有度下拉选项（含星级、红黄绿卡等）
export const RARITY_OPTIONS: { value: string; label: string }[] = [
  { value: '6★', label: '6★' }, { value: '5★', label: '5★' }, { value: '4★', label: '4★' },
  { value: '3★', label: '3★' }, { value: '2★', label: '2★' }, { value: '1★', label: '1★' },
  { value: 'UR', label: 'UR' }, { value: 'SSR', label: 'SSR' }, { value: 'SR', label: 'SR' },
  { value: 'R', label: 'R' }, { value: 'N', label: 'N' },
  { value: '红卡', label: '红卡' }, { value: '黄卡', label: '黄卡' }, { value: '绿卡', label: '绿卡' }, { value: '普卡', label: '普卡' },
];

export const MERCH_EMOJI = '🧸'; // 周边模块图标（替换原 🎎 两个小人）
