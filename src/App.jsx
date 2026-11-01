import { useState, useMemo, useCallback, useRef, memo } from 'react';
import { useDb } from './hooks/useDb';
import { TASKS } from './data/exam';
import { run, verify } from './engine/verify';
import './App.css';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KW = 'select|from|where|join|left|right|inner|outer|on|group|by|having|order|asc|desc|as|and|or|not|in|like|between|is|null|distinct|limit|count|sum|avg|min|max|insert|into|values|update|set|delete|create|table';
const HL = new RegExp(`(--.*$)|('[^']*'?)|\\b(${KW})\\b|\\b(\\d+(?:\\.\\d+)?)\\b`, 'gmi');
const highlight = s => esc(s).replace(HL, (m, c, str, k, n) => `<span class="${c ? 'c' : str ? 's' : k ? 'k' : 'n'}">${m}</span>`) + '\n';

/* ---------- presentational components (memo: re-render only when their own props change) ---------- */
const Grid = memo(function Grid({ cols, rows }) {
  if (!cols.length) return <div className="msg info">MySQL returned an empty result set (i.e. zero rows).</div>;
  return (
    <table className="res"><thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => v === null ? <td key={j} className="nl">NULL</td> : <td key={j}>{String(v)}</td>)}</tr>)}</tbody></table>
  );
});

const Editor = memo(function Editor({ value, onChange, onGo }) {
  const pre = useRef(null);
  return (
    <div className="editor">
      <div className="ed">
        <pre ref={pre} dangerouslySetInnerHTML={{ __html: highlight(value) }} />
        <textarea value={value} spellCheck={false} onChange={e => onChange(e.target.value)}
          onScroll={e => { pre.current.scrollTop = e.target.scrollTop; pre.current.scrollLeft = e.target.scrollLeft; }}
          onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); onGo(); } }} />
      </div>
      <div className="btns"><button className="go" onClick={onGo}>Wykonaj</button><button onClick={() => onChange('')}>Clear</button><small>Ctrl+Enter = Go</small></div>
    </div>
  );
});

const Feedback = memo(function Feedback({ fb, last, onNext }) {
  if (!fb) return <div className="msg info">Run a query first: the verification appears here.</div>;
  if (fb.ok) return (<>
    <div className="msg ok"><h4>✅ {fb.what}</h4><p>{fb.why}</p><p>Great work, that is exactly the muscle memory you want on exam day!</p></div>
    {last ? <div className="msg info">🎉 All tasks in this set completed.</div> : <button className="next" onClick={onNext}>Next task »</button>}
  </>);
  return (<>
    <div className="msg err"><h4>❌ What is wrong?</h4><p dangerouslySetInnerHTML={{ __html: fb.what }} /></div>
    <div className="msg err soft"><h4>🔍 Why did it fail?</h4><p dangerouslySetInnerHTML={{ __html: fb.why }} /></div>
    <div className="msg hint"><h4>💡 Mentor hint</h4><p dangerouslySetInnerHTML={{ __html: fb.hint }} /></div>
  </>);
});

const Sidebar = memo(function Sidebar({ tables, selected, open, onToggle, onPick }) {
  return (
    <aside>
      <div className="db" onClick={onToggle}>{open ? '▾' : '▸'} 🗄 exam_shop</div>
      {open && <ul>{tables.map(t => <li key={t} className={t === selected ? 'on' : ''} onClick={() => onPick(t)}>▦ {t}</li>)}</ul>}
    </aside>
  );
});

