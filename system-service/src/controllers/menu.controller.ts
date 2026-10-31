import { Response, NextFunction } from "express";
import { MenuService } from "../services/menu.service";
import { AuthenticatedSystemRequest } from "../middlewares/require-role.middleware";

export class MenuController {
  /**
   * Get dynamic menu tree for currently authenticated user/role
   */
  public static async getMyMenu(
    req: AuthenticatedSystemRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const role =
        req.userRole ||
        (req.query.role as string) ||
        "client";

      const tree = await MenuService.getMenuForRole(role);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: `Dynamic menu retrieved for role '${role}'`,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get all menus (tree format or flat format)
   */
  public static async getAllMenus(
    req: AuthenticatedSystemRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const asTree = req.query.tree === "true";
      const menus = await MenuService.getAllMenus(asTree);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: menus,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get single menu by ID
   */
  public static async getMenuById(
    req: AuthenticatedSystemRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const menu = await MenuService.getMenuById(req.params.id);
      if (!menu) {
        res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Menu item not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: menu,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Create a new menu item
   */
  public static async createMenu(
    req: AuthenticatedSystemRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { title, url, icon, parentId, roles, order, isActive, section, badge } =
        req.body;

      if (!title || !url) {
        res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Title and URL are required",
        });
        return;
      }

      const menu = await MenuService.createMenu({
        title,
        url,
        icon,
        parentId: parentId || null,
        roles: Array.isArray(roles) && roles.length > 0 ? roles : ["client"],
        order: Number(order) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        section: section === "secondary" ? "secondary" : "main",
        badge: badge || "",
      });

      res.status(201).json({
        success: true,
        statusCode: 201,
        message: "Menu item created successfully",
        data: menu,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Update an existing menu item
   */
  public static async updateMenu(
    req: AuthenticatedSystemRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updated = await MenuService.updateMenu(req.params.id, req.body);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Menu item updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Delete a menu item
   */
  public static async deleteMenu(
    req: AuthenticatedSystemRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await MenuService.deleteMenu(req.params.id);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Menu item deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Reorder multiple menu items
   */
  public static async reorderMenus(
    req: AuthenticatedSystemRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Items array is required for reordering",
        });
        return;
      }

      const result = await MenuService.reorderMenus(items);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Menu orders updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Manually invalidate menu Redis cache
   */
  public static async clearCache(
    _req: AuthenticatedSystemRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await MenuService.invalidateCache();

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Menu Redis cache purged successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
