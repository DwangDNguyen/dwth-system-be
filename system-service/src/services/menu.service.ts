import mongoose from "mongoose";
import { Menu, IMenu, RoleType } from "../models/menu.model";
import { redisClient } from "../config/redis.config";
import logger from "../utils/logger";

export interface MenuItemTreeNode {
  id: string;
  title: string;
  url: string;
  icon?: string;
  order: number;
  section: "main" | "secondary";
  badge?: string;
  items?: MenuItemTreeNode[];
}

export interface UserMenuResponse {
  main: MenuItemTreeNode[];
  secondary?: {
    label: string;
    items: MenuItemTreeNode[];
  };
}

export class MenuService {
  private static readonly CACHE_PREFIX = "cache:menu:role:";
  private static readonly CACHE_TTL_SECONDS = 86400; // 24 hours

  /**
   * Invalidate Redis cache for all roles
   */
  public static async invalidateCache(): Promise<void> {
    try {
      if (redisClient.status === "ready") {
        const keys = await redisClient.keys(`${this.CACHE_PREFIX}*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
          logger.info(`Invalidated ${keys.length} menu cache keys`);
        }
      }
    } catch (err) {
      logger.warn("Failed to invalidate Redis menu cache", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Get dynamic menu tree for a specific role
   */
  public static async getMenuForRole(role: string): Promise<UserMenuResponse> {
    const roleLower = (role || "").toLowerCase();
    const roleMap: Record<string, RoleType> = {
      user: "client",
      worker: "freelancer",
      client: "client",
      freelancer: "freelancer",
      agency: "agency",
      admin: "admin",
    };
    const normalizedRole = roleMap[roleLower] || "client";
    const cacheKey = `${this.CACHE_PREFIX}${normalizedRole}`;

    // 1. Try fetching from Redis Cache
    try {
      if (redisClient.status === "ready") {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      logger.warn("Redis get error, falling back to database", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 2. Query Database for active menus matching the role
    const flatMenus = await Menu.find({
      roles: normalizedRole,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    // 3. Build Nested Tree with O(N) Complexity
    const tree = this.buildTree(flatMenus, normalizedRole);

    // 4. Save to Redis Cache in background
    try {
      if (redisClient.status === "ready") {
        await redisClient.set(
          cacheKey,
          JSON.stringify(tree),
          "EX",
          this.CACHE_TTL_SECONDS
        );
      }
    } catch (err) {
      logger.warn("Failed to save menu tree to Redis", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return tree;
  }

  /**
   * O(N) Tree Builder using Hash Map
   */
  private static buildTree(flatMenus: any[], role: RoleType): UserMenuResponse {
    const map = new Map<string, MenuItemTreeNode>();
    const mainList: MenuItemTreeNode[] = [];
    const secondaryList: MenuItemTreeNode[] = [];

    // Pass 1: Initialize nodes in map
    for (const item of flatMenus) {
      const id = item._id.toString();
      map.set(id, {
        id,
        title: item.title,
        url: item.url,
        icon: item.icon || undefined,
        order: item.order,
        section: item.section,
        badge: item.badge || undefined,
        items: [],
      });
    }

    // Pass 2: Connect children to parent, or push to root lists
    for (const item of flatMenus) {
      const id = item._id.toString();
      const node = map.get(id)!;

      if (item.parentId && map.has(item.parentId.toString())) {
        const parentNode = map.get(item.parentId.toString())!;
        if (!parentNode.items) {
          parentNode.items = [];
        }
        parentNode.items.push(node);
      } else {
        // Root item
        if (item.section === "secondary") {
          secondaryList.push(node);
        } else {
          mainList.push(node);
        }
      }
    }

    // Pass 3: Clean up empty items array so JSON stays compact
    const pruneEmptyItems = (nodes: MenuItemTreeNode[]) => {
      for (const node of nodes) {
        if (node.items && node.items.length === 0) {
          delete node.items;
        } else if (node.items) {
          pruneEmptyItems(node.items);
        }
      }
    };

    pruneEmptyItems(mainList);
    pruneEmptyItems(secondaryList);

    // Section secondary label by role
    const secondaryLabels: Record<string, string> = {
      client: "TÀI CHÍNH & THIẾT LẬP",
      freelancer: "THIẾT LẬP",
      agency: "THIẾT LẬP",
      admin: "CÀI ĐẶT HỆ THỐNG",
    };

    return {
      main: mainList,
      secondary:
        secondaryList.length > 0
          ? {
              label: secondaryLabels[role] || "THIẾT LẬP",
              items: secondaryList,
            }
          : undefined,
    };
  }

  /**
   * Admin: Get all menus (tree structure or flat list)
   */
  public static async getAllMenus(asTree = false) {
    if (!asTree) {
      return Menu.find()
        .populate("parentId", "title url")
        .sort({ section: 1, order: 1 })
        .lean();
    }

    const flatList = await Menu.find()
      .populate("parentId", "title url")
      .sort({ order: 1 })
      .lean();

    const map = new Map<string, any>();
    const roots: any[] = [];

    flatList.forEach((m) => {
      map.set(m._id.toString(), { ...m, children: [] });
    });

    flatList.forEach((m) => {
      const node = map.get(m._id.toString());
      if (m.parentId) {
        const parentId =
          typeof m.parentId === "object" && "_id" in m.parentId
            ? String((m.parentId as any)._id)
            : String(m.parentId);
        if (map.has(parentId)) {
          map.get(parentId).children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Admin: Get single menu by id
   */
  public static async getMenuById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Menu ID format");
    }
    return Menu.findById(id).populate("parentId", "title url").lean();
  }

  /**
   * Admin: Create a new menu item
   */
  public static async createMenu(data: {
    title: string;
    url: string;
    icon?: string;
    parentId?: string | null;
    roles: RoleType[];
    order?: number;
    isActive?: boolean;
    section?: "main" | "secondary";
    badge?: string;
  }) {
    if (data.parentId) {
      if (!mongoose.Types.ObjectId.isValid(data.parentId)) {
        throw new Error("Invalid parentId format");
      }
      const parent = await Menu.findById(data.parentId);
      if (!parent) {
        throw new Error("Parent menu item does not exist");
      }
    }

    const newMenu = await Menu.create({
      ...data,
      parentId: data.parentId ? new mongoose.Types.ObjectId(data.parentId) : null,
    });

    await this.invalidateCache();
    return newMenu;
  }

  /**
   * Admin: Update menu item
   */
  public static async updateMenu(
    id: string,
    data: Partial<{
      title: string;
      url: string;
      icon: string;
      parentId: string | null;
      roles: RoleType[];
      order: number;
      isActive: boolean;
      section: "main" | "secondary";
      badge: string;
    }>
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Menu ID format");
    }

    // Prevent cyclic parent reference
    if (data.parentId) {
      if (data.parentId === id) {
        throw new Error("A menu item cannot be its own parent");
      }
      if (!mongoose.Types.ObjectId.isValid(data.parentId)) {
        throw new Error("Invalid parentId format");
      }
      const parent = await Menu.findById(data.parentId);
      if (!parent) {
        throw new Error("Parent menu item does not exist");
      }
    }

    const updatePayload: any = { ...data };
    if (data.parentId !== undefined) {
      updatePayload.parentId = data.parentId
        ? new mongoose.Types.ObjectId(data.parentId)
        : null;
    }

    const updated = await Menu.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      throw new Error("Menu item not found");
    }

    await this.invalidateCache();
    return updated;
  }

  /**
   * Admin: Delete menu item
   */
  public static async deleteMenu(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Menu ID format");
    }

    // Check if item has children
    const childCount = await Menu.countDocuments({ parentId: id });
    if (childCount > 0) {
      throw new Error(
        `Cannot delete this menu because it has ${childCount} submenu item(s). Please delete or reassign them first.`
      );
    }

    const deleted = await Menu.findByIdAndDelete(id);
    if (!deleted) {
      throw new Error("Menu item not found");
    }

    await this.invalidateCache();
    return deleted;
  }

  /**
   * Admin: Reorder multiple menu items in batch
   */
  public static async reorderMenus(
    items: { id: string; order: number; parentId?: string | null }[]
  ) {
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: {
          $set: {
            order: item.order,
            ...(item.parentId !== undefined
              ? {
                  parentId: item.parentId
                    ? new mongoose.Types.ObjectId(item.parentId)
                    : null,
                }
              : {}),
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await Menu.bulkWrite(bulkOps);
      await this.invalidateCache();
    }

    return { success: true, count: bulkOps.length };
  }
}
