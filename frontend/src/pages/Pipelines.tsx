import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, GitBranch } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Pipeline } from '../types';
import Modal from '../components/Modal';
import { useNavigate } from 'react-router-dom';

export default function Pipelines() {
  const { isAdmin } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [editModal, setEditModal] = useState<{ open: boolean; pipeline?: Pipeline }>({
    open: false,
  });
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const data = await api.pipelines.list();
    setPipelines(data);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({ name: '' });
    setEditModal({ open: true });
  };

  const openEdit = (p: Pipeline) => {
    setForm({ name: p.name });
    setEditModal({ open: true, pipeline: p });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editModal.pipeline) {
        await api.pipelines.update(editModal.pipeline.id, { name: form.name });
      } else {
        await api.pipelines.create({
          name: form.name,
          stages: [
            { name: 'Lead', color: '#3B82F6' },
            { name: 'Qualified', color: '#10B981' },
            { name: 'Proposal', color: '#F59E0B' },
            { name: 'Won', color: '#10B981' },
          ],
        });
      }
      setEditModal({ open: false });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Pipeline) => {
    if (!confirm(`Delete pipeline "${p.name}"? This will also delete all its deals.`)) return;
    await api.pipelines.delete(p.id);
    load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <p className="text-sm text-gray-500 mt-1">{pipelines.length} pipeline(s)</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New Pipeline
          </button>
        )}
      </div>

      {pipelines.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <GitBranch size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No pipelines yet</p>
          <p className="text-sm mt-1">Create your first pipeline to start tracking deals.</p>
          {isAdmin && (
            <button onClick={openCreate} className="btn-primary mt-4">
              <Plus size={16} /> Create Pipeline
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pipelines.map((p) => {
            const dealCount = p.stages.reduce((sum, s) => sum + s.deals.length, 0);
            const totalValue = p.stages.reduce(
              (sum, s) => sum + s.deals.reduce((ds, d) => ds + (d.value || 0), 0),
              0
            );
            return (
              <div key={p.id} className="card p-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"
                >
                  <GitBranch size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{p.stages.length} stages</span>
                    <span className="text-xs text-gray-500">{dealCount} deals</span>
                    {totalValue > 0 && (
                      <span className="text-xs text-emerald-600 font-medium">
                        ${totalValue.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {/* Stage pills */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {p.stages.map((s) => (
                      <span
                        key={s.id}
                        className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate('/')}
                    className="btn-secondary text-xs"
                  >
                    View Board
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editModal.open && (
        <Modal
          title={editModal.pipeline ? 'Edit Pipeline' : 'New Pipeline'}
          onClose={() => setEditModal({ open: false })}
          size="sm"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Pipeline Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
                required
                autoFocus
                placeholder="e.g. Sales Pipeline"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setEditModal({ open: false })} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editModal.pipeline ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
