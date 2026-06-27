import { useEffect, useState } from 'react';
import { ALL_MEASUREMENTS, metricMeta } from './constants';

function parseNum(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('Valeur invalide.');
  return n;
}

/** Réglages du module : taille (IMC), sexe, mensurations suivies. */
export default function ProfileModal({ profile, onSave, onClose }) {
  const [height, setHeight] = useState(
    profile?.heightCm != null ? String(profile.heightCm).replace('.', ',') : '',
  );
  const [sex, setSex] = useState(profile?.sex ?? '');
  const [metrics, setMetrics] = useState(new Set(profile?.metrics ?? []));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(k) {
    setMetrics((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    let heightCm;
    try {
      heightCm = parseNum(height);
    } catch {
      setError('Taille invalide.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        heightCm,
        sex: sex || null,
        metrics: ALL_MEASUREMENTS.filter((m) => metrics.has(m)),
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Réglages santé</h2>

        <form onSubmit={submit}>
          <p className="hsection">Profil fixe</p>
          <div className="hfield-row">
            <label className="hfield">
              <span className="hfield__label">Taille / stature (cm)</span>
              <input
                className="hfield__input"
                type="text"
                inputMode="decimal"
                value={height}
                placeholder="175"
                onChange={(e) => setHeight(e.target.value)}
              />
              <span className="hfield__hint">Mesurée une seule fois — sert uniquement à l'IMC.</span>
            </label>
            <label className="hfield">
              <span className="hfield__label">Sexe (optionnel)</span>
              <select className="hfield__input" value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="">—</option>
                <option value="f">Femme</option>
                <option value="m">Homme</option>
              </select>
            </label>
          </div>

          <p className="hsection">Mensurations suivies <em>(évoluent avec le muscle)</em></p>
          <div className="hfield">
            <span className="hfield__label">Choisis ce que tu mesures régulièrement</span>
            <div className="hchips">
              {ALL_MEASUREMENTS.map((k) => {
                const meta = metricMeta(k);
                const on = metrics.has(k);
                return (
                  <button
                    type="button"
                    key={k}
                    className={`hchip-toggle${on ? ' hchip-toggle--on' : ''}`}
                    onClick={() => toggle(k)}
                  >
                    {meta.icon} {meta.short}
                  </button>
                );
              })}
            </div>
            <span className="hfield__hint">
              Les valeurs déjà saisies sont conservées même si tu retires une mensuration.
            </span>
          </div>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
