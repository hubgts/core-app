import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetApi } from '../api/budget';
import { confirmDialog } from '../components/dialogs';
import { toast } from '../components/toast';
import ImportResultModal from '../components/budget/ImportResultModal';
import { monthLabel } from '../components/budget/constants';
import './FinancesPage.css';
import './BudgetPage.css';
import './ImportPage.css';

/**
 * Lit le texte d'un fichier en gérant l'encodage. Les exports bancaires (SG) sont
 * souvent en ISO-8859-1/Windows-1252 : un décodage UTF-8 brut y injecte des
 * caractères de remplacement (�). On décode donc en UTF-8, et si le résultat
 * contient des �, on retombe sur windows-1252.
 */
async function readFileText(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�')) return utf8;
  try {
    return new TextDecoder('windows-1252').decode(buffer);
  } catch {
    return utf8;
  }
}

const STATUS_META = {
  pending: { label: 'À vérifier', tone: 'warn' },
  validated: { label: 'Validé', tone: 'up' },
  error: { label: 'En erreur', tone: 'down' },
};

/**
 * Écran d'import bancaire (§1–§8) : dépôt d'un fichier, ouverture de la modale de
 * vérification, et historique des imports avec leur statut.
 */
export default function ImportPage() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // détail d'un import validé / en erreur
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setList(await budgetApi.imports());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const content = await readFileText(file);
      const batch = await budgetApi.uploadImport(file.name, content);
      // Un import à vérifier ouvre l'écran de vérification dédié ; sinon on
      // affiche le résumé / le détail des erreurs en lecture seule.
      if (batch.status === 'pending') navigate(`/budget/import/${batch.id}`);
      else {
        setResult(batch);
        load();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function openImport(item) {
    if (item.status === 'pending') {
      navigate(`/budget/import/${item.id}`);
      return;
    }
    try {
      setResult(await budgetApi.getImport(item.id));
    } catch (e) {
      toast(e.message);
    }
  }

  async function deleteImport(id) {
    if (
      !(await confirmDialog({
        message:
          'Supprimer cet import de l’historique ? Les transactions déjà validées sont conservées.',
        danger: true,
      }))
    )
      return;
    try {
      await budgetApi.removeImport(id);
      toast('Import supprimé.');
      await load();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="fpage">
      <header className="fpage__head">
        <h1 className="fpage__title">📥 Import</h1>
      </header>

      {error && <p className="fpage__error">{error}</p>}

      {/* Dépôt de fichier */}
      <section className="fcard">
        <h2 className="fcard__title">Importer un relevé bancaire</h2>
        <p className="bimp__hint">
          Déposez un export bancaire ; les transactions sont extraites puis
          soumises à votre vérification avant d’être ajoutées à Plan &amp;
          dépenses. Format supporté : <strong>Société Générale CSV</strong>{' '}
          (export « Tableau », séparateur point-virgule).
        </p>
        <label
          className={`bimp__drop${uploading ? ' is-busy' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="bimp__file"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={uploading}
          />
          <span className="bimp__dropicon">📄</span>
          <span className="bimp__droptext">
            {uploading
              ? 'Analyse en cours…'
              : 'Cliquez ou déposez un fichier ici'}
          </span>
        </label>
      </section>

      {/* Historique */}
      <section className="fcard">
        <h2 className="fcard__title">Historique des imports</h2>
        {loading ? (
          <p className="fempty">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="fempty">Aucun import pour l’instant.</p>
        ) : (
          <ul className="bimp__hist">
            {list.map((it) => {
              const meta = STATUS_META[it.status];
              return (
                <li key={it.id} className="bimp__item">
                  <button
                    className="bimp__itemmain"
                    onClick={() => openImport(it)}
                  >
                    <span className="bimp__itemtop">
                      <span className="bimp__file-name">{it.fileName}</span>
                      <span className={`bimp__badge t-${meta.tone}`}>
                        {meta.label}
                      </span>
                    </span>
                    <span className="bimp__itemmeta">
                      <span>{it.formatLabel}</span>
                      <span>·</span>
                      <span>
                        {new Date(it.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      <span>·</span>
                      <span>{it.detectedCount} détectées</span>
                      {it.months.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{it.months.map(monthLabel).join(', ')}</span>
                        </>
                      )}
                    </span>
                    {it.status === 'validated' && (
                      <span className="bimp__itemsum">
                        {it.importableCount} transaction(s)
                        {it.duplicateCount > 0 &&
                          ` · ${it.duplicateCount} doublon(s) ignoré(s)`}
                      </span>
                    )}
                  </button>
                  <button
                    className="fhist__del"
                    onClick={() => deleteImport(it.id)}
                    title="Supprimer l’import"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {result && (
        <ImportResultModal batch={result} onClose={() => setResult(null)} />
      )}
    </div>
  );
}
