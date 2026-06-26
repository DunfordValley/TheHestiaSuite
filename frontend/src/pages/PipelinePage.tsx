import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { fetchDeals, moveDealStage } from '../lib/api';
import PipelineColumn from '../components/pipeline/PipelineColumn';
import DealCard from '../components/pipeline/DealCard';
import DealModal from '../components/pipeline/DealModal';
import type { Deal, DealStage } from '../types';

const STAGES: DealStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

export default function PipelinePage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [addStage, setAddStage] = useState<DealStage | null>(null);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => fetchDeals(),
  });

  const [localDeals, setLocalDeals] = useState<Deal[]>([]);
  const displayDeals = localDeals.length > 0 ? localDeals : deals;

  const moveStage = useMutation({
    mutationFn: ({ id, stage, position }: { id: number; stage: string; position: number }) =>
      moveDealStage(id, stage, position),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
      setLocalDeals([]);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeDeal = activeId ? displayDeals.find(d => d.id === activeId) : null;

  function dealsForStage(stage: DealStage) {
    return displayDeals.filter(d => d.stage === stage).sort((a, b) => a.position - b.position);
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
    if (localDeals.length === 0) setLocalDeals([...deals]);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    setLocalDeals(prev => {
      const activeDeal = prev.find(d => d.id === activeId);
      if (!activeDeal) return prev;

      // over is a stage column ID (string) or a deal ID (number)
      const overStage = STAGES.includes(overId as DealStage)
        ? (overId as DealStage)
        : prev.find(d => d.id === overId)?.stage ?? activeDeal.stage;

      if (activeDeal.stage === overStage) {
        // Reorder within same column
        const stageDeals = prev.filter(d => d.stage === overStage).sort((a, b) => a.position - b.position);
        const oldIndex = stageDeals.findIndex(d => d.id === activeId);
        const newIndex = stageDeals.findIndex(d => d.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        const reordered = arrayMove(stageDeals, oldIndex, newIndex).map((d, i) => ({ ...d, position: i }));
        return prev.map(d => reordered.find(r => r.id === d.id) ?? d);
      } else {
        // Move to different column
        return prev.map(d => d.id === activeId ? { ...d, stage: overStage, position: 9999 } : d);
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active } = event;
    setActiveId(null);

    const movedDeal = localDeals.find(d => d.id === (active.id as number));
    if (!movedDeal) { setLocalDeals([]); return; }

    const stageDeals = localDeals
      .filter(d => d.stage === movedDeal.stage)
      .sort((a, b) => a.position - b.position);
    const position = stageDeals.findIndex(d => d.id === movedDeal.id);

    moveStage.mutate({ id: movedDeal.id, stage: movedDeal.stage, position });
  }

  const totalPipelineValue = displayDeals
    .filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value ? parseFloat(d.value) : 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {deals.length} deal{deals.length !== 1 ? 's' : ''} ·{' '}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalPipelineValue)} in pipeline
          </p>
        </div>
        <button
          onClick={() => setAddStage('Lead')}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
        >
          + New Deal
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 p-6 h-full min-w-max">
            {STAGES.map(stage => (
              <PipelineColumn
                key={stage}
                stage={stage}
                deals={dealsForStage(stage)}
                onAddDeal={s => setAddStage(s)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal ? <DealCard deal={activeDeal} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {addStage && (
        <DealModal
          defaultStage={addStage}
          onClose={() => setAddStage(null)}
        />
      )}
    </div>
  );
}
