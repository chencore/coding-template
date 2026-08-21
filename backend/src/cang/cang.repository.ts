import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../database/database";

export interface CangItem {
  id: number;
  userId: number;
  text: string;
  sourceType: string;
  sourceLabel: string | null;
  createdAt: string;
}

export interface CangThemeGroup {
  name: string;
  count: number;
  items: CangItem[];
}

interface ItemRow {
  id: string;
  user_id: string;
  text: string;
  source_type: string;
  source_label: string | null;
  created_at: Date;
}

function toItem(row: ItemRow): CangItem {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    text: row.text,
    sourceType: row.source_type,
    sourceLabel: row.source_label,
    createdAt: row.created_at.toISOString(),
  };
}

const ITEM_COLS =
  "id, user_id, text, source_type, source_label, created_at";

/**
 * 藏（个人知识库）的数据访问。
 * 条目 / 主题 / 关联三表的写入与联查；主题为 0 条时顺手删主题。
 */
@Injectable()
export class CangRepository {
  constructor(@Inject(Database) private readonly db: Database) {}

  async insertItem(
    userId: number,
    item: { text: string; sourceType: string; sourceLabel: string | null },
  ): Promise<CangItem> {
    const { rows } = await this.db.pool.query<ItemRow>(
      `INSERT INTO cang_items(user_id, text, source_type, source_label)
       VALUES ($1, $2, $3, $4)
       RETURNING ${ITEM_COLS}`,
      [userId, item.text, item.sourceType, item.sourceLabel],
    );
    return toItem(rows[0]);
  }

  /** 该用户已有主题名（按创建先后）——打标时注入 LLM 优先复用 */
  async listThemeNames(userId: number): Promise<string[]> {
    const { rows } = await this.db.pool.query<{ name: string }>(
      `SELECT name FROM cang_themes WHERE user_id = $1 ORDER BY id`,
      [userId],
    );
    return rows.map((r) => r.name);
  }

  /** 按 (user_id, name) 幂等取主题 id——已存在直接返回，不新增行 */
  async upsertTheme(userId: number, name: string): Promise<number> {
    const { rows } = await this.db.pool.query<{ id: string }>(
      `INSERT INTO cang_themes(user_id, name) VALUES ($1, $2)
       ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userId, name],
    );
    return Number(rows[0].id);
  }

  async linkItemThemes(itemId: number, themeIds: number[]): Promise<void> {
    for (const themeId of themeIds) {
      await this.db.pool.query(
        `INSERT INTO cang_item_themes(item_id, theme_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [itemId, themeId],
      );
    }
  }

  /** 主题分组 + 未归组：主题按条数降序（同数按创建先后），条目按时间倒序 */
  async listMap(
    userId: number,
  ): Promise<{ themes: CangThemeGroup[]; ungrouped: CangItem[] }> {
    const { rows } = await this.db.pool.query<
      ItemRow & { theme_id: string | null; theme_name: string | null }
    >(
      `SELECT i.${ITEM_COLS.replaceAll(", ", ", i.")},
              t.id AS theme_id, t.name AS theme_name
       FROM cang_items i
       LEFT JOIN cang_item_themes it ON it.item_id = i.id
       LEFT JOIN cang_themes t ON t.id = it.theme_id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC, i.id DESC`,
      [userId],
    );

    const themeById = new Map<number, CangThemeGroup>();
    const themeFirstSeen: number[] = [];
    const ungrouped: CangItem[] = [];
    const seenUngrouped = new Set<number>();

    for (const row of rows) {
      if (row.theme_id === null) {
        if (!seenUngrouped.has(Number(row.id))) {
          seenUngrouped.add(Number(row.id));
          ungrouped.push(toItem(row));
        }
        continue;
      }
      const themeId = Number(row.theme_id);
      let group = themeById.get(themeId);
      if (!group) {
        group = { name: row.theme_name!, count: 0, items: [] };
        themeById.set(themeId, group);
        themeFirstSeen.push(themeId);
      }
      group.items.push(toItem(row));
      group.count += 1;
    }

    const themes = themeFirstSeen
      .map((id) => themeById.get(id)!)
      .sort((a, b) => b.count - a.count);
    return { themes, ungrouped };
  }

  /** 删本人条目（关联级联）；返回是否删到。删后为 0 条的主题顺手删除 */
  async deleteItem(userId: number, id: number): Promise<boolean> {
    const { rows: themeRows } = await this.db.pool.query<{ theme_id: string }>(
      `SELECT theme_id FROM cang_item_themes WHERE item_id = $1`,
      [id],
    );
    const { rowCount } = await this.db.pool.query(
      `DELETE FROM cang_items WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    if (!rowCount) return false;
    for (const { theme_id } of themeRows) {
      await this.db.pool.query(
        `DELETE FROM cang_themes t WHERE t.id = $1
         AND NOT EXISTS (SELECT 1 FROM cang_item_themes WHERE theme_id = t.id)`,
        [Number(theme_id)],
      );
    }
    return true;
  }
}
