import { useState, useEffect, useRef } from 'react';
import { Zap, Code2, Clock, ChevronDown, AlertCircle, Copy, Download } from 'lucide-react';
import { generateSQL } from '../lib/groq';

type HistoryItem = { input: string; sql: string; dbType: string; timestamp: number };
type Metadata = { complexity: string; tablesUsed: string[]; operations: string[] } | null;

const DB_TYPES = [
  { name: 'PostgreSQL', icon: '🐘' },
  { name: 'MySQL',      icon: '🐬' },
  { name: 'SQLite',     icon: '💾' },
  { name: 'SQL Server', icon: '🪟' },
];

const COMPLEXITIES = ['Simple', 'Medium', 'Complex'];

const EXAMPLES = [
  'Top 10 customers by revenue',
  'Find duplicate emails',
  'Monthly sales report',
  'Users who never ordered',
  'Department average salary',
  'Orders in last 30 days',
];

const FUNCTIONS = ['COUNT','SUM','AVG','MAX','MIN','COALESCE','CAST','ROW_NUMBER','RANK','OVER','PARTITION'];
const KEYWORDS  = [
  'SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','ON',
  'GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','INSERT','INTO','VALUES',
  'UPDATE','SET','DELETE','CREATE','TABLE','ALTER','DROP','AND','OR','NOT',
  'IN','EXISTS','BETWEEN','LIKE','IS','NULL','AS','DISTINCT','CASE','WHEN',
  'THEN','ELSE','END','WITH','UNION','ALL','INDEX',
];

function highlightSQL(sql: string): string {
  let h = sql;
  h = h.replace(/('(?:[^'\\]|\\.)*')/g, `<span class="sql-string">$1</span>`);
  h = h.replace(/(?<!['\w])(\d+)(?!['\w])/g, `<span class="sql-number">$1</span>`);
  h = h.replace(/(--[^\n]*)/g, `<span class="sql-comment">$1</span>`);
  FUNCTIONS.forEach(fn => {
    h = h.replace(new RegExp(`\\b(${fn})\\b`, 'gi'), `<span class="sql-function">$1</span>`);
  });
  KEYWORDS.forEach(k => {
    h = h.replace(new RegExp(`\\b(${k})\\b`, 'gi'), `<span class="sql-keyword">$1</span>`);
  });
  return h;
}

