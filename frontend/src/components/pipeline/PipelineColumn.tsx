import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import DealCard from './DealCard';
import type { Deal, DealStage } from '../../types';

const STAGE_COLORS: Record<DealStage, string> = {
  'Lead':         'bg-gray-100 text-gray-600',
  'Qualified':    'bg-blue-100 text-blue-700',
  'Proposal':     'bg-indigo-100 text-indigo-700',
  'Negotiation':  'bg-amber-100 text-amber-700',
  'Closed Won':   'bg-emerald-100 text-emerald-700',
  'Closed Lost':  'bg-rose-100 text-rose-700',
};

interface Props {
  stage: DealStage;
  deals: Deal[];
  onAddDeal: (stage: DealStage) => void;
}

export default function PipelineColumn({ stage, deals, onAddDeal }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  const totalValue = deals.reduce((sum, d) => sum + (d.value ? parseFloat(d.value) : 0), 0);
  const formattedValue = totalValue > 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalValue)
    : null;

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STAGE_COLORS[stage]}`}>
            {stage}
          </span>
          <span className="text-xs text-gray-400 font-medium">{deals.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {formattedValue && (
            <span className="text-xs text-gray-400">{formattedValue}</span>
          )}
          <button
            onClick={() => onAddDeal(stage)}
            className="w-6 h-6 rounded-md bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center transition-colors text-gray-500"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 min-h-[200px] space-y-2.5 rounded-xl p-2 transition-colors ${
            isOver ? 'bg-indigo-50 border-2 border-indigo-200 border-dashed' : 'bg-gray-50'
          }`}
        >
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
          {deals.length === 0 && (
            <div className="h-full min-h-[120px] flex items-center justify-center text-xs text-gray-400">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
