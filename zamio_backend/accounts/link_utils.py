"""Shared helpers for building production-safe absolute URLs."""

from __future__ import annotations

from typing import Any, Mapping, Optional
from urllib.parse import urlencode, urlsplit, urlunsplit


def build_absolute_url(
    base_url: Optional[str],
    path: str,
    query_params: Optional[Mapping[str, Any]] = None,
    default_base_url: str = 'http://localhost:8000',
) -> str:
    """Build a fully-qualified URL from a base URL, path, and optional query params."""

    value = (base_url or default_base_url).strip()
    if '://' not in value:
        value = f'http://{value}'

    parsed = urlsplit(value)
    base_path = parsed.path.rstrip('/')
    relative_path = '/' + path.lstrip('/')
    full_path = f'{base_path}{relative_path}' if base_path else relative_path
    query_string = urlencode(query_params or {}, doseq=True)

    return urlunsplit((parsed.scheme, parsed.netloc, full_path, query_string, ''))