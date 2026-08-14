import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { pageClass } from '../themes/tileHelpers';
import PageHeader from '../components/PageHeader';
import api from '../api/client';

const PAGE_SIZE = 50;

const COLUMNS = [
  { key: 'material', label: 'Material', hint: 'Part No / Article No' },
  { key: 'plant', label: 'Plant', hint: 'Factory code (future Factory Setup link)' },
  { key: 'created_on', label: 'Created On' },
  { key: 'valid_from', label: 'Valid From' },
  { key: 'operation', label: 'Operation', hint: 'Operation number / code' },
  { key: 'work_centre', label: 'Work Centre', hint: 'Machine type' },
  { key: 'op_short_text', label: 'Op. Short Text', hint: 'Operation name' },
  { key: 'setup_time', label: 'Setup Time (mins)', hint: 'SAP setup time (min)' },
  { key: 'machine_time', label: 'Machine Time (mins)', hint: 'Cycle time / process time (min)' },
];

export default function GsapSync() {
  const { theme: t } = useTheme();
  const s = getStyles(t);
  const fileRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [batchId, setBatchId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [page, setPage] = useState(1);

  const flash = (text, isErr = false) => {
    if (isErr) { setErr(text); setMsg(''); }
    else { setMsg(text); setErr(''); }
    setTimeout(() => { setMsg(''); setErr(''); }, 6000);
  };

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/gsap-sync/', {
        params: { search: search.trim() || undefined, limit: 5000 },
      });
      setRows(res.data?.items || []);
      setBatchId(res.data?.upload_batch_id || '');
    } catch (e) {
      setRows([]);
      flash(e.response?.data?.detail || 'Failed to load GSAP data', true);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [search, rows.length]);

  const onUpload = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!/\.(xlsx|xlsm|xls|csv|txt|tsv|html|htm|xml)$/i.test(file.name)) {
      flash('Please upload a SAP GSAP export (.xlsx, .xls, .csv, .txt, or .html)', true);
      return;
    }
    setSelectedName(file.name);
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/api/gsap-sync/upload?replace=true', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      flash(`Imported ${res.data.imported} row(s) from ${file.name}`);
      setBatchId(res.data.batch_id || '');
      await fetchRows();
    } catch (e) {
      flash(e.response?.data?.detail || e.message || 'Upload failed', true);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onClear = () => {
    if (!rows.length) {
      flash('Table is already empty');
      return;
    }
    setRows([]);
    flash('Table view cleared. GSAP data is still in the database — click Refresh to show it again.');
  };

  const distinctMaterials = new Set(rows.map((r) => r.material).filter(Boolean)).size;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);
  const fromRow = rows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const toRow = Math.min(safePage * PAGE_SIZE, rows.length);

  return (
    <div className={pageClass(t)} style={s.page}>
      <PageHeader title="GSAP SYNC" subtitle="Import routing data from SAP GSAP exports for work order planning" onRefresh={fetchRows} />

      <div style={s.card}>
        <h4 style={s.cardTitle}>Upload SAP GSAP export</h4>
        <p style={s.help}>
          Built for SAP ALV / GSAP downloads. From SAP use <b>Spreadsheet</b>, <b>Local file</b>
          (unconverted / tab), <b>HTML</b>, or <b>CSV</b>. The app reads the file contents, not just
          the extension — including SAP <b>.xls</b> files that are actually UTF-16 text or HTML.
          Also accepted: .xlsx, .csv, .txt, .html, .xml.
        </p>
        <p style={{ ...s.help, marginTop: -8 }}>
          Columns are matched flexibly (Material / MATNR, Work Centre / Work Center / ARBPL,
          Op. Short Text / LTXA1, Setup Time / VGW01, Machine Time / VGW02). Extra SAP title,
          page, and cost columns are ignored.
        </p>
        <p style={{ ...s.help, marginTop: -8 }}>
          Mapping: Material → Part No; Work Centre → Machine Type; Operation → Operation Code;
          Op. Short Text → Operation Name; Machine Time → Cycle time (min). Plant → factory code (Factory Setup — next phase).
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file"
            accept=".xlsx,.xlsm,.xls,.csv,.txt,.tsv,.htm,.html,.xml,text/csv,text/html,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => onUpload(e.target.files)} />
          <button style={s.btnPrimary} disabled={uploading}
            onClick={() => fileRef.current?.click()}>
            {uploading ? 'Uploading…' : 'Upload file'}
          </button>
          <button type="button" style={s.btnGhost} disabled={uploading || !rows.length}
            onClick={onClear}>
            Clear table
          </button>
          {selectedName && (
            <span style={{ fontSize: 12, color: t.text, fontWeight: 600 }}>{selectedName}</span>
          )}
          <input style={s.search} placeholder="Search material, work centre, op text…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {msg && <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 600 }}>✓ {msg}</span>}
          {err && <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>✗ {err}</span>}
        </div>
        <div style={s.stats}>
          <Stat label="Rows loaded" value={rows.length} t={t} hint="Total GSAP operation rows in this view" />
          <Stat
            label="Distinct materials"
            value={distinctMaterials}
            t={t}
            hint="Count of unique part numbers (Material). One material can have several operations, so this is smaller than Rows loaded."
          />
          {batchId && <Stat label="Upload Batch ID" value={batchId.slice(0, 8)} t={t} />}
        </div>
      </div>

      <div style={s.card}>
        <h4 style={s.cardTitle}>GSAP Part & Operation Details</h4>
        {loading ? (
          <p style={{ color: t.textDim, fontSize: 13 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: t.textDim, fontSize: 13 }}>
            No rows on this screen. Data in the database is kept — click Refresh to show it, or Upload file to import.
          </p>
        ) : (
          <div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {COLUMNS.map((c) => (
                      <th key={c.key} style={s.th} title={c.hint || c.label}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      {COLUMNS.map((c) => (
                        <td key={c.key} style={s.td}>{row[c.key] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              t={t}
              s={s}
              page={safePage}
              pageCount={pageCount}
              fromRow={fromRow}
              toRow={toRow}
              total={rows.length}
              onPage={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, t, hint }) {
  return (
    <div
      title={hint || label}
      style={{
        background: t.surface2 || '#f1f5f9', borderRadius: 8, padding: '10px 14px', minWidth: 120,
      }}
    >
      <div style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: t.accent }}>{value}</div>
    </div>
  );
}

function Pager({ t, s, page, pageCount, fromRow, toRow, total, onPage }) {
  const pages = [];
  const windowSize = 7;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(pageCount, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <div style={s.pager}>
      <span style={{ fontSize: 12, color: t.textDim }}>
        Showing {fromRow}–{toRow} of {total}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" style={s.pageBtn} disabled={page <= 1} onClick={() => onPage(1)}>First</button>
        <button type="button" style={s.pageBtn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            style={{ ...s.pageBtn, ...(n === page ? s.pageBtnActive : {}) }}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        ))}
        <button type="button" style={s.pageBtn} disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</button>
        <button type="button" style={s.pageBtn} disabled={page >= pageCount} onClick={() => onPage(pageCount)}>Last</button>
      </div>
    </div>
  );
}

function getStyles(t) {
  return {
    page: { padding: '0 0 24px' },
    card: {
      background: t.surface, borderRadius: 10, padding: 16, marginBottom: 16,
      border: `1px solid ${t.border}`,
    },
    cardTitle: { margin: '0 0 10px', color: t.accent, fontSize: 14 },
    help: { margin: '0 0 14px', color: t.textDim, fontSize: 12, lineHeight: 1.5 },
    btnPrimary: {
      padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
      background: '#0ea5e9', color: '#fff', fontWeight: 600, fontSize: 13,
    },
    btnGhost: {
      padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
      background: 'transparent', color: '#ef4444', fontWeight: 600, fontSize: 13,
      border: '1px solid #ef4444',
    },
    search: {
      flex: 1, minWidth: 200, padding: '8px 10px', borderRadius: 6,
      border: `1px solid ${t.inpBorder}`, background: t.inp, color: t.text, fontSize: 13,
    },
    stats: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 },
    tableWrap: {
      overflowX: 'scroll',
      overflowY: 'auto',
      maxHeight: '60vh',
      border: `1px solid ${t.border}`,
      borderRadius: 6,
    },
    table: {
      width: 'max-content',
      minWidth: '100%',
      borderCollapse: 'collapse',
      fontSize: 12,
    },
    th: {
      position: 'sticky', top: 0, background: t.surface2 || '#e2e8f0',
      textAlign: 'left', padding: '8px 10px', color: t.textDim, fontWeight: 700,
      borderBottom: `2px solid ${t.border}`, whiteSpace: 'nowrap',
    },
    td: {
      padding: '7px 10px', borderBottom: `1px solid ${t.border}`, color: t.text,
      verticalAlign: 'top', whiteSpace: 'nowrap',
    },
    pager: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 10,
      borderTop: `1px solid ${t.border}`,
    },
    pageBtn: {
      padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
      border: `1px solid ${t.border}`, background: t.surface2 || 'transparent',
      color: t.text, fontSize: 12, fontWeight: 600,
    },
    pageBtnActive: {
      background: '#0ea5e9', color: '#fff', border: '1px solid #0ea5e9',
    },
  };
}
