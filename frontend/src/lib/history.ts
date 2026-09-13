// 版本历史：记录实体增删改，支持回滚
import { db, uid } from './db';

// 在“修改/删除”前调用，记录旧快照；创建时 before 为 null
export async function logHistory(
  table: string,
  recordId: string,
  title: string,
  action: 'create' | 'update' | 'delete',
  before: any,
  after: any,
) {
  try {
    await db.history.add({
      id: uid(),
      table,
      recordId,
      title,
      action,
      before: before ?? null,
      after: after ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    });
  } catch {
    // 历史记录失败不应影响主流程
  }
}

// 回滚到某个历史记录的 before 快照
export async function rollbackTo(entry: { table: string; recordId: string; before: any }) {
  const table = (db as any)[entry.table];
  if (!table) throw new Error('未知表');
  if (entry.before == null) {
    // 创建操作的回滚 = 删除该记录
    await table.delete(entry.recordId);
    await logHistory(entry.table, entry.recordId, '回滚(删除新建)', 'delete', null, null);
    return;
  }
  const snap = { ...entry.before, updatedAt: Date.now() };
  await table.put(snap);
  await logHistory(entry.table, entry.recordId, '回滚修改', 'update', null, snap);
}
