// 次元收纳盒 — 全局数据模型类型定义
// 所有实体均采用软删除（deletedAt），以支持回收站功能

export type ID = string;
export type ISODate = string;

export interface BaseEntity {
  id: ID;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

// 主题 / 外观
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  key: string; // 'profile' | 'ui' | 'modules' | 'pin'
  value: any;
}

export interface Profile {
  nickname: string;
  avatar: string; // emoji or color
  avatarImg?: string; // 上传的头像图片 dataURL
  photos?: string[]; // 个人相册（多张）
  signature: string;
  joinedDate: number;
}

export interface UISettings {
  theme: ThemeMode;
  hideAmount: boolean;
  hideSpoiler: boolean;
}

export interface ModuleToggle {
  games: boolean;
  stars: boolean;
  novels: boolean;
  merch: boolean;
}

// ============ 游戏 ============
export type GameStatus = 'playing' | 'paused' | 'abandoned' | 'completed';
export type GachaPoolType =
  | 'limited'
  | 'permanent'
  | 'character'
  | 'weapon'
  | 'novice'
  | 'event'
  | 'rerun'
  | 'collab'
  | 'other';

export interface Game extends BaseEntity {
  name: string;
  cover: string; // emoji/color
  coverImg?: string; // 上传的图片 dataURL
  platform: string;
  type: string;
  status: GameStatus;
  startDate: ISODate;
  progress: string; // 剧情进度描述
  tags: string[];
  note: string;
  archived: boolean;
  pityBase: number; // 保底抽数
}

export type StoryType = 'main' | 'event' | 'card' | 'other';
export type StoryStatus = 'unwatch' | 'watching' | 'watched' | 'skip';

export interface GameStory extends BaseEntity {
  gameId: ID;
  type: StoryType;
  title: string;
  chapter: string;
  startDate: ISODate;
  endDate: ISODate;
  status: StoryStatus;
  progress: string;
  summary: string;
  feeling: string;
  rating: number;
  spoiler: boolean;
  tags: string[];
  note: string;
  images?: string[]; // 剧情截图（多张）
}

export interface GachaPool extends BaseEntity {
  gameId: ID;
  name: string;
  type: GachaPoolType;
  startDate: ISODate;
  endDate: ISODate;
  pityHard?: number; // 硬保底抽数（按卡池独立）
  pitySoft?: number; // 软保底抽数（可选）
}

export interface GachaRecord extends BaseEntity {
  gameId: ID;
  poolId: ID | null;
  datetime: ISODate;
  pulls: number;
  costType: string;
  costAmount: number;
  note: string;
  images?: string[]; // 抽卡截图（多张）
}

export interface GachaItem {
  id: ID;
  recordId: ID;
  cardName: string;
  character: string;
  rarity: string; // SSR/SR/R...
  isUp: boolean;
  isOut: boolean; // 是否出货
  pullIndex: number;
  isGuaranteed: boolean;
  isMiss: boolean; // 是否歪了
}

export interface Card extends BaseEntity {
  gameId: ID;
  name: string;
  coverImg?: string; // 主图（兼容旧数据，取 images[0]）
  images?: string[]; // 卡面图片（多张）
  character: string;
  rarity: string;
  owned: boolean;
  obtainWay: string;
  obtainDate: ISODate;
  storyId?: ID | null; // 联动剧情
  accountId?: ID | null; // 所属账号
  accountNote?: string; // 账号备注（如：该卡由某号拥有）
  awaken?: number; // 觉醒/突破次数（如突破到第几阶）
}

// ============ 追星 ============
export type StarType = 'solo' | 'group' | 'cp' | 'virtual' | 'other';
export type StarStatus = 'active' | 'stable' | 'cooling' | 'quit' | 'watching';

export interface Star extends BaseEntity {
  name: string;
  alias: string;
  cover: string;
  coverImg?: string;
  type: StarType;
  group: string;
  company: string;
  birthday: ISODate;
  debutDate: ISODate;
  color: string; // 应援色（主色）
  color2?: string; // 应援色第二色（双拼，可选）
  startDate: ISODate;
  reason: string;
  status: StarStatus;
  level: string; // 本命程度
  tags: string[];
  note: string;
}

export type MaterialType =
  | 'stage'
  | 'mv'
  | 'variety'
  | 'live'
  | 'interview'
  | 'music'
  | 'drama'
  | 'bts'
  | 'other';
export type MaterialStatus = 'want' | 'watching' | 'watched' | 'skip';

