import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  User,
  Building2,
  Check,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { api } from '../api/client';
import type { Pipeline, PipelineStage, Deal, Contact, Company } from '../types';
import Modal from '../components/Modal';

// ── HubSpot-style Deal Card ────────────────────────────────────────────────────
function DealCard({
  deal,
  onEdit,
  onDelete,
  isDragging,
}: {
  deal: Deal;
  onEdit: (d: Deal) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg group transition-shadow ${
        isDragging ? 'opacity-40 shadow-2xl scale-105' : 'hover:shadow-md hover:border-gray-300'
      }`}
      style={{ cursor: isDragging ? 'grabbing' : undefined }}
    >
      {/* Card top accent — uses stage color via CSS var injected by parent */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => onEdit(deal)}
            className="text-sm font-semibold text-gray-900 text-left hover:text-blue-700 leading-snug flex-1"
          >
            {deal.title}
          </button>

          {/* Kebab menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32 text-sm">
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(deal); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(deal.id); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        {deal.value > 0 && (
          <p className="mt-1 text-base font-bold text-gray-900">
            ${deal.value.toLocaleString()}
          </p>
        )}

        {/* Associations */}
        <div className="mt-2.5 flex flex-col gap-1.5">
          {deal.company && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-4 h-4 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Building2 size={10} className="text-purple-600" />
              </div>
              <span className="truncate font-medium text-gray-700">{deal.company.name}</span>
            </div>
          )}
          {deal.contact && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User size={10} className="text-blue-600" />
              </div>
              <span className="truncate text-gray-600">{deal.contact.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sortable Deal Card ────────────────────────────────────────────────────────
function SortableDealCard({
  deal,
  onEdit,
  onDelete,
}: {
  deal: Deal;
  onEdit: (d: Deal) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: 'deal', deal },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <DealCard deal={deal} onEdit={onEdit} onDelete={onDelete} isDragging={isDragging} />
    </div>
  );
}

// ── HubSpot-style Stage Column ─────────────────────────────────────────────────
function StageColumn({
  stage,
  onAddDeal,
  onEditDeal,
  onDeleteDeal,
  onEditStage,
  onDeleteStage,
}: {
  stage: PipelineStage;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (d: Deal) => void;
  onDeleteDeal: (id: string) => void;
  onEditStage: (s: PipelineStage) => void;
  onDeleteStage: (s: PipelineStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    data: { type: 'stage', stage },
  });

  const totalValue = stage.deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const dealCount = stage.deals.length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex-shrink-0 w-64 flex flex-col ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* Stage header — HubSpot style with colored top bar */}
      <div className="bg-white rounded-t-xl overflow-hidden border border-gray-200 border-b-0">
        {/* Colored top accent bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: stage.color }} />

        <div className="px-3 py-2.5">
          {/* Stage name row */}
          <div className="flex items-center gap-1.5">
            <button
              {...attributes}
              {...listeners}
              className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 -ml-0.5"
            >
              <GripVertical size={14} />
            </button>
            <span
              className="text-xs font-semibold uppercase tracking-wide flex-1 truncate"
              style={{ color: stage.color }}
            >
              {stage.name}
            </span>
            <button
              onClick={() => onEditStage(stage)}
              className="p-1 text-gray-300 hover:text-gray-600 rounded transition-colors"
              title="Edit stage"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDeleteStage(stage)}
              className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
              title="Delete stage"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-gray-500">
              {dealCount} deal{dealCount !== 1 ? 's' : ''}
            </span>
            {totalValue > 0 && (
              <span className="text-xs font-semibold text-gray-800">
                ${totalValue.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Deal cards area */}
      <SortableContext items={stage.deals.map((d) => d.id)}>
        <div
          className="flex-1 border-x border-gray-200 bg-gray-50/60 p-2 space-y-2 overflow-y-auto"
          style={{ minHeight: 200, maxHeight: 'calc(100vh - 280px)' }}
        >
          {stage.deals.length === 0 && (
            <div className="flex flex-col items-center justify-center h-16 text-gray-300 text-xs">
              Drop deals here
            </div>
          )}
          {stage.deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              onEdit={onEditDeal}
              onDelete={onDeleteDeal}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add deal footer */}
      <button
        onClick={() => onAddDeal(stage.id)}
        className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-gray-500 hover:text-blue-600 bg-white border border-gray-200 border-t-0 rounded-b-xl hover:bg-blue-50 transition-colors w-full"
      >
        <Plus size={13} />
        Add deal
      </button>
    </div>
  );
}

// ── Deal Form ─────────────────────────────────────────────────────────────────
function DealForm({
  deal,
  stageId,
  pipelineId,
  contacts,
  companies,
  onSave,
  onClose,
}: {
  deal?: Deal;
  stageId: string;
  pipelineId: string;
  contacts: Contact[];
  companies: Company[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: deal?.title ?? '',
    value: deal?.value ?? 0,
    contact_id: deal?.contact_id ?? '',
    company_id: deal?.company_id ?? '',
    stage_id: deal?.stage_id ?? stageId,
    pipeline_id: pipelineId,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        contact_id: form.contact_id || undefined,
        company_id: form.company_id || undefined,
      };
      if (deal) {
        await api.deals.update(deal.id, payload);
      } else {
        await api.deals.create(payload);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Deal Name *</label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          autoFocus
          placeholder="e.g. Enterprise contract Q4"
        />
      </div>
      <div>
        <label className="label">Amount ($)</label>
        <input
          type="number"
          min={0}
          className="input"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
          placeholder="0"
        />
      </div>
      <div>
        <label className="label">Associated Contact</label>
        <select
          className="input"
          value={form.contact_id}
          onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
        >
          <option value="">— No contact —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.company ? ` · ${c.company.name}` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Associated Company</label>
        <select
          className="input"
          value={form.company_id}
          onChange={(e) => setForm({ ...form, company_id: e.target.value })}
        >
          <option value="">— No company —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.industry ? ` · ${c.industry}` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : deal ? 'Update Deal' : 'Create Deal'}
        </button>
      </div>
    </form>
  );
}

// ── Stage Form ─────────────────────────────────────────────────────────────────
const STAGE_COLORS = [
  '#0091AE', '#00BDA5', '#6A78D1', '#F2547D',
  '#FF7A59', '#F5C26B', '#99ACC2', '#516F90',
];

function StageForm({
  stage,
  pipelineId,
  onSave,
  onClose,
}: {
  stage?: PipelineStage;
  pipelineId: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(stage?.name ?? '');
  const [color, setColor] = useState(stage?.color ?? STAGE_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (stage) {
        await api.stages.update(stage.id, { name, color });
      } else {
        await api.stages.create(pipelineId, { name, color });
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Stage Name *</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="e.g. Proposal Sent"
        />
      </div>
      <div>
        <label className="label">Stage Color</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {STAGE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="w-8 h-8 rounded-full border-4 transition-transform hover:scale-110 flex items-center justify-center"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#1e2a3b' : 'transparent',
                boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
              }}
              onClick={() => setColor(c)}
            >
              {color === c && <Check size={14} className="text-white" />}
            </button>
          ))}
        </div>
        {/* Preview */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 w-16 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs text-gray-500">Preview color</span>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : stage ? 'Update Stage' : 'Add Stage'}
        </button>
      </div>
    </form>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>('');
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pipelineDropdown, setPipelineDropdown] = useState(false);

  const [, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'deal' | 'stage' | null>(null);
  const [activeDragData, setActiveDragData] = useState<Deal | PipelineStage | null>(null);

  const [dealModal, setDealModal] = useState<{ open: boolean; stageId: string; deal?: Deal }>({
    open: false,
    stageId: '',
  });
  const [stageModal, setStageModal] = useState<{ open: boolean; stage?: PipelineStage }>({
    open: false,
  });
  const [newPipelineModal, setNewPipelineModal] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadPipelines = useCallback(async () => {
    const data = await api.pipelines.list();
    setPipelines(data);
    if (data.length > 0 && !activePipelineId) {
      setActivePipelineId(data[0].id);
    }
  }, [activePipelineId]);

  const loadPipeline = useCallback(async (id: string) => {
    if (!id) return;
    const data = await api.pipelines.get(id);
    setPipeline(data);
  }, []);

  useEffect(() => {
    loadPipelines();
    api.contacts.list().then(setContacts);
    api.companies.list().then(setCompanies);
  }, []);

  useEffect(() => {
    if (activePipelineId) loadPipeline(activePipelineId);
  }, [activePipelineId, loadPipeline]);

  const refresh = () => {
    if (activePipelineId) loadPipeline(activePipelineId);
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    setActiveDragId(active.id as string);
    if (data?.type === 'deal') {
      setActiveDragType('deal');
      setActiveDragData(data.deal);
    } else if (data?.type === 'stage') {
      setActiveDragType('stage');
      setActiveDragData(data.stage);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !pipeline) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== 'deal') return;

    const activeDeal: Deal = activeData.deal;

    let targetStageId: string | null = null;
    if (overData?.type === 'deal') {
      targetStageId = overData.deal.stage_id;
    } else if (overData?.type === 'stage') {
      targetStageId = overData.stage.id;
    } else {
      targetStageId = over.id as string;
    }

    if (!targetStageId || activeDeal.stage_id === targetStageId) return;

    setPipeline((prev) => {
      if (!prev) return prev;
      const newStages = prev.stages.map((s) => {
        if (s.id === activeDeal.stage_id) {
          return { ...s, deals: s.deals.filter((d) => d.id !== activeDeal.id) };
        }
        if (s.id === targetStageId) {
          return { ...s, deals: [...s.deals, { ...activeDeal, stage_id: targetStageId! }] };
        }
        return s;
      });
      return { ...prev, stages: newStages };
    });

    setActiveDragData((prev) =>
      prev && 'stage_id' in prev ? { ...prev, stage_id: targetStageId! } : prev
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragType(null);
    setActiveDragData(null);

    if (!over || !pipeline) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'stage' && overData?.type === 'stage') {
      const oldIndex = pipeline.stages.findIndex((s) => s.id === active.id);
      const newIndex = pipeline.stages.findIndex((s) => s.id === over.id);
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(pipeline.stages, oldIndex, newIndex).map((s, i) => ({
          ...s,
          order: i,
        }));
        setPipeline({ ...pipeline, stages: reordered });
        await api.stages.reorder(reordered.map((s) => ({ id: s.id, order: s.order })));
      }
      return;
    }

    if (activeData?.type === 'deal') {
      const deal: Deal = activeData.deal;
      const currentStage = pipeline.stages.find((s) => s.deals.some((d) => d.id === deal.id));
      if (currentStage && currentStage.id !== deal.stage_id) {
        await api.deals.update(deal.id, { stage_id: currentStage.id });
      } else {
        let targetStageId: string | null = null;
        if (overData?.type === 'deal') targetStageId = overData.deal.stage_id;
        else if (overData?.type === 'stage') targetStageId = overData.stage.id;
        if (targetStageId && targetStageId !== deal.stage_id) {
          await api.deals.update(deal.id, { stage_id: targetStageId });
          refresh();
        }
      }
    }
  };

  const handleDeleteDeal = async (id: string) => {
    if (!confirm('Delete this deal?')) return;
    await api.deals.delete(id);
    refresh();
  };

  const handleDeleteStage = async (stage: PipelineStage) => {
    if (stage.deals.length > 0) {
      alert('Move or delete all deals in this stage first.');
      return;
    }
    if (!confirm(`Delete stage "${stage.name}"?`)) return;
    await api.stages.delete(stage.id);
    refresh();
  };

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = await api.pipelines.create({
      name: newPipelineName,
      stages: [
        { name: 'Appointment Scheduled', color: '#0091AE' },
        { name: 'Qualified to Buy', color: '#00BDA5' },
        { name: 'Presentation Scheduled', color: '#6A78D1' },
        { name: 'Decision Maker Bought-In', color: '#F2547D' },
        { name: 'Contract Sent', color: '#FF7A59' },
        { name: 'Closed Won', color: '#00BDA5' },
      ],
    });
    setNewPipelineName('');
    setNewPipelineModal(false);
    await loadPipelines();
    setActivePipelineId(p.id);
  };

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const totalDeals = pipeline?.stages.reduce((sum, s) => sum + s.deals.length, 0) ?? 0;
  const totalValue = pipeline?.stages.reduce(
    (sum, s) => sum + s.deals.reduce((ds, d) => ds + (d.value || 0), 0),
    0
  ) ?? 0;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── HubSpot-style top bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 pt-4 pb-0">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Deals</h1>

            {/* Pipeline selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setPipelineDropdown((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors bg-white"
              >
                <span className="font-medium">
                  {activePipeline?.name ?? 'Select pipeline'}
                </span>
                <ChevronDown size={14} />
              </button>
              {pipelineDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setPipelineDropdown(false)}
                  />
                  <div className="absolute left-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-56 text-sm">
                    {pipelines.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setActivePipelineId(p.id);
                          setPipelineDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between ${
                          p.id === activePipelineId ? 'text-blue-700 font-semibold' : 'text-gray-700'
                        }`}
                      >
                        {p.name}
                        {p.id === activePipelineId && <Check size={14} />}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setPipelineDropdown(false);
                          setNewPipelineModal(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 flex items-center gap-2"
                      >
                        <Plus size={14} /> New pipeline
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {pipeline && (
              <>
                <span className="text-sm text-gray-500 mr-2">
                  <span className="font-semibold text-gray-900">{totalDeals}</span> deals ·{' '}
                  <span className="font-semibold text-gray-900">${totalValue.toLocaleString()}</span>
                </span>
                <button
                  onClick={() => setStageModal({ open: true })}
                  className="btn-secondary text-xs py-1.5"
                >
                  <Plus size={13} /> Add stage
                </button>
              </>
            )}
            <button
              onClick={() => setNewPipelineModal(true)}
              className="btn-primary text-xs py-1.5"
            >
              <Plus size={13} /> Create deal
            </button>
          </div>
        </div>

        {/* Pipeline stage tabs — HubSpot shows a thin colored strip per stage at the header */}
        {pipeline && (
          <div className="flex gap-0 overflow-x-auto">
            {pipeline.stages.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap"
                style={{ borderBottomColor: s.color, color: s.color }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
                <span className="ml-1 text-xs opacity-70">({s.deals.length})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Kanban board ── */}
      <div className="flex-1 overflow-x-auto p-6">
        {!pipeline ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <div className="text-5xl mb-2">📊</div>
            <p className="text-lg font-medium text-gray-600">
              {pipelines.length === 0
                ? 'Create your first pipeline'
                : 'Select a pipeline above'}
            </p>
            <p className="text-sm text-gray-400">
              Track deals through stages from prospect to close.
            </p>
            {pipelines.length === 0 && (
              <button onClick={() => setNewPipelineModal(true)} className="btn-primary mt-2">
                <Plus size={16} /> Create Pipeline
              </button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pipeline.stages.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-4 h-full items-start pb-6">
                {pipeline.stages.map((stage) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    onAddDeal={(stageId) => setDealModal({ open: true, stageId })}
                    onEditDeal={(deal) =>
                      setDealModal({ open: true, stageId: deal.stage_id, deal })
                    }
                    onDeleteDeal={handleDeleteDeal}
                    onEditStage={(s) => setStageModal({ open: true, stage: s })}
                    onDeleteStage={handleDeleteStage}
                  />
                ))}

                {/* Add stage button inline */}
                <button
                  onClick={() => setStageModal({ open: true })}
                  className="flex-shrink-0 w-48 h-16 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 mt-6"
                >
                  <Plus size={16} /> Add Stage
                </button>
              </div>
            </SortableContext>

            <DragOverlay>
              {activeDragType === 'deal' && activeDragData && 'title' in activeDragData && (
                <div className="rotate-1 shadow-2xl w-64">
                  <DealCard
                    deal={activeDragData as Deal}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Deal modal */}
      {dealModal.open && pipeline && (
        <Modal
          title={dealModal.deal ? 'Edit Deal' : 'Create Deal'}
          onClose={() => setDealModal({ open: false, stageId: '' })}
        >
          <DealForm
            deal={dealModal.deal}
            stageId={dealModal.stageId}
            pipelineId={pipeline.id}
            contacts={contacts}
            companies={companies}
            onSave={() => {
              setDealModal({ open: false, stageId: '' });
              refresh();
            }}
            onClose={() => setDealModal({ open: false, stageId: '' })}
          />
        </Modal>
      )}

      {/* Stage modal */}
      {stageModal.open && pipeline && (
        <Modal
          title={stageModal.stage ? 'Edit Stage' : 'Add Stage'}
          onClose={() => setStageModal({ open: false })}
          size="sm"
        >
          <StageForm
            stage={stageModal.stage}
            pipelineId={pipeline.id}
            onSave={() => {
              setStageModal({ open: false });
              refresh();
            }}
            onClose={() => setStageModal({ open: false })}
          />
        </Modal>
      )}

      {/* New pipeline modal */}
      {newPipelineModal && (
        <Modal
          title="Create Pipeline"
          onClose={() => setNewPipelineModal(false)}
          size="sm"
        >
          <form onSubmit={handleCreatePipeline} className="space-y-4">
            <div>
              <label className="label">Pipeline Name *</label>
              <input
                className="input"
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. Sales Pipeline"
              />
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              A default set of HubSpot-style stages will be created. You can rename, reorder, or add stages afterwards.
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setNewPipelineModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Pipeline
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
