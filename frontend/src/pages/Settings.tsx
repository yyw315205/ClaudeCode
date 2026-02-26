import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Settings as SettingsIcon, X, Users, Shield } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Property, EntityType, FieldType, PropertySection, User } from '../types';
import Modal from '../components/Modal';
import { Navigate } from 'react-router-dom';

// ─────────────────────────── PROPERTIES TAB ───────────────────────────────────

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
  property, entityType, onSave, onClose,
}: {
  property?: Property; entityType: EntityType; onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: property?.name ?? '',
    field_key: property?.field_key ?? '',
    field_type: (property?.field_type ?? 'text') as FieldType,
    entity_type: entityType,
    required: property?.required ?? false,
    options: property?.options ?? [],
    section: (property?.section ?? 'details') as PropertySection,
  });
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving] = useState(false);

  const autoKey = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, field_key: property ? f.field_key : autoKey(name) }));
  };

  const addOption = () => {
    const val = newOption.trim();
    if (!val || form.options.includes(val)) return;
    setForm((f) => ({ ...f, options: [...f.options, val] }));
    setNewOption('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (property) {
        await api.properties.update(property.id, {
          name: form.name, field_type: form.field_type,
          required: form.required, options: form.options, section: form.section,
        });
      } else {
        await api.properties.create(form);
      }
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Property Name *</label>
        <input className="input" value={form.name} onChange={(e) => handleNameChange(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">Field Key</label>
        <input className="input bg-gray-50 text-gray-500" value={form.field_key}
          onChange={(e) => setForm((f) => ({ ...f, field_key: e.target.value.replace(/\s+/g, '_') }))}
          required readOnly={!!property} />
        <p className="text-xs text-gray-400 mt-1">{property ? 'Cannot be changed after creation.' : 'Auto-generated from name.'}</p>
      </div>
      <div>
        <label className="label">Field Type *</label>
        <select className="input" value={form.field_type}
          onChange={(e) => setForm((f) => ({ ...f, field_type: e.target.value as FieldType, options: [] }))}>
          {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Section toggle — only relevant for deal properties */}
      {entityType === 'deal' && (
        <div>
          <label className="label">Display Section</label>
          <div className="flex gap-3 mt-1">
            {(['summary', 'details'] as PropertySection[]).map((s) => (
              <label key={s} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                form.section === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" className="sr-only" value={s} checked={form.section === s}
                  onChange={() => setForm((f) => ({ ...f, section: s }))} />
                <span className="text-sm font-medium capitalize">{s}</span>
                <span className="text-xs text-gray-500">
                  {s === 'summary' ? '— visible in quick form' : '— in "More Details" drawer'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {form.field_type === 'select' && (
        <div>
          <label className="label">Options</label>
          <div className="flex gap-2 mb-2">
            <input className="input" value={newOption} onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
              placeholder="Add an option…" />
            <button type="button" onClick={addOption} className="btn-secondary flex-shrink-0">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.options.map((opt) => (
              <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm text-gray-700">
                {opt}
                <button type="button" onClick={() => setForm((f) => ({ ...f, options: f.options.filter((o) => o !== opt) }))} className="text-gray-400 hover:text-gray-700">
                  <X size={12} />
                </button>
              </span>
            ))}
            {form.options.length === 0 && <p className="text-xs text-gray-400">No options added yet.</p>}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input id="required" type="checkbox" checked={form.required}
          onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))} className="rounded" />
        <label htmlFor="required" className="text-sm text-gray-700 cursor-pointer">Required field</label>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : property ? 'Update Property' : 'Add Property'}
        </button>
      </div>
    </form>
  );
}

function PropertiesTab() {
  const [activeEntity, setActiveEntity] = useState<EntityType>('contact');
  const [properties, setProperties] = useState<Property[]>([]);
  const [modal, setModal] = useState<{ open: boolean; property?: Property }>({ open: false });

  const load = async () => { setProperties(await api.properties.list()); };
  useEffect(() => { load(); }, []);

  const filtered = properties.filter((p) => p.entity_type === activeEntity);

  const handleDelete = async (p: Property) => {
    if (!confirm(`Delete property "${p.name}"?`)) return;
    await api.properties.delete(p.id);
    load();
  };

  const FIELD_TYPE_LABELS: Record<string, string> = Object.fromEntries(FIELD_TYPES.map(t => [t.value, t.label]));

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6">
        {ENTITY_TABS.map((tab) => {
          const count = properties.filter((p) => p.entity_type === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActiveEntity(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeEntity === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}>
              {tab.label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeEntity === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setModal({ open: true })} className="btn-primary">
          <Plus size={16} /> Add Property
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <SettingsIcon size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No custom properties yet</p>
          <button onClick={() => setModal({ open: true })} className="btn-primary mt-4"><Plus size={16} /> Add Property</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Property</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                {activeEntity === 'deal' && <th className="text-left px-4 py-3 font-semibold text-gray-700">Section</th>}
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Options</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Required</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.field_key}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {FIELD_TYPE_LABELS[p.field_type] ?? p.field_type}
                    </span>
                  </td>
                  {activeEntity === 'deal' && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.section === 'summary' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.section ?? 'details'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.field_type === 'select' && p.options?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {p.options.map((o) => <span key={o} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{o}</span>)}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.required ? <span className="text-xs text-red-600 font-medium">Required</span> : <span className="text-xs text-gray-400">Optional</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal({ open: true, property: p })} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors hover:bg-blue-50"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <Modal title={modal.property ? 'Edit Property' : 'New Property'} onClose={() => setModal({ open: false })}>
          <PropertyForm property={modal.property} entityType={activeEntity}
            onSave={() => { setModal({ open: false }); load(); }}
            onClose={() => setModal({ open: false })} />
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────── USERS TAB ────────────────────────────────────────

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<{ open: boolean; user?: User }>({ open: false });
  const [form, setForm] = useState({ username: '', password: '', role: 'member' });
  const [saving, setSaving] = useState(false);
  const [pwdModal, setPwdModal] = useState<{ open: boolean; userId: string; username: string } | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [renameModal, setRenameModal] = useState<{ open: boolean; userId: string; username: string } | null>(null);
  const [newUsername, setNewUsername] = useState('');

  const load = async () => { setUsers(await api.users.list()); };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.users.create(form);
      setModal({ open: false });
      setForm({ username: '', password: '', role: 'member' });
      load();
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (u: User) => {
    if (u.id === currentUser?.id) return;
    await api.users.update(u.id, { is_active: !u.is_active });
    load();
  };

  const handleResetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdModal) return;
    setSaving(true);
    try {
      await api.users.update(pwdModal.userId, { password: newPwd });
      setPwdModal(null);
      setNewPwd('');
    } finally { setSaving(false); }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModal) return;
    setSaving(true);
    try {
      await api.users.update(renameModal.userId, { username: newUsername });
      setRenameModal(null);
      setNewUsername('');
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (u: User) => {
    if (u.id === currentUser?.id) return;
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    await api.users.delete(u.id);
    load();
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setModal({ open: true })} className="btn-primary"><Plus size={16} /> Add User</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Username</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.username}</span>
                    {u.id === currentUser?.id && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">You</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.role === 'admin' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role === 'admin' && <Shield size={11} />}
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => { setRenameModal({ open: true, userId: u.id, username: u.username }); setNewUsername(u.username); }}
                      className="text-xs px-2 py-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      Rename
                    </button>
                    <button onClick={() => setPwdModal({ open: true, userId: u.id, username: u.username })}
                      className="text-xs px-2 py-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      Reset pwd
                    </button>
                    {u.id !== currentUser?.id && (
                      <>
                        <button onClick={() => handleToggleActive(u)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${u.is_active ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleDelete(u)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      {modal.open && (
        <Modal title="Add User" onClose={() => setModal({ open: false })} size="sm">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Username *</label>
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus />
            </div>
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="member">Member — can create & edit own records</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setModal({ open: false })} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create User'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Rename user modal */}
      {renameModal && (
        <Modal title={`Rename user — ${renameModal.username}`} onClose={() => { setRenameModal(null); setNewUsername(''); }} size="sm">
          <form onSubmit={handleRename} className="space-y-4">
            <div>
              <label className="label">New Username *</label>
              <input className="input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required autoFocus />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => { setRenameModal(null); setNewUsername(''); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Rename'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {pwdModal && (
        <Modal title={`Reset password — ${pwdModal.username}`} onClose={() => { setPwdModal(null); setNewPwd(''); }} size="sm">
          <form onSubmit={handleResetPwd} className="space-y-4">
            <div>
              <label className="label">New Password *</label>
              <input type="password" className="input" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required autoFocus />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => { setPwdModal(null); setNewPwd(''); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Set Password'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────── SETTINGS PAGE ────────────────────────────────────

type SettingsTab = 'properties' | 'users';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('properties');

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon size={24} className="text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Admin-only configuration</p>
        </div>
      </div>

      {/* Top-level tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {([
          { key: 'properties', label: 'Custom Properties', icon: SettingsIcon },
          { key: 'users', label: 'Users', icon: Users },
        ] as { key: SettingsTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'properties' && <PropertiesTab />}
      {activeTab === 'users' && <UsersTab />}
    </div>
  );
}
