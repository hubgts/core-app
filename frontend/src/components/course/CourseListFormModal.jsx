import { useEffect, useState } from 'react';

/**
 * Création / édition d'une liste de courses : un titre et une date (optionnelle).
 * Même habillage que les modales d'entraînement (.modal / .field / .modal__actions).
 */
export default function CourseListFormModal({ list, onSave, onDelete, onClose }) {
  const isEdit = Boolean(list);
  const [title, setTitle] = useState(list?.title ?? '');
  const [date, setDate] = useState(list?.date ?? '');
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
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), date: date || null }, list?.id);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          <span style={{ marginRight: 8 }}>🛒</span>
          {isEdit ? 'Modifier la liste' : 'Nouvelle liste de courses'}
        </h2>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field__label">Titre</span>
            <input
              className="field__input"
              maxLength={120}
              autoFocus
              value={title}
              placeholder="ex : Courses de la semaine"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Date (optionnelle)</span>
            <input
              type="date"
              className="field__input"
              value={date ?? ''}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && (
              <div className="modal__actions-left">
                <button type="button" className="btn btn--danger" onClick={() => onDelete(list)}>
                  Supprimer
                </button>
              </div>
            )}
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
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
