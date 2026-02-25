import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search, Building2, Mail, Phone } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Contact, Company, Property } from '../types';
import Modal from '../components/Modal';

function ContactForm({
  contact,
  companies,
  properties,
  onSave,
  onClose,
}: {
  contact?: Contact;
  companies: Company[];
  properties: Property[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    title: contact?.title ?? '',
    company_id: contact?.company_id ?? '',
    ...Object.fromEntries(
      properties.map((p) => [
        p.field_key,
        String((contact?.custom_fields?.[p.field_key] as string) ?? ''),
      ])
    ),
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const custom_fields: Record<string, string> = {};
      properties.forEach((p) => {
        if (form[p.field_key]) custom_fields[p.field_key] = form[p.field_key];
      });
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        title: form.title || undefined,
        company_id: form.company_id || undefined,
        custom_fields,
      };
      if (contact) {
        await api.contacts.update(contact.id, payload);
      } else {
        await api.contacts.create(payload);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Full Name *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            type="tel"
            className="input"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+1 555 000 0000"
          />
        </div>
        <div>
          <label className="label">Job Title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Sales Manager"
          />
        </div>
        <div>
          <label className="label">Company</label>
          <select
            className="input"
            value={form.company_id}
            onChange={(e) => set('company_id', e.target.value)}
          >
            <option value="">— none —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {properties.length > 0 && (
        <>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Custom Properties
            </p>
            <div className="grid grid-cols-2 gap-4">
              {properties.map((p) => (
                <div key={p.id} className={p.field_type === 'select' ? 'col-span-2' : ''}>
                  <label className="label">
                    {p.name}
                    {p.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {p.field_type === 'select' ? (
                    <select
                      className="input"
                      value={form[p.field_key] ?? ''}
                      onChange={(e) => set(p.field_key, e.target.value)}
                      required={p.required}
                    >
                      <option value="">— select —</option>
                      {p.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={
                        p.field_type === 'number'
                          ? 'number'
                          : p.field_type === 'email'
                          ? 'email'
                          : p.field_type === 'date'
                          ? 'date'
                          : p.field_type === 'url'
                          ? 'url'
                          : 'text'
                      }
                      className="input"
                      value={form[p.field_key] ?? ''}
                      onChange={(e) => set(p.field_key, e.target.value)}
                      required={p.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : contact ? 'Update Contact' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}

export default function Contacts() {
  const { user, isAdmin } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; contact?: Contact }>({ open: false });

  const load = async () => {
    const [c, co, props] = await Promise.all([
      api.contacts.list(),
      api.companies.list(),
      api.properties.list('contact'),
    ]);
    setContacts(c);
    setCompanies(co);
    setProperties(props);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (c: Contact) => {
    if (!confirm(`Delete contact "${c.name}"?`)) return;
    await api.contacts.delete(c.id);
    load();
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-500 mt-1">{contacts.length} contact(s)</p>
          </div>
          <button onClick={() => setModal({ open: true })} className="btn-primary">
            <Plus size={16} /> New Contact
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {contacts.length === 0 ? 'No contacts yet' : 'No matches found'}
            </p>
            {contacts.length === 0 && (
              <button
                onClick={() => setModal({ open: true })}
                className="btn-primary mt-4"
              >
                <Plus size={16} /> Add Contact
              </button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Company</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Title</th>
                  {properties.slice(0, 2).map((p) => (
                    <th key={p.id} className="text-left px-4 py-3 font-semibold text-gray-700">
                      {p.name}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-semibold text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.email ? (
                        <div className="flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" />
                          {c.email}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          {c.phone}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.company ? (
                        <div className="flex items-center gap-1">
                          <Building2 size={12} className="text-gray-400" />
                          {c.company.name}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.title || <span className="text-gray-300">—</span>}
                    </td>
                    {properties.slice(0, 2).map((p) => (
                      <td key={p.id} className="px-4 py-3 text-gray-600">
                        {String(c.custom_fields?.[p.field_key] ?? '') || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      {(isAdmin || c.created_by === user?.id) && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setModal({ open: true, contact: c })}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors hover:bg-blue-50"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && (
        <Modal
          title={modal.contact ? 'Edit Contact' : 'New Contact'}
          onClose={() => setModal({ open: false })}
          size="lg"
        >
          <ContactForm
            contact={modal.contact}
            companies={companies}
            properties={properties}
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
