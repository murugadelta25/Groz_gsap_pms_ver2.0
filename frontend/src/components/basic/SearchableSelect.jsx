import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Dropdown + search: closed state looks like a native select;
 * open state shows a filter box and a scrollable option list.
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = '— Select part —',
  searchPlaceholder = 'Type to search…',
  disabled = false,
  style = {},
  t = {},
  getValue = (o) => o.value,
  getLabel = (o) => o.label,
  emptyLabel = 'No matches',
}) {
  const wrapRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((o) => String(getValue(o)) === String(value)) || null,
    [options, value, getValue],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => getLabel(o).toLowerCase().includes(q));
  }, [options, query, getLabel]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const pick = (id) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const border = t.inpBorder || t.border || '#38bdf8';
  const panelBg = t.surface || '#0f2744';
  const textColor = t.text || '#e2e8f0';

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          ...style,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: selected ? textColor : (t.textDim || '#94a3b8'),
          flex: 1,
        }}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <span style={{ fontSize: 10, opacity: 0.8, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && !disabled && (
        <div style={{
          position: 'absolute', zIndex: 50, left: 0, right: 0, top: '100%',
          marginTop: 2,
          background: panelBg,
          border: `1px solid ${border}`,
          borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${t.border || border}` }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const first = filtered[0];
                  if (first) pick(String(getValue(first)));
                }
              }}
              style={{
                ...style,
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick('')}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 10px', border: 'none', cursor: 'pointer',
                fontSize: 12, color: t.textDim || '#94a3b8',
                background: !value ? (t.surface2 || 'rgba(255,255,255,0.08)') : 'transparent',
              }}
            >
              {placeholder}
            </button>
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 12, color: t.textDim || '#94a3b8' }}>
                {emptyLabel}
              </div>
            )}
            {filtered.slice(0, 200).map((o) => {
              const id = String(getValue(o));
              const active = id === String(value);
              return (
                <button
                  key={id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 10px', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: textColor,
                    background: active ? (t.surface2 || 'rgba(56,189,248,0.18)') : 'transparent',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {getLabel(o)}
                </button>
              );
            })}
            {filtered.length > 200 && (
              <div style={{ padding: '6px 10px', fontSize: 11, color: t.textDim || '#94a3b8' }}>
                Showing first 200 — type to narrow
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
