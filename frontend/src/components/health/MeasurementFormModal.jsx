import { useEffect, useRef, useState } from 'react';
import { metricMeta } from './constants';
import { todayStr } from '../../utils/date';

// Parse "78,4" / "78.4" → 78.4 ; "" → null.
function parseNum(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('Valeur invalide.');
  return n;
}

/**
 * Saisie / édition d'une mesure (poids + mensurations suivies).
 * `measurement` fourni → édition (drawer pré-rempli, RG-01) ; sinon création.
 */
export default function MeasurementFormModal({
  measurement,
  metrics,
  today,
  onSave,
  onDelete,
  onClose,
}) {
  const isEdit = Boolean(measurement);
  const [date, setDate] = useState(measurement?.date ?? today ?? todayStr());
  const [weight, setWeight] = useState(
    measurement?.weightKg != null
      ? String(measurement.weightKg).replace('.', ',')
      : '',
  );
  const [vals, setVals] = useState(() => {
    const init = {};
    for (const k of metrics) {
      const v = measurement?.values?.[k];
      init[k] = v != null ? String(v).replace('.', ',') : '';
    }
    return init;
  });
  const [note, setNote] = useState(measurement?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    let payload;
    try {
      const values = {};
      for (const k of metrics) values[k] = parseNum(vals[k]);
      payload = {
        weightKg: parseNum(weight),
        note: note.trim() || null,
        values,
      };
    } catch {
      setError('Vérifiez les valeurs saisies (nombres).');
      return;
    }
    const hasValue =
      payload.weightKg != null ||
      Object.values(payload.values).some((v) => v != null);
    if (!hasValue) {
      setError('Renseignez au moins le poids ou une mensuration.');
      return;
    }
    setSaving(true);
    try {
      await onSave(date, payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {isEdit ? 'Modifier la mesure' : 'Nouvelle pesée'}
        </h2>

        <form onSubmit={submit}>
          <div className="hfield-row">
            <label className="hfield">
              <span className="hfield__label">Date</span>
              <input
                className="hfield__input"
                type="date"
                value={date}
                max={today ?? todayStr()}
                disabled={isEdit}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="hfield">
              <span className="hfield__label">⚖️ Poids (kg)</span>
              <input
                ref={firstRef}
                className="hfield__input"
                type="text"
                inputMode="decimal"
                value={weight}
                placeholder="78,4"
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
          </div>

          {metrics.length > 0 && (
            <div className="hfield">
              <span className="hfield__label">
                Mensurations (cm) — optionnel
              </span>
              <span
                className="hfield__hint"
                style={{ marginTop: 0, marginBottom: 8 }}
              >
                Remplis seulement celles que tu mesures ce jour-là — pas besoin
                de tout faire à chaque fois.
              </span>
              <div className="hmeasgrid">
                {metrics.map((k) => {
                  const meta = metricMeta(k);
                  return (
                    <label key={k} className="hmeasgrid__item">
                      <span className="hmeasgrid__label">
                        {meta.icon} {meta.short}
                      </span>
                      <input
                        className="hfield__input"
                        type="text"
                        inputMode="decimal"
                        value={vals[k]}
                        placeholder="—"
                        onChange={(e) =>
                          setVals((s) => ({ ...s, [k]: e.target.value }))
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <label className="hfield">
            <span className="hfield__label">Note (optionnel)</span>
            <input
              className="hfield__input"
              type="text"
              maxLength={200}
              value={note}
              placeholder="Ex : après sport, au réveil…"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && (
              <div className="modal__actions-left">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => onDelete(measurement)}
                >
                  Supprimer
                </button>
              </div>
            )}
            <div className="modal__actions-right">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving}
              >
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
