import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Menu } from "../models/menu.model";
import { connectDB } from "../config/db.config";
import { MenuService } from "../services/menu.service";
import { resolveIconNodes } from "../utils/icon.helper";
import logger from "../utils/logger";

function withIconNodes(items: any[]) {
  return items.map((item) => {
    const nodes = resolveIconNodes(item.icon);
    return {
      ...item,
      iconType: nodes ? "preset" : "none",
      iconNodes: nodes || null,
    };
  });
}

export async function seedInitialMenus(): Promise<void> {
  logger.info("Checking initial menu data...");

  // Self-healing backfill: Update any existing menu items missing iconNodes
  const menusWithoutNodes = await Menu.find({
    $or: [{ iconNodes: null }, { iconNodes: { $exists: false } }],
    icon: { $exists: true, $ne: "" },
  });

  if (menusWithoutNodes.length > 0) {
    logger.info(`Backfilling iconNodes for ${menusWithoutNodes.length} existing menu items...`);
    for (const m of menusWithoutNodes) {
      const nodes = resolveIconNodes(m.icon);
      if (nodes) {
        await Menu.updateOne(
          { _id: m._id },
          { $set: { iconNodes: nodes, iconType: "preset" } }
        );
      }
    }
    await MenuService.invalidateCache();
    logger.info("Backfill complete and cache invalidated.");
  }

  const count = await Menu.countDocuments();
  if (count > 0) {
    logger.info(`Database already has ${count} menu items, skipping initial seed.`);
    return;
  }

  logger.info("Database is empty. Seeding default menus for all 4 roles with SVG AST nodes...");

  // 1. Client Menus
  await Menu.create(
    withIconNodes([
      {
        title: "Tổng quan",
        url: "/client-dashboard",
        icon: "LayoutDashboard",
        roles: ["client"],
        order: 1,
        section: "main",
        isActive: true,
      },
      {
        title: "Job posts",
        url: "/client-dashboard/jobs",
        icon: "Briefcase",
        roles: ["client"],
        order: 2,
        section: "main",
        isActive: true,
      },
      {
        title: "Hồ sơ ứng tuyển",
        url: "/client-dashboard/applications",
        icon: "FileText",
        roles: ["client"],
        order: 3,
        section: "main",
        isActive: true,
      },
      {
        title: "Hợp đồng & Escrow",
        url: "/client-dashboard/contracts",
        icon: "Handshake",
        roles: ["client"],
        order: 4,
        section: "main",
        isActive: true,
      },
      {
        title: "Tin nhắn trực tiếp",
        url: "/messages",
        icon: "MessageSquare",
        roles: ["client", "freelancer", "agency"],
        order: 5,
        section: "main",
        isActive: true,
      },
      {
        title: "Ví ký quỹ & Hoá đơn",
        url: "/client-dashboard/billing",
        icon: "Wallet",
        roles: ["client"],
        order: 1,
        section: "secondary",
        isActive: true,
      },
    ])
  );

  // 2. Freelancer Menus
  await Menu.create(
    withIconNodes([
      {
        title: "Tổng quan",
        url: "/freelancer-dashboard",
        icon: "LayoutDashboard",
        roles: ["freelancer"],
        order: 1,
        section: "main",
        isActive: true,
      },
      {
        title: "Tìm việc",
        url: "/freelancer-dashboard/find-work",
        icon: "Search",
        roles: ["freelancer"],
        order: 2,
        section: "main",
        isActive: true,
      },
      {
        title: "Hợp đồng",
        url: "/freelancer-dashboard/contracts",
        icon: "FileText",
        roles: ["freelancer"],
        order: 3,
        section: "main",
        isActive: true,
      },
      {
        title: "Hồ sơ năng lực",
        url: "/freelancer-dashboard/portfolio",
        icon: "Briefcase",
        roles: ["freelancer"],
        order: 4,
        section: "main",
        isActive: true,
      },
    ])
  );

  // 3. Agency Menus
  await Menu.create(
    withIconNodes([
      {
        title: "Tổng quan",
        url: "/agency-dashboard",
        icon: "LayoutDashboard",
        roles: ["agency"],
        order: 1,
        section: "main",
        isActive: true,
      },
      {
        title: "Tìm việc",
        url: "/agency-dashboard/find-work",
        icon: "Search",
        roles: ["agency"],
        order: 2,
        section: "main",
        isActive: true,
      },
      {
        title: "Quản lý nhân sự",
        url: "/agency-dashboard/members",
        icon: "Users",
        roles: ["agency"],
        order: 3,
        section: "main",
        isActive: true,
      },
      {
        title: "Hợp đồng",
        url: "/agency-dashboard/contracts",
        icon: "FileText",
        roles: ["agency"],
        order: 4,
        section: "main",
        isActive: true,
      },
    ])
  );

  // 4. Admin Menus
  await Menu.create(
    withIconNodes([
      {
        title: "Tổng quan hệ thống",
        url: "/admin-dashboard",
        icon: "LayoutDashboard",
        roles: ["admin"],
        order: 1,
        section: "main",
        isActive: true,
      },
      {
        title: "Quản lý người dùng",
        url: "/admin-dashboard/users",
        icon: "Users",
        roles: ["admin"],
        order: 2,
        section: "main",
        isActive: true,
      },
      {
        title: "Kiểm duyệt",
        url: "/admin-dashboard/jobs",
        icon: "Briefcase",
        roles: ["admin"],
        order: 3,
        section: "main",
        isActive: true,
      },
      {
        title: "Tranh chấp",
        url: "/admin-dashboard/disputes",
        icon: "ShieldAlert",
        roles: ["admin"],
        order: 4,
        section: "main",
        isActive: true,
      },
      {
        title: "Phân quyền",
        url: "/admin-dashboard/roles",
        icon: "Users",
        roles: ["admin"],
        order: 1,
        section: "secondary",
        isActive: true,
      },
      {
        title: "Quản lý Menu",
        url: "/admin-dashboard/menus",
        icon: "Menu",
        roles: ["admin"],
        order: 2,
        section: "secondary",
        isActive: true,
      },
    ])
  );

  // 5. Nested Group Example (Parent: Settings with 4 sub-items)
  const settingsNodes = resolveIconNodes("Settings2");
  const settingsParent = await Menu.create({
    title: "Cài đặt & Thiết lập",
    url: "#",
    icon: "Settings2",
    iconType: "preset",
    iconNodes: settingsNodes,
    roles: ["client", "freelancer", "agency", "admin"],
    order: 10,
    section: "secondary",
    isActive: true,
  });

  await Menu.create(
    withIconNodes([
      {
        title: "General",
        url: "/settings/general",
        parentId: settingsParent._id,
        roles: ["client", "freelancer", "agency", "admin"],
        order: 1,
        section: "secondary",
        isActive: true,
      },
      {
        title: "Team",
        url: "/settings/team",
        parentId: settingsParent._id,
        roles: ["client", "agency", "admin"],
        order: 2,
        section: "secondary",
        isActive: true,
      },
      {
        title: "Billing",
        url: "/settings/billing",
        parentId: settingsParent._id,
        roles: ["client", "admin"],
        order: 3,
        section: "secondary",
        isActive: true,
      },
      {
        title: "Limits",
        url: "/settings/limits",
        parentId: settingsParent._id,
        roles: ["client", "agency", "admin"],
        order: 4,
        section: "secondary",
        isActive: true,
      },
    ])
  );

  // 6. Help center common item
  const helpNodes = resolveIconNodes("HelpCircle");
  await Menu.create({
    title: "Trung tâm trợ giúp",
    url: "/help",
    icon: "HelpCircle",
    iconType: "preset",
    iconNodes: helpNodes,
    roles: ["client", "freelancer", "agency", "admin"],
    order: 20,
    section: "secondary",
    isActive: true,
  });

  await MenuService.invalidateCache();
  logger.info("Successfully seeded all initial menus with Headless SVG AST!");
}

// Standalone execution support
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      if (process.argv.includes("--force")) {
        logger.info("Force flag detected. Deleting existing menus...");
        await Menu.deleteMany({});
      }
      await seedInitialMenus();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      logger.error("Error running menu seeder", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  })();
}
