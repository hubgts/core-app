import { useEffect, useState } from 'react';
import Combobox from '../Combobox';

/**
 * Choix d'un modèle pour créer une nouvelle liste de courses. Même habillage que
 * les autres modales du module (.modal / .field / .modal__actions). La liste
 * déroulante utilise `<Combobox>` (recherche intégrée).
 */
export default function TemplatePickerModal({ templates, onConfirm, onClose }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!templateId) {
      setError('Choisis un modèle.');
      return;
    }
    setSaving(true);
    try {
      await onConfirm(templateId);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const options = templates.map((t) => ({
    value: t.id,
    label: `${t.title} (${t.itemCount} article${t.itemCount > 1 ? 's' : ''})`,
  }));

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          <span style={{ marginRight: 8 }}>📋</span>
          Créer une liste à partir d'un modèle
        </h2>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field__label">Modèle</span>
            <Combobox
              options={options}
              value={templateId}
              onChange={setTemplateId}
              placeholder="Choisir un modèle…"
              className="field__input"
            />
          </label>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
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
                {saving ? '…' : 'Créer la liste'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
