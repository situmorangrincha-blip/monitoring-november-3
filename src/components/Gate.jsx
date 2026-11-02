import { DEPOTS, TEAMS, depotLabel } from '../lib/store.js';

export function DepotPick({ onPick }) {
  return (
    <div className="gate">
      <h1>Sales Monitor</h1>
      <p>Pilih depo</p>
      <div className="gate-btns">
        {DEPOTS.map((d) => (
          <button key={d.id} className={'pick ' + d.id} onClick={() => onPick(d.id)}>{d.label}</button>
        ))}
      </div>
    </div>
  );
}

export function TeamPick({ depot, onPick, onBack }) {
  return (
    <div className="gate" data-depot={depot}>
      <h1>{depotLabel(depot)}</h1>
      <p>Pilih tim</p>
      <div className="gate-btns">
        {TEAMS.map((t) => (
          <button key={t.id} className="pick" onClick={() => onPick(t.id)}>
            {t.label}<small>{t.desc}</small>
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
        <button className="btn ghost" onClick={onBack}>← Ganti depo</button>
      </div>
    </div>
  );
}

