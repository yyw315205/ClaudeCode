import { useEffect, useState, useRef } from 'react';
import {
  X, ChevronDown, ChevronUp, Calendar, DollarSign,
  User, Building2, CheckCircle2, XCircle, Circle, Plus,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Deal, Contact, Company, Property, DealStatus, PipelineStage, ContactRef, CompanyRef } from '../types';

const STATUS_CONFIG: Record<DealStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'text-blue-700 bg-blue-50', icon: <Circle size={13} /> },
  won: { label: 'Won', color: 'text-emerald-700 bg-emerald-50', icon: <CheckCircle2 size={13} /> },
  lost: { label: 'Lost', color: 'text-red-700 bg-red-50', icon: <XCircle size={13} /> },
};

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  options,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  options?: string[];
  readOnly?: boolean;
}) {
  if (options) {
    return (
      <div>
        <label className="label">{label}</label>
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={readOnly}>
          <option value="">— select —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className={`input ${readOnly ? 'bg-gray-50 text-gray-500' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
      />
    </div>
  );
}

// ── Linked entity multi-select (contacts or companies) ─────────────────────
function LinkedEntitySelector<T extends ContactRef | CompanyRef>({
  label,
  icon,
  linked,
  all,
  canEdit,
  onAdd,
  onRemove,
  renderItem,
}: {
  label: string;
  icon: React.ReactNode;
  linked: T[];
  all: T[];
  canEdit: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  renderItem?: (item: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const available = all.filter((item) => !linked.some((l) => l.id === item.id));
  const getName = (item: T) => renderItem ? renderItem(item) : item.name;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div>
      <label className="label flex items-center gap-1.5">
        {icon} {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mt-1 min-h-[32px]">
        {linked.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-100"
          >
            {item.name}
            {canEdit && (
              <button
                onClick={() => onRemove(item.id)}
                className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors"
                title={`Remove ${item.name}`}
              >
                <X size={10} />
              </button>
            )}
          </span>
        ))}
        {canEdit && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-400 rounded-full px-2.5 py-1 transition-colors"
            >
              <Plus size={10} /> Add
            </button>
            {open && (
              <div className="absolute top-8 left-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-52 text-sm max-h-44 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="px-3 py-2 text-gray-400 text-xs">No more to add</p>
                ) : (
                  available.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { onAdd(item.id); setOpen(false); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 truncate"
                    >
                      {getName(item)}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        {linked.length === 0 && !canEdit && (
          <span className="text-xs text-gray-400">None</span>
        )}
      </div>
    </div>
  );
}

export default function DealDrawer({
  deal,
  stages,
  contacts,
  companies,
  properties,
  onClose,
  onSaved,
  onDeleted,
}: {
  deal: Deal;
  stages: PipelineStage[];
  contacts: Contact[];
  companies: Company[];
  properties: Property[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const canEdit = isAdmin || deal.created_by === user?.id;

  const [form, setForm] = useState({
    title: deal.title,
    value: String(deal.value),
    stage_id: deal.stage_id,
    status: deal.status,
    close_date: deal.close_date ?? '',
    ...Object.fromEntries(
      properties.map((p) => [p.field_key, String(deal.custom_fields?.[p.field_key] ?? '')])
    ),
  });
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Linked contacts/companies (many-to-many)
  const [linkedContacts, setLinkedContacts] = useState<ContactRef[]>(deal.linked_contacts ?? []);
  const [linkedCompanies, setLinkedCompanies] = useState<CompanyRef[]>(deal.linked_companies ?? []);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  // Sync stage_id when deal prop changes (e.g. after drag-and-drop)
  useEffect(() => {
    setForm((f) => ({ ...f, stage_id: deal.stage_id }));
  }, [deal.stage_id]);

  // Sync linked contacts/companies when deal prop changes
  useEffect(() => {
    setLinkedContacts(deal.linked_contacts ?? []);
    setLinkedCompanies(deal.linked_companies ?? []);
  }, [deal.id]);

  const summaryProps = properties.filter((p) => p.section === 'summary');
  const detailProps = properties.filter((p) => p.section === 'details');

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const custom_fields: Record<string, string> = {};
      properties.forEach((p) => {
        if (form[p.field_key]) custom_fields[p.field_key] = form[p.field_key];
      });
      await api.deals.update(deal.id, {
        title: form.title,
        value: Number(form.value) || 0,
        stage_id: form.stage_id,
        status: form.status as DealStatus,
        close_date: form.close_date || undefined,
        custom_fields,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    if (!confirm(`Delete deal "${deal.title}"?`)) return;
    await api.deals.delete(deal.id);
    onDeleted();
  };

  const handleAddContact = async (contactId: string) => {
    await api.deals.addContact(deal.id, contactId);
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) setLinkedContacts((prev) => [...prev, { id: contact.id, name: contact.name }]);
  };

  const handleRemoveContact = async (contactId: string) => {
    await api.deals.removeContact(deal.id, contactId);
    setLinkedContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  const handleAddCompany = async (companyId: string) => {
    await api.deals.addCompany(deal.id, companyId);
    const company = companies.find((c) => c.id === companyId);
    if (company) setLinkedCompanies((prev) => [...prev, { id: company.id, name: company.name }]);
  };

  const handleRemoveCompany = async (companyId: string) => {
    await api.deals.removeCompany(deal.id, companyId);
    setLinkedCompanies((prev) => prev.filter((c) => c.id !== companyId));
  };

  const currentStage = stages.find((s) => s.id === form.stage_id);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-white shadow-2xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_CONFIG[form.status as DealStatus].color}`}
            >
              {STATUS_CONFIG[form.status as DealStatus].icon}
              {STATUS_CONFIG[form.status as DealStatus].label}
            </span>
            {canEdit ? (
              <input
                className="text-base font-semibold text-gray-900 border-0 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 flex-1 min-w-0"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                onBlur={handleSave}
              />
            ) : (
              <span className="text-base font-semibold text-gray-900 truncate">{form.title}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status + Stage row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                disabled={!canEdit}
              >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="label">Stage</label>
              <select
                className="input"
                value={form.stage_id}
                onChange={(e) => set('stage_id', e.target.value)}
                disabled={!canEdit}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {currentStage && (
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStage.color }} />
                  <span className="text-xs text-gray-500">{currentStage.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Value + Close date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <DollarSign size={13} className="text-gray-400" /> Amount
              </label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                readOnly={!canEdit}
                onBlur={canEdit ? handleSave : undefined}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" /> Close Date
              </label>
              <input
                type="date"
                className="input"
                value={form.close_date}
                onChange={(e) => set('close_date', e.target.value)}
                readOnly={!canEdit}
                onBlur={canEdit ? handleSave : undefined}
              />
            </div>
          </div>

          {/* Contacts (multi) */}
          <LinkedEntitySelector
            label="Contacts"
            icon={<User size={13} className="text-gray-400" />}
            linked={linkedContacts}
            all={contacts}
            canEdit={canEdit}
            onAdd={handleAddContact}
            onRemove={handleRemoveContact}
          />

          {/* Companies (multi) */}
          <LinkedEntitySelector
            label="Companies"
            icon={<Building2 size={13} className="text-gray-400" />}
            linked={linkedCompanies}
            all={companies}
            canEdit={canEdit}
            onAdd={handleAddCompany}
            onRemove={handleRemoveCompany}
          />

          {/* Summary custom properties */}
          {summaryProps.length > 0 && (
            <div className="space-y-4">
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {summaryProps.map((p) => (
                    <div key={p.id} className={p.field_type === 'select' ? 'col-span-2' : ''}>
                      <FieldInput
                        label={p.name + (p.required ? ' *' : '')}
                        value={form[p.field_key] ?? ''}
                        onChange={(v) => set(p.field_key, v)}
                        type={
                          p.field_type === 'number' ? 'number'
                          : p.field_type === 'email' ? 'email'
                          : p.field_type === 'date' ? 'date'
                          : p.field_type === 'url' ? 'url'
                          : 'text'
                        }
                        options={p.field_type === 'select' ? p.options : undefined}
                        readOnly={!canEdit}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* More Details (collapsible) */}
          {detailProps.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setDetailsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              >
                <span>More Details ({detailProps.length} fields)</span>
                {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {detailsOpen && (
                <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-4">
                  {detailProps.map((p) => (
                    <div key={p.id} className={p.field_type === 'select' || p.field_type === 'text' ? 'col-span-2' : ''}>
                      <FieldInput
                        label={p.name + (p.required ? ' *' : '')}
                        value={form[p.field_key] ?? ''}
                        onChange={(v) => set(p.field_key, v)}
                        type={
                          p.field_type === 'number' ? 'number'
                          : p.field_type === 'email' ? 'email'
                          : p.field_type === 'date' ? 'date'
                          : p.field_type === 'url' ? 'url'
                          : 'text'
                        }
                        options={p.field_type === 'select' ? p.options : undefined}
                        readOnly={!canEdit}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ownership note for members */}
          {!canEdit && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              This record was created by someone else. You can view it but not edit it.
            </p>
          )}
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handleDelete}
              className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
            >
              Delete deal
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