const S = {
  card: { background: '#1e1e1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, color: '#f5f5f0' } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'rgba(245,245,240,0.4)', marginBottom: 10, display: 'block' },
  field: { background: '#141413', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f5f5f0', fontSize: 15, padding: 16, width: '100%', outline: 'none', resize: 'none' as const, transition: 'border-color 0.15s, box-shadow 0.15s' } as React.CSSProperties,
};

function Field({ style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{
        ...S.field,
        ...(focused ? { borderColor: 'rgba(217,119,6,0.6)', boxShadow: '0 0 0 3px rgba(217,119,6,0.1)' } : {}),
        ...style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

export default function QueryGenerator() {
  const [input, setInput]       = useState('');
  const [schema, setSchema]     = useState('');
  const [dbType, setDbType]     = useState(DB_TYPES[0].name);
  const [sql, setSQL]           = useState('');
  const [displayedSQL, setDisplayedSQL] = useState('');
  const [explanation, setExplanation]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);
  const [complexity, setComplexity]             = useState('Medium');
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [addComments, setAddComments]           = useState(false);
  const [showSchema, setShowSchema]             = useState(false);
  const [history, setHistory]   = useState<HistoryItem[]>([]);
  const [metadata, setMetadata] = useState<Metadata>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try { const s = localStorage.getItem('sqlmaster_history'); if (s) setHistory(JSON.parse(s)); } catch {}
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!sql) { setDisplayedSQL(''); return; }
    let i = 0; setDisplayedSQL('');
    timerRef.current = setInterval(() => {
      setDisplayedSQL(sql.slice(0, ++i));
      if (i >= sql.length) clearInterval(timerRef.current!);
    }, 4);
    return () => clearInterval(timerRef.current!);
  }, [sql]);

  const saveHistory = (item: { input: string; sql: string; dbType: string }) => {
    const next = [{ ...item, timestamp: Date.now() }, ...history].slice(0, 5);
    setHistory(next);
    localStorage.setItem('sqlmaster_history', JSON.stringify(next));
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true); setSQL(''); setExplanation(''); setError(''); setMetadata(null);
    try {
      const result: any = await generateSQL({ input, schema, dbType, includeExplanation, addComments, complexity });
      setSQL(result.sql || '');
      setExplanation(result.explanation || '');
      setMetadata({ complexity: result.complexity || 'Medium', tablesUsed: result.tablesUsed || [], operations: result.operations || [] });
      saveHistory({ input, sql: result.sql, dbType });
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!sql) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([sql], { type: 'text/plain' }));
    a.download = `query_${Date.now()}.sql`; a.click();
  };

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' }}>

      {/* ── DB Selector ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {DB_TYPES.map(db => {
          const sel = dbType === db.name;
          return (
            <button
              key={db.name}
              onClick={() => setDbType(db.name)}
              style={{
                flex: '1 1 140px',
                height: 44,
                minWidth: 140,
                borderRadius: 10,
                border: sel ? '1px solid rgba(217,119,6,0.5)' : '1px solid rgba(255,255,255,0.08)',
                background: sel ? 'rgba(217,119,6,0.15)' : '#262624',
                color: sel ? '#d97706' : 'rgba(245,245,240,0.6)',
                fontWeight: sel ? 600 : 400,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!sel) { (e.currentTarget as HTMLButtonElement).style.background = '#2e2e2c'; (e.currentTarget as HTMLButtonElement).style.color = '#f5f5f0'; } }}
              onMouseLeave={e => { if (!sel) { (e.currentTarget as HTMLButtonElement).style.background = '#262624'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,245,240,0.6)'; } }}
            >
              <span style={{ fontSize: 18 }}>{db.icon}</span>
              <span>{db.name}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main Form Card ── */}
      <div style={{ ...S.card, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Query input */}
        <div>
          <label style={S.label}>Describe your query</label>
          <Field
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. Find all users who ordered more than 3 times in the last 30 days..."
            style={{ minHeight: 160 }}
          />
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(245,245,240,0.4)', textAlign: 'right' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>
        </div>

        {/* Schema toggle */}
        <div>
          <button
            onClick={() => setShowSchema(s => !s)}
            style={{ ...S.label, cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0, padding: 0 }}
          >
            <ChevronDown
              size={14}
              style={{ transition: 'transform 0.2s', transform: showSchema ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            Schema (optional)
          </button>
          {showSchema && (
            <div style={{ marginTop: 10 }}>
              <Field
                value={schema}
                onChange={e => setSchema(e.target.value)}
                placeholder={'users(id, name, email)\norders(id, user_id, amount)'}
                style={{ minHeight: 100, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
              />
            </div>
          )}
        </div>

        {/* Example chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setInput(ex)}
              style={{
                background: '#262624',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 13,
                color: 'rgba(245,245,240,0.6)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#2e2e2c';
                b.style.borderColor = 'rgba(217,119,6,0.3)';
                b.style.color = '#f5f5f0';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#262624';
                b.style.borderColor = 'rgba(255,255,255,0.08)';
                b.style.color = 'rgba(245,245,240,0.6)';
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Options row */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeExplanation}
                onChange={e => setIncludeExplanation(e.target.checked)}
              />
              <span style={{ fontSize: 14, color: 'rgba(245,245,240,0.7)' }}>Include explanation</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={addComments}
                onChange={e => setAddComments(e.target.checked)}
              />
              <span style={{ fontSize: 14, color: 'rgba(245,245,240,0.7)' }}>Add SQL comments</span>
            </label>
          </div>

          {/* Complexity slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {COMPLEXITIES.map(c => (
                <span key={c} style={{ fontSize: 12, color: complexity === c ? '#d97706' : 'rgba(245,245,240,0.4)', fontWeight: complexity === c ? 600 : 400, transition: 'color 0.15s' }}>
                  {c}
                </span>
              ))}
            </div>
            <input
              type="range" min={0} max={2}
              value={COMPLEXITIES.indexOf(complexity)}
              onChange={e => setComplexity(COMPLEXITIES[+e.target.value])}
            />
          </div>
        </div>

        {/* Generate button */}
        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={loading || !input.trim()}
          style={{ marginTop: 4 }}
        >
          {loading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Generating...
            </>
          ) : (
            <><Zap size={17} /> Generate SQL</>
          )}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="fade-in" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 14, color: '#f87171' }}>{error}</p>
        </div>
      )}

      {/* ── SQL Output ── */}
      {(sql || loading) && (
        <div className="fade-in" style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          {/* Header bar */}
          <div style={{
            background: '#262624',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d97706', fontWeight: 600, fontSize: 14 }}>
              <Code2 size={16} /> Generated SQL
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={handleCopy} disabled={!sql}>
                <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
              </button>
              <button className="btn-ghost" onClick={handleDownload} disabled={!sql}>
                <Download size={13} /> Download
              </button>
            </div>
          </div>

          {/* Code area */}
          <div style={{ background: '#141413', padding: 20, minHeight: 200, display: 'flex', gap: 16, overflow: 'auto' }}>
            <div style={{ color: 'rgba(245,245,240,0.25)', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, lineHeight: 1.7, textAlign: 'right', userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.07)', paddingRight: 14, minWidth: 32 }}>
              {(displayedSQL || ' ').split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, lineHeight: 1.7, color: '#f5f5f0', margin: 0, flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <code dangerouslySetInnerHTML={{ __html: highlightSQL(displayedSQL) }} />
              {loading && <span style={{ display: 'inline-block', width: 10, height: '1em', background: '#d97706', animation: 'pulse 1s ease infinite', verticalAlign: 'text-bottom', marginLeft: 2 }} />}
              <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
            </pre>
          </div>
        </div>
      )}

      {/* ── Explanation & metadata ── */}
      {explanation && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
          <div style={{ ...S.card, padding: 20 }}>
            <span style={S.label}>Explanation</span>
            <p style={{ margin: 0, fontSize: 15, color: 'rgba(245,245,240,0.75)', lineHeight: 1.7 }}>{explanation}</p>
          </div>
          {metadata && metadata.tablesUsed.length > 0 && (
            <div style={{ ...S.card, padding: 20, minWidth: 180 }}>
              <span style={S.label}>Tables Used</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {metadata.tablesUsed.map(t => (
                  <span key={t} style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(217,119,6,0.2)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History ── */}
      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <span style={S.label}>Recent Queries</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => { setInput(item.input); setDbType(item.dbType); setSQL(item.sql); }}
                style={{
                  background: '#1e1e1c',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.background = '#262624'; b.style.borderColor = 'rgba(217,119,6,0.2)'; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.background = '#1e1e1c'; b.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{item.dbType}</span>
                  <span style={{ fontSize: 14, color: 'rgba(245,245,240,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60vw' }}>{item.input}</span>
                </div>
                <Clock size={15} style={{ color: 'rgba(245,245,240,0.2)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
