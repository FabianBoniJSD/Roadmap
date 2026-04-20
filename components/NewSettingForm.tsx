import React, { useState } from 'react';
import { clientDataService } from '@/utils/clientDataService';
import RichTextEditor from '@/components/RichTextEditor';
import { normalizeRichTextEditorValue, sanitizeRichTextHtml } from '@/utils/richText';

interface NewSettingFormProps {
  onSettingCreated: () => void;
}

const NewSettingForm: React.FC<NewSettingFormProps> = ({ onSettingCreated }) => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState(() => normalizeRichTextEditorValue(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key || !value) {
      setError('Key and value are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await clientDataService.createSetting({
        key,
        value,
        description: sanitizeRichTextHtml(description),
      });

      // Reset form
      setKey('');
      setValue('');
      setDescription('');
      setShowForm(false);

      // Notify parent component
      onSettingCreated();
    } catch (err) {
      console.error('Error creating setting:', err);
      setError('Failed to create setting. It might already exist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
        >
          Neue Einstellung
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-xl font-bold mb-4">Neue Einstellung erstellen</h2>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-gray-300 mb-1">Schlüssel</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              placeholder="z.B. roadmapTitle"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Wert</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              placeholder="z.B. IT + Digital Roadmap {year}"
              disabled={isSubmitting}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-300 mb-1">Beschreibung (optional)</label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Beschreibung der Einstellung"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex justify-end mt-4 space-x-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
            disabled={isSubmitting}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewSettingForm;
