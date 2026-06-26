import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Mail, FileText, Calendar, Trash2 } from 'lucide-react';
import { deleteInteraction } from '../../lib/api';
import type { InteractionWithMeta } from '../../types';

const TYPE_CONFIG = {
  call:    { icon: Phone,    color: 'bg-emerald-100 text-emerald-600', label: 'Call' },
  email:   { icon: Mail,    color: 'bg-blue-100 text-blue-600',       label: 'Email' },
  note:    { icon: FileText, color: 'bg-amber-100 text-amber-600',    label: 'Note' },
  meeting: { icon: Calendar, color: 'bg-violet-100 text-violet-600',  label: 'Meeting' },
};

interface Props {
  interactions: InteractionWithMeta[];
  contactId: number;
}

export default function Timeline({ interactions, contactId }: Props) {
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: deleteInteraction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contactId] });
      qc.invalidateQueries({ queryKey: ['interactions'] });
    },
  });

  if (interactions.length === 0) {
    return (
      <div className="py-10 text-center text-gray-400 text-sm">
        No interactions yet. Log the first one below.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interactions.map(item => {
        const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.note;
        const Icon = config.icon;
        return (
          <div key={item.id} className="flex gap-3">
            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {config.label}
                  </span>
                  {item.deal_title && (
                    <span className="ml-2 text-xs text-indigo-600">· {item.deal_title}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(item.occurred_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                  <button
                    onClick={() => del.mutate(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-sm text-gray-700">{item.summary}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
