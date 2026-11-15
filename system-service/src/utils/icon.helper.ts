import * as lucide from "lucide";

export type IconAstNode = [string, Record<string, string | number>];

/**
 * Convert string from kebab-case, snake_case or camelCase to PascalCase
 */
export function toPascalCase(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .replace(/[-_ ]+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
}

/**
 * Resolve icon name to Lucide AST nodes.
 * E.g. "LayoutDashboard" or "layout-dashboard" -> Array of [tag, attributes]
 */
export function resolveIconNodes(iconName?: string): IconAstNode[] | null {
  if (!iconName) return null;

  const pascalName = toPascalCase(iconName);
  const nodes = (lucide as Record<string, any>)[pascalName];

  if (Array.isArray(nodes) && nodes.length > 0) {
    return nodes as IconAstNode[];
  }

  return null;
}

/**
 * Search preset Lucide icons by keyword for Admin Icon Picker (Phase 4)
 */
export function searchPresetIcons(
  keyword = "",
  page = 1,
  limit = 60
): { items: { name: string; nodes: IconAstNode[] }[]; total: number; page: number; totalPages: number } {
  const query = keyword.trim().toLowerCase();
  const allIconKeys = Object.keys(lucide).filter((key) => {
    // Only pick valid icon node arrays (avoid helper functions or internal constants)
    return Array.isArray((lucide as Record<string, any>)[key]);
  });

  const filteredKeys = query
    ? allIconKeys.filter((key) => key.toLowerCase().includes(query))
    : allIconKeys;

  const total = filteredKeys.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedKeys = filteredKeys.slice(startIndex, startIndex + limit);

  const items = paginatedKeys.map((name) => ({
    name,
    nodes: (lucide as Record<string, any>)[name] as IconAstNode[],
  }));

  return {
    items,
    total,
    page,
    totalPages,
  };
}

