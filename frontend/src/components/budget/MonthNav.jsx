import { monthLabel, shiftMonth } from './constants';

// Navigateur de mois ◀ Mars 2026 ▶ (mois au format 'YYYY-MM').
export default function MonthNav({ month, onChange }) {
  return (
    <div className="bmonth">
      <button className="bmonth__nav" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mois précédent">◀</button>
      <span className="bmonth__label">{monthLabel(month)}</span>
      <button className="bmonth__nav" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Mois suivant">▶</button>
    </div>
  );
}
