/**
 * Feature × role access matrix (User Management).
 * Page rows are generated from feature-registry.json so every route is listed.
 * Action rows are extra capabilities (not sidebar pages).
 */
import registryJson from './feature-registry.json';

export const ACCESS_MATRIX_ROLES = [
  'superadmin',
  'admin',
  'site_admin',
  'supervisor',
  'operator',
  'maintenance',
  'quality',
];

function rolesMapFromAllowed(allowed, roleSlugs = ACCESS_MATRIX_ROLES) {
  const set = new Set(allowed || []);
  const out = {};
  for (const role of roleSlugs) {
    out[role] = set.has(role);
  }
  if (set.has('admin') && roleSlugs.includes('site_admin') && !set.has('site_admin')) out.site_admin = true;
  return out;
}

const CAPABILITY_ROWS = [
  {
    id: 'capability.approve_model_change',
    feature: 'Approve Model Change',
    group: 'Actions',
    kind: 'action',
    roles: rolesMapFromAllowed(['superadmin', 'admin', 'site_admin', 'supervisor']),
  },
  {
    id: 'capability.raise_breakdown',
    feature: 'Raise Breakdown Ticket',
    group: 'Actions',
    kind: 'action',
    roles: rolesMapFromAllowed(['superadmin', 'admin', 'site_admin', 'supervisor', 'operator']),
  },
  {
    id: 'capability.ack_breakdown',
    feature: 'Acknowledge Breakdown',
    group: 'Actions',
    kind: 'action',
    roles: rolesMapFromAllowed(['superadmin', 'admin', 'site_admin', 'maintenance']),
  },
  {
    id: 'capability.resolve_breakdown',
    feature: 'Resolve Breakdown',
    group: 'Actions',
    kind: 'action',
    roles: rolesMapFromAllowed(['superadmin', 'admin', 'site_admin', 'maintenance']),
  },
];

export function normalizeAccessMatrixFromApi(apiRows, roleSlugs = ACCESS_MATRIX_ROLES) {
  if (!Array.isArray(apiRows) || apiRows.length === 0) {
    return [...pageRowsFromRegistry(roleSlugs), ...CAPABILITY_ROWS.map((r) => ({
      ...r,
      roles: rolesMapFromAllowed(Object.keys(r.roles).filter((k) => r.roles[k]), roleSlugs),
    }))];
  }
  return apiRows.map((row) => ({
    id: row.id,
    feature: row.label || row.feature,
    registryId: row.registryId,
    group: row.group || (row.kind === 'action' ? 'Actions' : 'Pages'),
    kind: row.kind || (String(row.id || '').startsWith('capability.') ? 'action' : 'page'),
    roles: {
      ...rolesMapFromAllowed([], roleSlugs),
      ...(row.defaultRoles || row.roles || {}),
    },
  }));
}

function pageRowsFromRegistry(roleSlugs = ACCESS_MATRIX_ROLES) {
  const rows = [];
  for (const item of registryJson.standalone || []) {
    rows.push({
      id: item.id,
      feature: item.label || item.id,
      registryId: item.id,
      group: 'Pages',
      kind: 'page',
      roles: rolesMapFromAllowed(item.roles || roleSlugs, roleSlugs),
    });
  }
  for (const group of registryJson.groups || []) {
    const groupLabel = group.label || group.id || 'Pages';
    for (const item of group.items || []) {
      const allowed = item.roles || group.roles || [];
      rows.push({
        id: item.id,
        feature: item.label || item.id,
        registryId: item.id,
        group: groupLabel,
        kind: 'page',
        roles: rolesMapFromAllowed(allowed, roleSlugs),
      });
    }
  }
  return rows;
}

export function getAccessMatrixRoleDefaults(roleSlugs = ACCESS_MATRIX_ROLES) {
  const rows = [...pageRowsFromRegistry(roleSlugs), ...CAPABILITY_ROWS.map((row) => ({
    ...row,
    roles: rolesMapFromAllowed(
      Object.entries(row.roles || {}).filter(([, v]) => v).map(([k]) => k),
      roleSlugs,
    ),
  }))];
  const out = {};
  for (const row of rows) {
    out[row.id] = { ...row.roles };
    if (row.registryId && row.registryId !== row.id) {
      out[row.registryId] = { ...row.roles };
    }
  }
  return out;
}

/** Treat Super Admin and Site Admin as Admin wherever Admin is allowed. */
export function hasRole(userRole, ...allowed) {
  if (!userRole) return false;
  const set = new Set(allowed);
  if (set.has('admin')) {
    set.add('superadmin');
    set.add('site_admin');
  }
  return set.has(userRole);
}

/** @type {{ id: string, feature: string, registryId?: string, group?: string, kind?: string, roles: Record<string, boolean> }[]} */
export const ACCESS_MATRIX = [...pageRowsFromRegistry(), ...CAPABILITY_ROWS];