/* ---------- root: owns ALL persistent state; panels stay mounted and are only hidden ---------- */
export default function App() {
  const { db, error } = useDb();
  const [cur, setCur] = useState(0);
  const [done, setDone] = useState(() => new Set());
  // per-task persistent state: editor text, last result, feedback, active bottom tab
  const [ts, setTs] = useState(() => TASKS.map(() => ({ sql: '', res: null, fb: null, tab: 'res' })));
  const [topTab, setTopTab] = useState('sql');
  const [sel, setSel] = useState('clients');
  const [treeOpen, setTreeOpen] = useState(true);

  const patch = useCallback((i, p) => setTs(a => a.map((x, j) => (j === i ? { ...x, ...p } : x))), []);
  const task = TASKS[cur], st = ts[cur];

  const tables = useMemo(() => db ? run(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").rows.map(r => r[0]) : [], [db]);
  const structure = useMemo(() => {
    if (!db || !sel) return null;
    const fks = {};
    (db.exec(`PRAGMA foreign_key_list(${sel})`)[0]?.values || []).forEach(f => { fks[f[3]] = `${f[2]}(${f[4]})`; });
    return { cols: ['#', 'Column', 'Type', 'Null', 'Key'], rows: db.exec(`PRAGMA table_info(${sel})`)[0].values.map(c => [c[0] + 1, c[1], c[2], c[3] ? 'NO' : 'YES', c[5] ? '🔑 PRIMARY' : fks[c[1]] ? '🔗 → ' + fks[c[1]] : '']) };
  }, [db, sel]);
  const browse = useMemo(() => (db && sel ? run(db, `SELECT * FROM ${sel} LIMIT 50`) : null), [db, sel]);

  const setSql = useCallback(v => patch(cur, { sql: v }), [patch, cur]);
  const go = useCallback(() => {
    const sql = st.sql.trim(); if (!sql || !db) return;
    let res; try { res = { ...run(db, sql), sql }; } catch (e) { res = { err: e.message, sql }; }
    const fb = verify(db, task, sql);
    patch(cur, { res, fb, tab: 'fb' });
    if (fb.ok) setDone(d => new Set(d).add(cur));
  }, [db, st.sql, task, cur, patch]);
  const next = useCallback(() => setCur(c => c + 1), []);
  const pick = useCallback(t => { setSel(t); setTopTab(p => (p === 'sql' ? 'structure' : p)); }, []);
  const pct = Math.round(done.size / TASKS.length * 100);

  if (error) return <div className="msg err">Could not start sql.js: {error}</div>;
  if (!db) return <div className="msg info">Loading SQLite engine…</div>;

  return (
    <div className="app">
      <header>
        <span className="logo"><b>php</b><i>MyAdmin</i> – INF.03 Exam Simulator</span>
        <span>Database: <b>exam_shop</b></span>
        <span className="prog">Task {cur + 1}/{TASKS.length}<span className="bar"><i style={{ width: pct + '%' }} /></span>{pct}%</span>
      </header>
      <Sidebar tables={tables} selected={sel} open={treeOpen} onToggle={() => setTreeOpen(o => !o)} onPick={pick} />
      <main>
        <div className="banner" key={cur}><b>Task {cur + 1}.</b> <span dangerouslySetInnerHTML={{ __html: task.text }} /></div>

        <div className="tabs">{['sql', 'structure', 'browse'].map(t => <div key={t} className={'tab' + (topTab === t ? ' on' : '')} onClick={() => setTopTab(t)}>{t === 'sql' ? 'SQL' : t[0].toUpperCase() + t.slice(1)}</div>)}</div>
        <div className="pane top">
          {/* Editor is keyed per task but never unmounted by tab switches */}
          <div hidden={topTab !== 'sql'} className="fill"><Editor key={cur} value={st.sql} onChange={setSql} onGo={go} /></div>
          <div hidden={topTab !== 'structure'} className="fill scroll">{structure && <Grid {...structure} />}</div>
          <div hidden={topTab !== 'browse'} className="fill scroll">{browse && <Grid {...browse} />}</div>
        </div>

        <div className="tabs">
          <div className={'tab' + (st.tab === 'res' ? ' on' : '')} onClick={() => patch(cur, { tab: 'res' })}>Query results</div>
          <div className={'tab' + (st.tab === 'fb' ? ' on' : '')} onClick={() => patch(cur, { tab: 'fb' })}>Exam verification &amp; feedback</div>
        </div>
        <div className="pane bottom scroll">
          {st.tab === 'res'
            ? !st.res ? <div className="msg info">Press <b>Wykonaj</b> to run your query.</div>
              : st.res.err ? <div className="msg err">{st.res.err}</div>
              : <><div className="msg ok soft">✔ {st.res.rows.length} row(s) returned</div><Grid cols={st.res.cols} rows={st.res.rows} /></>
            : <Feedback fb={st.fb} last={cur === TASKS.length - 1} onNext={next} />}
        </div>
      </main>
    </div>
  );
}