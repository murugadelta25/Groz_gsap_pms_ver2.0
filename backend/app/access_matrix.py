"""Default feature × role access matrix (pages from feature-registry.json + action rows)."""
from __future__ import annotations

from typing import Any

from .feature_registry import registry_groups, registry_standalone

TOGGLEABLE_ROLES = [
    "superadmin",
    "admin",
    "site_admin",
    "supervisor",
    "operator",
    "maintenance",
    "quality",
]

# Non-page capabilities (buttons / API actions), still editable in User Management.
CAPABILITY_ROWS: list[dict[str, Any]] = [
    {
        "id": "capability.approve_model_change",
        "label": "Approve Model Change",
        "group": "Actions",
        "roles": {"superadmin": True, "admin": True, "site_admin": True, "supervisor": True, "operator": False, "maintenance": False, "quality": False},
    },
    {
        "id": "capability.raise_breakdown",
        "label": "Raise Breakdown Ticket",
        "group": "Actions",
        "roles": {"superadmin": True, "admin": True, "site_admin": True, "supervisor": True, "operator": True, "maintenance": False, "quality": False},
    },
    {
        "id": "capability.ack_breakdown",
        "label": "Acknowledge Breakdown",
        "group": "Actions",
        "roles": {"superadmin": True, "admin": True, "site_admin": True, "supervisor": False, "operator": False, "maintenance": True, "quality": False},
    },
    {
        "id": "capability.resolve_breakdown",
        "label": "Resolve Breakdown",
        "group": "Actions",
        "roles": {"superadmin": True, "admin": True, "site_admin": True, "supervisor": False, "operator": False, "maintenance": True, "quality": False},
    },
]


def roles_map_from_allowed(allowed: set[str] | list[str] | None) -> dict[str, bool]:
    """Build a full role→bool map. Site Admin follows Admin unless listed explicitly."""
    allowed_set = set(allowed or [])
    out = {role: (role in allowed_set) for role in TOGGLEABLE_ROLES}
    if "admin" in allowed_set and "site_admin" not in allowed_set:
        out["site_admin"] = True
    return out


def _complete_roles(partial: dict[str, bool] | None) -> dict[str, bool]:
    src = partial or {}
    out = {role: bool(src.get(role, False)) for role in TOGGLEABLE_ROLES}
    if src.get("admin") and "site_admin" not in src:
        out["site_admin"] = True
    return out


def _page_rows_from_registry() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in registry_standalone():
        allowed = item.get("roles")
        rows.append({
            "id": item["id"],
            "label": item.get("label") or item["id"],
            "registry_id": item["id"],
            "group": "Pages",
            "kind": "page",
            "roles": roles_map_from_allowed(allowed if allowed is not None else TOGGLEABLE_ROLES),
        })
    for group in registry_groups():
        group_label = group.get("label") or group.get("id") or "Pages"
        group_roles = group.get("roles") or []
        for item in group.get("items") or []:
            allowed = item.get("roles")
            if allowed is None:
                allowed = group_roles
            rows.append({
                "id": item["id"],
                "label": item.get("label") or item["id"],
                "registry_id": item["id"],
                "group": group_label,
                "kind": "page",
                "roles": roles_map_from_allowed(allowed),
            })
    return rows


def access_matrix_rows() -> list[dict[str, Any]]:
    rows = _page_rows_from_registry()
    for cap in CAPABILITY_ROWS:
        rows.append({
            "id": cap["id"],
            "label": cap["label"],
            "registry_id": None,
            "group": cap.get("group") or "Actions",
            "kind": "action",
            "roles": _complete_roles(cap.get("roles")),
        })
    return rows


def access_matrix_role_defaults() -> dict[str, dict[str, bool]]:
    out: dict[str, dict[str, bool]] = {}
    for row in access_matrix_rows():
        roles = _complete_roles(row.get("roles"))
        out[row["id"]] = dict(roles)
        rid = row.get("registry_id")
        if rid and rid != row["id"]:
            out[rid] = dict(roles)
    return out


def access_matrix_payload() -> list[dict[str, Any]]:
    return [
        {
            "id": row["id"],
            "label": row["label"],
            "registryId": row.get("registry_id"),
            "group": row.get("group") or "Pages",
            "kind": row.get("kind") or "page",
            "defaultRoles": _complete_roles(row.get("roles")),
        }
        for row in access_matrix_rows()
    ]
