import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DollarSign, Calendar, User } from 'lucide-react';
import type { Deal } from '../../types';

interface Props {
  deal: Deal;
  onClick?: () => void;
}

export default function DealCard({ deal, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const value = deal.value
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(deal.value))
    : null;

  const closeDate = deal.close_date
    ? new Date(deal.close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <p className="text-sm font-semibold text-gray-900 mb-2 leading-snug">{deal.title}</p>
      <div className="space-y-1.5">
        {deal.contact_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate">{deal.contact_name}</span>
            {deal.contact_company && (
              <span className="text-gray-400">· {deal.contact_company}</span>
            )}
          </div>
        )}
        {value && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            {value}
          </div>
        )}
        {closeDate && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            Close {closeDate}
          </div>
        )}
      </div>
    </div>
  );
}