export interface Material extends BaseEntity {
  starId: ID;
  type: MaterialType;
  title: string;
  album: string;
  episode: string;
  date: ISODate;
  platform: string;
  url: string;
  duration: number;
  status: MaterialStatus;
  progress: string;
  rating: number;
  feeling: string;
  highlight: string;
  member: string;
  tags: string[];
  note: string;
  images?: string[]; // 物料截图（多张）
}

export type ScheduleType =
  | 'concert'
  | 'fanmeet'
  | 'stage'
  | 'birthday'
  | 'popups'
  | 'festival'
  | 'other';
export type ScheduleStatus = 'want' | 'booked' | 'done' | 'cancel' | 'miss';

export interface Schedule extends BaseEntity {
  starId: ID;
  title: string;
  type: ScheduleType;
  datetime: ISODate;
  city: string;
  venue: string;
  tier: string;
  price: number;
  seat: string;
  companion: string;
  weather: string;
  status: ScheduleStatus;
  repo: string;
  cost: number;
  merchId: ID | null;
  tags: string[];
  note: string;
}

export type SupportType =
  | 'vote'
  | 'fund'
  | 'birthday'
  | 'album'
  | 'audio'
  | 'chart'
  | 'offline'
  | 'charity';

export interface Support extends BaseEntity {
  starId: ID;
  project: string;
  type: SupportType;
  platform: string;
  date: ISODate;
  target: string;
  method: string;
  amount: number;
  count: number;
  result: string;
  note: string;
}

export type MediaType = 'official' | 'fanpic' | 'fancam' | 'edit' | 'meme' | 'video' | 'audio';

export interface Media extends BaseEntity {
  starId: ID;
  type: MediaType;
  title: string;
  source: string;
  author: string;
  date: ISODate;
  favorite: boolean;
  best: boolean;
  tags: string[];
  note: string;
}

// ============ 小说 ============
export type NovelStatus = 'want' | 'reading' | 'read' | 'abandon' | 'hold' | 'reread';

export interface Novel extends BaseEntity {
  title: string;
  author: string;
  cover: string;
  coverImg?: string;
  type: string;
  theme: string;
  source: string;
  status: NovelStatus;
  serialStatus: string;
  words: number;
  chapters: number;
  startDate: ISODate;
  finishDate: ISODate;
  rating: number;
  tags: string[];
  note: string;
}

export type ReadMode = 'ebook' | 'paper' | 'audio';

export interface ReadingLog extends BaseEntity {
  novelId: ID;
  datetime: ISODate;
  mode: ReadMode;
  startChapter: string;
  endChapter: string;
  words: number;
  duration: number; // 分钟
  progress: string;
  mood: string;
  feeling: string;
  note: string;
}

export type NoteType =
  | 'short'
  | 'long'
  | 'chapter'
  | 'character'
  | 'cp'
  | 'plot'
  | 'world'
  | 'roast'
  | 'recommend';

export interface Note extends BaseEntity {
  novelId: ID;
  type: NoteType;
  title: string;
  chapter: string;
  date: ISODate;
  rating: number;
  content: string;
  mood: string;
  tags: string[];
  spoiler: boolean;
  note: string;
}

export interface Excerpt extends BaseEntity {
  novelId: ID;
  content: string;
  source: string;
  type: string;
  date: ISODate;
  feeling: string; // 感想
  thought: string; // 碎碎念
  tags: string[];
  mood: string;
  favorite: boolean;
  best: boolean;
}

export interface Character extends BaseEntity {
  novelId: ID;
  name: string;
  type: string;
  gender: string;
  identity: string;
  appearance: string;
  personality: string;
  ending: string;
  favor: number;
  tags: string[];
  note: string;
}

export interface BookList extends BaseEntity {
  name: string;
  desc: string;
  novelIds: ID[];
  tags: string[];
  isPublic: boolean;
}

// ============ 周边 ============
export type MerchStatus =
  | 'own'
  | 'dup'
  | 'wish'
  | 'sold'
  | 'lent'
  | 'lost'
  | 'damaged';

export interface Merch extends BaseEntity {
  name: string;
  cover: string;
  coverImg?: string; // 主图（取 images[0] 或单独上传）
  images?: string[]; // 多张实物照片
  category?: 'game' | 'star' | 'other'; // 分类：游戏周边/追星周边/其他
  ip: string;
  character: string;
  type: string;
  pattern: string;
  version: string;
  official: 'official' | 'doujin';
  condition: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  acquireDate: ISODate;
  platform: string;
  shop: string;
  orderNo: string;
  logistics: string;
  status: MerchStatus;
  location: string;
  tags: string[];
  note: string;
}

