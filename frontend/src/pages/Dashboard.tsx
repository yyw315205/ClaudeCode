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
  DollarSign,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import type { Pipeline, PipelineStage, Deal, Contact, Company } from '../types';
import Modal from '../components/Modal';

// ── Deal Card ─────────────────────────────────────────────────────────────────
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
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm group ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 flex-1 leading-snug">{deal.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(deal)}
            className="p-1 text-gray-400 hover:text-blue-600 rounded"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(deal.id)}
            className="p-1 text-gray-400 hover:text-red-600 rounded"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {deal.value > 0 && (
        <div className="flex items-center gap-1 mt-2 text-emerald-600 text-xs font-medium">
          <DollarSign size={11} />
          {deal.value.toLocaleString()}
        </div>
      )}
      <div className="mt-2 flex flex-col gap-1">
        {deal.contact && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User size={11} className="flex-shrink-0" />
            <span className="truncate">{deal.contact.name}</span>
          </div>
        )}
        {deal.company && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Building2 size={11} className="flex-shrink-0" />
            <span className="truncate">{deal.company.name}</span>
          </div>
        )}
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

// ── Stage Column ──────────────────────────────────────────────────────────────
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

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex-shrink-0 w-72 flex flex-col ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="bg-gray-100 rounded-xl flex flex-col h-full">
        {/* Stage Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
          <button
            {...attributes}
            {...listeners}
            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
          >
            <GripVertical size={14} />
          </button>
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <span className="font-semibold text-gray-800 text-sm flex-1 truncate">{stage.name}</span>
          <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
            {stage.deals.length}
          </span>
          <button
            onClick={() => onEditStage(stage)}
            className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDeleteStage(stage)}
            className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Deals */}
        <SortableContext items={stage.deals.map((d) => d.id)}>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]">
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

        {/* Footer */}
        <div className="p-2 border-t border-gray-200">
          {totalValue > 0 && (
            <p className="text-xs text-gray-500 text-center mb-1.5">
              ${totalValue.toLocaleString()} total
            </p>
          )}
          <button
            onClick={() => onAddDeal(stage.id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Add deal
          </button>
        </div>
      </div>
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
        <label className="label">Deal Title *</label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          placeholder="e.g. Enterprise contract"
        />
      </div>
      <div>
        <label className="label">Value ($)</label>
        <input
          type="number"
          min={0}
          className="input"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="label">Contact</label>
        <select
          className="input"
          value={form.contact_id}
          onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
        >
          <option value="">— none —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Company</label>
        <select
          className="input"
          value={form.company_id}
          onChange={(e) => setForm({ ...form, company_id: e.target.value })}
        >
          <option value="">— none —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : deal ? 'Update Deal' : 'Add Deal'}
        </button>
      </div>
    </form>
  );
}

// ── Stage Form ────────────────────────────────────────────────────────────────
const STAGE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
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
  const [color, setColor] = useState(stage?.color ?? '#3B82F6');
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
          placeholder="e.g. Qualified Lead"
        />
      </div>
      <div>
        <label className="label">Color</label>
        <div className="flex gap-2 flex-wrap">
          {STAGE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#1e40af' : 'transparent',
              }}
              onClick={() => setColor(c)}
            >
              {color === c && <Check size={12} className="text-white" />}
            </button>
          ))}
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>('');
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'deal' | 'stage' | null>(null);
  const [activeDragData, setActiveDragData] = useState<Deal | PipelineStage | null>(null);

  // Modals
  const [dealModal, setDealModal] = useState<{
    open: boolean;
    stageId: string;
    deal?: Deal;
  }>({ open: false, stageId: '' });
  const [stageModal, setStageModal] = useState<{
    open: boolean;
    stage?: PipelineStage;
  }>({ open: false });
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

    // Find the target stage id
    let targetStageId: string | null = null;
    if (overData?.type === 'deal') {
      targetStageId = overData.deal.stage_id;
    } else if (overData?.type === 'stage') {
      targetStageId = overData.stage.id;
    } else {
      // dropped on stage column area
      targetStageId = over.id as string;
    }

    if (!targetStageId || activeDeal.stage_id === targetStageId) return;

    // Optimistically move deal between stages
    setPipeline((prev) => {
      if (!prev) return prev;
      const newStages = prev.stages.map((s) => {
        if (s.id === activeDeal.stage_id) {
          return { ...s, deals: s.deals.filter((d) => d.id !== activeDeal.id) };
        }
        if (s.id === targetStageId) {
          return {
            ...s,
            deals: [...s.deals, { ...activeDeal, stage_id: targetStageId! }],
          };
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

    // Stage reordering
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

    // Deal stage change — persist
    if (activeData?.type === 'deal') {
      const deal: Deal = activeData.deal;
      // Find where the deal currently lives in our optimistic state
      const currentStage = pipeline.stages.find((s) => s.deals.some((d) => d.id === deal.id));
      if (currentStage && currentStage.id !== deal.stage_id) {
        await api.deals.update(deal.id, { stage_id: currentStage.id });
      } else {
        // Check if stage changed via over target
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
        { name: 'Lead', color: '#3B82F6' },
        { name: 'Qualified', color: '#10B981' },
        { name: 'Proposal', color: '#F59E0B' },
        { name: 'Won', color: '#10B981' },
      ],
    });
    setNewPipelineName('');
    setNewPipelineModal(false);
    await loadPipelines();
    setActivePipelineId(p.id);
  };

  const totalValue = pipeline?.stages.reduce(
    (sum, s) => sum + s.deals.reduce((ds, d) => ds + (d.value || 0), 0),
    0
  ) ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePipelineId(p.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activePipelineId === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => setNewPipelineModal(true)}
            className="px-3 py-1.5 rounded-full text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-1 whitespace-nowrap transition-colors"
          >
            <Plus size={14} /> New Pipeline
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {pipeline && (
            <span className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">${totalValue.toLocaleString()}</span>{' '}
              total value
            </span>
          )}
          {pipeline && (
            <button
              onClick={() => setStageModal({ open: true })}
              className="btn-secondary text-xs"
            >
              <Plus size={13} /> Add Stage
            </button>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-6">
        {!pipeline ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <p className="text-lg">
              {pipelines.length === 0
                ? 'Create your first pipeline to get started'
                : 'Select a pipeline above'}
            </p>
            {pipelines.length === 0 && (
              <button
                onClick={() => setNewPipelineModal(true)}
                className="btn-primary"
              >
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
              <div className="flex gap-4 h-full items-start">
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
              </div>
            </SortableContext>

            <DragOverlay>
              {activeDragType === 'deal' && activeDragData && 'title' in activeDragData && (
                <div className="rotate-2 cursor-grabbing">
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
          title={dealModal.deal ? 'Edit Deal' : 'Add Deal'}
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
          title="New Pipeline"
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
                placeholder="e.g. Sales Pipeline"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500">
              A default set of stages (Lead → Qualified → Proposal → Won) will be created.
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
