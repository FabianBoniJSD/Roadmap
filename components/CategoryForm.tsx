import React, { useState } from 'react';
import { Category } from '../types';
import { clientDataService } from '../utils/clientDataService';
import IconPicker from './IconPicker';
import ColorPicker from './ColorPicker';

interface CategoryFormProps {
  category?: Category;
  onSave: () => void;
  onCancel: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onSave, onCancel }) => {
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || '#4299e1');
  const [icon, setIcon] = useState(category?.icon || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Bitte einen Kategorienamen eingeben.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (category?.id) {
        // Update existing category
        await clientDataService.updateCategory(category.id, {
          name,
          color,
          icon,
        });
      } else {
        // Create new category
        await clientDataService.createCategory({
          name,
          color,
          icon,
        });
      }

      onSave();
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Kategorie konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold text-white">
        {category ? 'Kategorie bearbeiten' : 'Neue Kategorie anlegen'}
      </h2>

      {error && (
        <div className="rounded-2xl border border-rose-500/50 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-slate-200">Kategoriename</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
          placeholder="Bezeichnung der Kategorie"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-200">Farbe</label>
        <div className="mt-2">
          <ColorPicker value={color} onChange={setColor} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-200">Icon</label>
        <div className="mt-2">
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
          disabled={isSubmitting}
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Speichern …' : 'Kategorie speichern'}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
