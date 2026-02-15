import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useServerQuery } from '../../../../shared/lib';
import { Loading, EmptyState, ErrorState, ConfirmModal } from '../../../../shared/ui';
import { createRecipe, updateRecipe, deleteRecipe } from '../../api/recipesApi';
import { apiClient } from '../../../../shared/api';
import './RecipesPage.scss';

const RecipesPage = () => {
  const [query, setQuery] = useState({ page: 1, page_size: 20, search: '' });
  const [modalOpen, setModalOpen] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { items: recipes, loading, error, refetch } = useServerQuery(
    'recipes/',
    query,
    { enabled: true }
  );

  const handleSubmit = async (data) => {
    setSubmitError('');
    try {
      if (modalOpen?.id) {
        await updateRecipe(modalOpen.id, data);
      } else {
        await createRecipe(data);
      }
      setModalOpen(null);
      refetch();
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.response?.data?.details || 'Ошибка');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitError('');
    try {
      await deleteRecipe(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const renderComposition = (recipe) => {
    const comp = recipe.components || recipe.composition || [];
    if (Array.isArray(comp) && comp.length) {
      return comp.map((c) => {
        const name = c.material_name || c.element_name || c.name || '—';
        const qty = c.quantity != null ? c.quantity : '';
        const u = c.unit || 'кг';
        return qty ? `${name} ${qty} ${u}` : name;
      }).join(', ');
    }
    return recipe.composition_text || '—';
  };

  return (
    <div className="page page--recipes">
      <h1 className="page__title">Рецепты</h1>
      <div className="recipes-nav">
        <Link to="/materials" className="recipes-nav__link">Склад сырья</Link>
        <span className="recipes-nav__sep">•</span>
        <Link to="/chemistry" className="recipes-nav__link">Хим. элементы</Link>
      </div>
      <div className="recipes-banner">
        Используйте только подтверждённые хим. элементы.
      </div>
      <div className="recipes-card">
        <div className="recipes-card__head">
          <h2 className="recipes-card__title">Рецепты</h2>
          <div className="recipes-card__actions">
            <input
              type="text"
              className="recipes-card__search"
              placeholder="Поиск..."
              value={query.search || ''}
              onChange={(e) => setQuery((p) => ({ ...p, search: e.target.value, page: 1 }))}
            />
            <button type="button" className="btn btn--primary" onClick={() => setModalOpen({})}>
              Создать
            </button>
          </div>
        </div>
        {loading && <Loading />}
        {error && error.status !== 404 && <ErrorState error={error} onRetry={refetch} />}
        {!loading && (!error || error.status === 404) && (
          recipes.length === 0 ? (
            <EmptyState title="Нет данных" />
          ) : (
            <div className="recipes-table">
              <div className="recipes-table__header">
                <span className="recipes-table__th">РЕЦЕПТ</span>
                <span className="recipes-table__th">ТОВАР (ПРОДУКТ)</span>
                <span className="recipes-table__th">СОСТАВ</span>
                <span className="recipes-table__th">СТАТУС</span>
                <span className="recipes-table__th recipes-table__th--actions">ДЕЙСТВИЯ</span>
              </div>
              {recipes.map((r) => (
                <div key={r.id} className="recipes-table__row">
                  <span className="recipes-table__name">{r.name || r.recipe_name || '—'}</span>
                  <span>{r.product_name || r.product || r.name || '—'}</span>
                  <span className="recipes-table__composition">{renderComposition(r)}</span>
                  <span>{r.status || '—'}</span>
                  <div className="recipes-table__actions">
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setModalOpen(r)}>
                      Редактировать
                    </button>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget({ id: r.id, name: r.name || r.recipe_name })}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {modalOpen !== null && (
        <RecipeModal
          recipe={modalOpen?.id ? modalOpen : null}
          onSubmit={handleSubmit}
          onClose={() => { setModalOpen(null); setSubmitError(''); }}
          error={submitError}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить?"
        message={deleteTarget ? `Удалить "${deleteTarget.name}"?` : ''}
        confirmText="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

const TYPE_RAW = 'raw_material';
const TYPE_CHEMISTRY = 'chemistry';

const RecipeModal = ({ recipe, onSubmit, onClose, error }) => {
  const isEdit = !!recipe?.id;
  const [name, setName] = useState(recipe?.name || recipe?.recipe_name ?? '');
  const [components, setComponents] = useState(() => {
    const comp = recipe?.components || recipe?.composition || [];
    return Array.isArray(comp) ? comp.map((c) => ({
      type: c.type || (c.material_id ? TYPE_RAW : TYPE_CHEMISTRY),
      id: c.material_id || c.chemistry_id || c.element_id || c.id,
      name: c.material_name || c.element_name || c.name || '—',
      quantity: c.quantity ?? '',
      unit: c.unit || 'кг',
    })) : [];
  });
  const [compType, setCompType] = useState(TYPE_RAW);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('кг');

  const [rawMaterials, setRawMaterials] = useState([]);
  const [chemistryElements, setChemistryElements] = useState([]);

  useEffect(() => {
    apiClient.get('raw-materials/', { params: { page_size: 500 } })
      .then((res) => setRawMaterials(res.data?.items || []))
      .catch(() => setRawMaterials([]));
  }, []);

  useEffect(() => {
    const loadConfirmed = async () => {
      try {
        const bal = await apiClient.get('chemistry/balances/');
        const items = bal.data?.items || [];
        if (items.length) {
          setChemistryElements(items.map((b) => ({
            id: b.chemistry_id ?? b.element_id ?? b.id,
            name: b.element_name ?? b.chemistry_name ?? b.name ?? '—',
            unit: b.unit ?? 'кг',
          })));
          return;
        }
      } catch (_) { /* no balances */ }
      try {
        const res = await apiClient.get('chemistry/tasks/', { params: { page_size: 500 } });
        const tasks = (res.data?.items || []).filter((t) =>
          t.status === 'done' || t.status === 'completed' || t.status === 'ВЫПОЛНЕНО'
        );
        const byId = {};
        tasks.forEach((t) => {
          const comp = t.components || t.elements || [];
          if (comp.length) {
            comp.forEach((c) => {
              const id = c.chemistry_id ?? c.element_id ?? c.id ?? t.chemistry;
              if (id) byId[id] = { id, name: c.element_name ?? c.name ?? t.chemistry_name ?? '—', unit: c.unit ?? t.unit ?? 'кг' };
            });
          } else {
            const id = t.chemistry?.id ?? t.chemistry;
            if (id) byId[id] = { id, name: t.chemistry?.name ?? t.chemistry_name ?? '—', unit: t.unit ?? 'кг' };
          }
        });
        setChemistryElements(Object.values(byId));
      } catch (_) {
        apiClient.get('chemistry/elements/', { params: { page_size: 500 } })
          .then((r) => setChemistryElements(r.data?.items || []))
          .catch(() => setChemistryElements([]));
      }
    };
    loadConfirmed();
  }, []);

  const items = compType === TYPE_RAW ? rawMaterials : chemistryElements;

  const addComponent = () => {
    const id = Number(selectedId);
    if (!id || !quantity) return;
    const item = items.find((i) => i.id === id);
    setComponents((prev) => [...prev, {
      type: compType,
      id,
      name: item?.name || '—',
      quantity: Number(quantity),
      unit: unit || 'кг',
    }]);
    setQuantity('');
  };

  const removeComponent = (idx) => {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = {
      name,
      product: name,
      components: components.map((c) => ({
        type: c.type,
        material_id: c.type === TYPE_RAW ? c.id : undefined,
        chemistry_id: c.type === TYPE_CHEMISTRY ? c.id : undefined,
        element_id: c.type === TYPE_CHEMISTRY ? c.id : undefined,
        quantity: c.quantity,
        unit: c.unit || 'кг',
      })),
    };
    onSubmit(body);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>{isEdit ? 'Редактировать' : 'Создать'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Рецепт</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Название"
          />
          <label>Состав</label>
          <div className="recipe-modal__row">
            <select value={compType} onChange={(e) => { setCompType(e.target.value); setSelectedId(''); }}>
              <option value={TYPE_RAW}>Сырьё (из Склада сырья)</option>
              <option value={TYPE_CHEMISTRY}>Хим. элемент (из остатков)</option>
            </select>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— Выберите —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.unit || 'кг'})</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Кол-во"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="recipe-modal__qty"
            />
            <input
              placeholder="ед."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="recipe-modal__unit"
            />
            <button type="button" className="btn btn--secondary" onClick={addComponent}>
              Добавить
            </button>
          </div>
          {components.length > 0 && (
            <div className="recipe-modal__table">
              <div className="recipe-modal__table-header">
                <span>ТИП</span>
                <span>НАИМЕНОВАНИЕ</span>
                <span>КОЛ-ВО</span>
                <span></span>
              </div>
              {components.map((c, i) => (
                <div key={i} className="recipe-modal__table-row">
                  <span>{c.type === TYPE_RAW ? 'Сырьё' : 'Хим. элемент'}</span>
                  <span>{c.name}</span>
                  <span>{c.quantity} {c.unit}</span>
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => removeComponent(i)}>×</button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary">{isEdit ? 'Сохранить' : 'Создать'}</button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipesPage;
