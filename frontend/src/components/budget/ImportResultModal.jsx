import { useEffect } from 'react';
import { formatEur, monthLabel } from './constants';

/**
 * Modale en lecture seule d'un import **validé** (résumé, §7) ou **en erreur**
 * (détail des erreurs, §8). Aucun retour vers l'édition (spec §7).
 */
export default function ImportResultModal({ batch, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isError = batch.status === 'error';
  const s = batch.summary;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal modal--xl bimport"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title">
          {isError ? 'Import en erreur' : 'Import validé'} — {batch.fileName}
          <span className="bimport__fmt">{batch.formatLabel}</span>
        </h2>

        {isError ? (
          <div className="bimport__errbox">
            {batch.errorMessage ? (
              <p className="bimport__errmsg">{batch.errorMessage}</p>
            ) : (
              <p className="bimport__errmsg">
                {batch.errorCount} ligne(s) illisible(s) dans le fichier.
              </p>
            )}
            {batch.rows?.some((r) => r.error) && (
              <ul className="bimport__errlist">
                {batch.rows
                  .filter((r) => r.error)
                  .map((r) => (
                    <li key={r.id}>
                      <strong>Ligne {r.sourceLine}</strong> — {r.error}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="bimport__cards">
              <div className="bimport__card">
                <span className="fhero__label">Dépenses</span>
                <strong className="t-down">{formatEur(s.totalExpenses)}</strong>
              </div>
              <div className="bimport__card">
                <span className="fhero__label">Revenus</span>
                <strong className="t-up">{formatEur(s.totalIncome)}</strong>
              </div>
              <div className="bimport__card">
                <span className="fhero__label">Transactions</span>
                <strong>{batch.importableCount}</strong>
              </div>
            </div>

            {s.byMonth.length > 0 && (
              <section className="bimport__sec">
                <h3 className="bimport__sectitle">Par mois</h3>
                <ul className="bimport__pills">
                  {s.byMonth.map((m) => (
                    <li key={m.month} className="bimport__pill">
                      {monthLabel(m.month)} · {m.count}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {s.byCategory.length > 0 && (
              <section className="bimport__sec">
                <h3 className="bimport__sectitle">Dépenses par catégorie</h3>
                <ul className="bimport__catlist">
                  {[...s.byCategory]
                    .sort((a, b) => b.total - a.total)
                    .map((c) => (
                      <li
                        key={c.categoryId || 'none'}
                        className="bimport__catrow"
                      >
                        <span>
                          {c.categoryId
                            ? (c.categoryName ?? '—')
                            : 'Sans catégorie'}
                        </span>
                        <span className="bimport__catnums">
                          {formatEur(c.total)}
                          <span className="bimport__catcount">
                            {' '}
                            · {c.count}
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </>
        )}

        <div className="modal__actions">
          <div className="modal__actions-right">
            <button
              type="button"
              className="btn btn--primary"
              onClick={onClose}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
