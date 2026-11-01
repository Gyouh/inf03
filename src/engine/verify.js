// Pure functions: no React, easy to unit-test.
const norm = v => (v === null ? '∅' : typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : String(v).trim().toLowerCase());
const key = r => r.map(norm).join('\u0001');

export function run(db, sql) {
  const r = db.exec(sql);
  const last = r[r.length - 1];
  return last ? { cols: last.columns, rows: last.values } : { cols: [], rows: [] };
}

function explainError(m) {
  const f = { ok: false, what: `SQLite error: <code>${m.replace(/</g, '&lt;')}</code>`, why: 'The query could not be executed.', hint: 'Re-read the statement slowly, clause by clause.' };
  let x;
  if ((x = m.match(/no such table: (\S+)/))) { f.why = `There is no table “${x[1]}”.`; f.hint = 'Check spelling against the sidebar.'; }
  else if ((x = m.match(/no such column: (\S+)/))) { f.why = `Column “${x[1]}” does not exist in the tables you use.`; f.hint = 'Check the Structure tab; with JOINs prefix columns with an alias (<code>c.last_name</code>).'; }
  else if (/syntax error/.test(m)) { f.why = 'The statement is not valid SQL near the place SQLite names.'; f.hint = 'Look for a missing comma, misspelled keyword, unbalanced quote, or wrong clause order (SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY).'; }
  else if (/ambiguous column/.test(m)) { f.why = 'That column exists in more than one joined table.'; f.hint = 'Put the table alias in front, e.g. <code>o.id</code>.'; }
  else if (/misuse of aggregate/.test(m)) { f.why = 'An aggregate (SUM, COUNT…) is used where it is not allowed, usually in WHERE.'; f.hint = 'Conditions on aggregates go to HAVING.'; }
  return f;
}

/** Validation pipeline: reference → user → columns → rows → cells → aliases → diagnostics. */
export function verify(db, task, sql) {
  const ref = run(db, task.solution);
  let usr;
  try { usr = run(db, sql); } catch (e) { return explainError(e.message); }
  const f = { ok: false };
  const missing = task.need.filter(n => !n.re.test(sql)).map(n => n.msg).join('<br>');
  if (!usr.cols.length) return { ...f, what: 'No result set returned.', why: 'The task needs a SELECT that returns data.', hint: 'Start with SELECT … FROM …' };
  if (usr.cols.length !== ref.cols.length)
    return { ...f, what: 'Wrong number of columns.', why: `You return ${usr.cols.length} column(s); the task needs ${ref.cols.length}.`, hint: 'Re-read which columns are requested and avoid SELECT *.' };
  if (usr.rows.length !== ref.rows.length) {
    const more = usr.rows.length > ref.rows.length;
    return { ...f, what: more ? 'Too many rows.' : 'Too few rows.', why: `You return ${usr.rows.length} row(s); the answer key has ${ref.rows.length}.`,
      hint: missing || (more ? 'Some rows should be filtered out; also check whether JOINs multiply rows.' : 'A condition or JOIN is removing rows that belong in the result.') };
  }
  const a = usr.rows.map(key), b = ref.rows.map(key);
  const sa = [...a].sort(), sb = [...b].sort();
  if (!sa.every((x, i) => x === sb[i])) return { ...f, what: 'Row contents differ.', why: 'Row count matches, but some values are different.', hint: missing || 'Wrong column, wrong calculation, or an almost-right condition (> vs >=)?' };
  if (task.ordered && !a.every((x, i) => x === b[i]))
    return { ...f, what: 'Right data, wrong order.', why: 'All rows are correct but ordered differently than required.', hint: 'Check ORDER BY columns, direction (ASC/DESC) and tie-breakers.' };
  if (task.aliases && usr.cols.join().toLowerCase() !== ref.cols.join().toLowerCase())
    return { ...f, what: 'Column names do not match.', why: `You named columns “${usr.cols.join(', ')}”, the task expects “${ref.cols.join(', ')}”.`, hint: 'Use <code>AS alias</code> exactly as written in the task.' };
  return { ok: true, what: 'Correct! Your result matches the answer key.', why: 'Same columns, rows and values' + (task.ordered ? ', in the required order.' : '.'), hint: '' };
}