import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Settings as SettingsIcon, X } from 'lucide-react';
import { api } from '../api/client';
import type { Property, EntityType, FieldType } from '../types';
import Modal from '../components/Modal';

const ENTITY_TABS: { key: EntityType; label: string }[] = [
  { key: 'contact', label: 'Contact Properties' },
  { key: 'company', label: 'Company Properties' },
  { key: 'deal', label: 'Deal Properties' },
];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select (dropdown)' },
];

function PropertyForm({
  property,
  entityType,
  onSave,
  onClose,
}: {
  property?: Property;
  entityType: EntityType;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: property?.name ?? '',
    field_key: property?.field_key ?? '',
    field_type: (property?.field_type ?? 'text') as FieldType,
    entity_type: entityType,
    required: property?.required ?? false,
    options: property?.options ?? [],
  });
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving] = useState(false);

  const autoKey = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      field_key: property ? f.field_key : autoKey(name),
    }));
  };

  const addOption = () => {
    const val = newOption.trim();
    if (!val || form.options.includes(val)) return;
    setForm((f) => ({ ...f, options: [...f.options, val] }));
    setNewOption('');
  };

  const removeOption = (opt: string) => {
    setForm((f) => ({ ...f, options: f.options.filter((o) => o !== opt) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (property) {
        await api.properties.update(property.id, {
          name: form.name,
          field_type: form.field_type,
          required: form.required,
          options: form.options,
        });
      } else {
        await api.properties.create(form);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Property Name *</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="e.g. LinkedIn URL"
          autoFocus
        />
      </div>
      <div>
        <label className="label">Field Key</label>
        <input
          className="input bg-gray-50 text-gray-500"
          value={form.field_key}
          onChange={(e) =>
            setForm((f) => ({ ...f, field_key: e.target.value.replace(/\s+/g, '_') }))
          }
          required
          placeholder="linkedin_url"
          readOnly={!!property}
        />
        <p className="text-xs text-gray-400 mt-1">
          Used as the storage key. {property ? 'Cannot be changed after creation.' : 'Auto-generated from name.'}
        </p>
      </div>
      <div>
        <label className="label">Field Type *</label>
        <select
          className="input"
          value={form.field_type}
          onChange={(e) =>
            setForm((f) => ({ ...f, field_type: e.target.value as FieldType, options: [] }))
          }
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {form.field_type === 'select' && (
        <div>
          <label className="label">Options</label>
          <div className="flex gap-2 mb-2">
            <input
              className="input"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOption();
                }
              }}
              placeholder="Add an option…"
            />
            <button
              type="button"
              onClick={addOption}
              className="btn-secondary flex-shrink-0"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.options.map((opt) => (
              <span
                key={opt}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm text-gray-700"
              >
                {opt}
                <button
                  type="button"
                  onClick={() => removeOption(opt)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {form.options.length === 0 && (
              <p className="text-xs text-gray-400">No options added yet.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          id="required"
          type="checkbox"
          checked={form.required}
          onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="required" className="text-sm text-gray-700 cursor-pointer">
          Required field
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : property ? 'Update Property' : 'Add Property'}
        </button>
      </div>
    </form>
  );
}

function PropertyRow({
  property,
  onEdit,
  onDelete,
}: {
  property: Property;
  onEdit: (p: Property) => void;
  onDelete: (p: Property) => void;
}) {
  const typeLabel = FIELD_TYPES.find((t) => t.value === property.field_type)?.label ?? property.field_type;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900">{property.name}</p>
          <p className="text-xs text-gray-400 font-mono">{property.field_key}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          {typeLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {property.field_type === 'select' && property.options && property.options.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {property.options.map((o) => (
              <span key={o} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                {o}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {property.required ? (
          <span className="text-xs text-red-600 font-medium">Required</span>
        ) : (
          <span className="text-xs text-gray-400">Optional</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onEdit(property)}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors hover:bg-blue-50"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(property)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<EntityType>('contact');
  const [properties, setProperties] = useState<Property[]>([]);
  const [modal, setModal] = useState<{ open: boolean; property?: Property }>({ open: false });

  const load = async () => {
    const data = await api.properties.list();
    setProperties(data);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = properties.filter((p) => p.entity_type === activeTab);

  const handleDelete = async (p: Property) => {
    if (!confirm(`Delete property "${p.name}"? This may affect existing records.`)) return;
    await api.properties.delete(p.id);
    load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon size={24} className="text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage custom properties for your CRM entities</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {ENTITY_TABS.map((tab) => {
          const count = properties.filter((p) => p.entity_type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModal({ open: true })}
          className="btn-primary"
        >
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <SettingsIcon size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No custom properties yet</p>
          <p className="text-sm mt-1">
            Add properties to capture more information about your{' '}
            {activeTab === 'contact' ? 'contacts' : activeTab === 'company' ? 'companies' : 'deals'}.
          </p>
          <button onClick={() => setModal({ open: true })} className="btn-primary mt-4">
            <Plus size={16} /> Add Property
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Property</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Options</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Required</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <PropertyRow
                  key={p.id}
                  property={p}
                  onEdit={(p) => setModal({ open: true, property: p })}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <Modal
          title={modal.property ? 'Edit Property' : 'New Property'}
          onClose={() => setModal({ open: false })}
        >
          <PropertyForm
            property={modal.property}
            entityType={activeTab}
            onSave={() => {
              setModal({ open: false });
              load();
            }}
            onClose={() => setModal({ open: false })}
          />
        </Modal>
      )}
    </div>
  );
}