export type OrderStatus =
  | 'unpaid'
  | 'paid'
  | 'deposit'
  | 'unshipped'
  | 'shipped'
  | 'arrived'
  | 'cancel'
  | 'refund';

export interface Order extends BaseEntity {
  name: string;
  ip: string;
  orderDate: ISODate;
  platform: string;
  shop: string;
  orderNo: string;
  originPrice: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  payMethod: string;
  status: OrderStatus;
  logistics: string;
  trackingNo: string;
  depositDate: ISODate;
  balance: number;
  arrivalDate: ISODate;
  note: string;
}

export interface OrderItem {
  id: ID;
  orderId: ID;
  merchId: ID | null;
  qty: number;
  price: number;
  arrived: boolean;
  stored: boolean;
  sold: boolean;
}

export type SaleType = 'sale' | 'exchange' | 'gift' | 'lost' | 'damage' | 'lend';

export interface Sale extends BaseEntity {
  merchId: ID;
  type: SaleType;
  date: ISODate;
  platform: string;
  buyer: string;
  price: number;
  shipping: number;
  fee: number;
  net: number;
  status: string;
  reason: string;
  note: string;
}

export interface Storage extends BaseEntity {
  merchId: ID;
  location: string;
  box: string;
  layer: string;
  display: boolean;
  moisture: boolean;
  lightproof: boolean;
  lent: boolean;
  lentTo: string;
  lentDate: ISODate;
  returnDate: ISODate;
  note: string;
}

export type WishPriority = 'high' | 'mid' | 'low';

export interface Wish extends BaseEntity {
  name: string;
  ip: string;
  character: string;
  type: string;
  pattern: string;
  version: string;
  official: 'official' | 'doujin';
  targetPrice: number;
  currentPrice: number;
  priority: WishPriority;
  status: string;
  channel: string;
  remind: boolean;
  budget: number;
  note: string;
}

// ============ 全局 ============
export type ReminderModule = 'game' | 'star' | 'novel' | 'merch' | 'general';
export type ReminderType =
  | 'gacha_end'
  | 'event_end'
  | 'birthday'
  | 'comeback'
  | 'ticket'
  | 'concert'
  | 'vote_end'
  | 'novel_update'
  | 'novel_end'
  | 'book_publish'
  | 'merch_deposit'
  | 'merch_balance'
  | 'merch_ship'
  | 'merch_arrive'
  | 'sale_end'
  | 'reprint'
  | 'group_end'
  | 'budget'
  | 'anniversary';

export interface Reminder extends BaseEntity {
  title: string;
  module: ReminderModule;
  targetId: ID | null;
  type: ReminderType;
  datetime: ISODate;
  repeat: string;
  advance: number; // 提前提醒分钟数
  priority: string;
  status: 'pending' | 'done' | 'expired';
  note: string;
}

export interface Tag extends BaseEntity {
  name: string;
  module: string;
  color: string;
}

// ============ 游戏账号 ============
export interface GameAccount extends BaseEntity {
  gameId: ID;
  name: string; // 账号昵称/备注
  server: string; // 区服
  uid: string; // UID
  role: string; // 角色名
  note: string;
}

// 游戏氪金记录（充值/消费）
export interface GameTopup extends BaseEntity {
  gameId: ID;
  date: ISODate;
  amount: number; // 金额（元）
  currency: string; // 货币
  channel: string; // 渠道：App Store / 官网 / 支付宝 ...
  image?: string; // 充值截图
  note: string;
}

// 游戏衣橱（时装/皮肤/装备收集）
export interface Wardrobe extends BaseEntity {
  gameId: ID;
  name: string;
  kind: string; // 类型：时装/皮肤/装备/家具...
  price?: number; // 价格（自己填写）
  owned: boolean;
  images?: string[];
  note: string;
}

// ============ 小卡 / 专辑图鉴 ============
export type PhotocardKind = 'album' | 'single' | 'event' | 'preorder' | 'goods' | 'other';

export interface Photocard extends BaseEntity {
  starId: ID;
  album: string; // 专辑/批次名
  name: string; // 卡名
  kind: PhotocardKind;
  rarity: string; // 可选，追星小卡可不填稀有度
  total: number; // 该卡总拥有数（含重复）
  owned: number; // 不同款拥有数
  dup: number; // 重复张数
  photo?: string; // 图片 dataURL
  note: string;
}

// ============ 版本历史 ============
export type HistoryAction = 'create' | 'update' | 'delete';

export interface HistoryEntry extends BaseEntity {
  table: string; // 实体表名
  recordId: string;
  title: string; // 便于阅读的描述
  action: HistoryAction;
  before: any; // 修改前快照
  after: any; // 修改后快照
}

