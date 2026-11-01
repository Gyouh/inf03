import { useEffect, useState } from 'react';
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'; // bundled by Vite → works offline
import { SEED } from '../data/exam';

/** Creates the in-memory SQLite DB once; the instance never changes → no re-render cascades. */
export function useDb() {
  const [state, set] = useState({ db: null, error: null });
  useEffect(() => {
    let alive = true;
    initSqlJs({ locateFile: () => wasmUrl })
      .then(S => { const db = new S.Database(); db.exec(SEED); alive && set({ db, error: null }); })
      .catch(e => alive && set({ db: null, error: String(e) }));
    return () => { alive = false; };
  }, []);
  return state;
}