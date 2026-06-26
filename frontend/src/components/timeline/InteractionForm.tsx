import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle } from 'lucide-react';
import { createInteraction } from '../../lib/api';
import type { InteractionType, Deal } from '../../types';

const TYPES: { value: InteractionType; label: string }[] = [
  { value: 'call',    label: 'Call' },
  { value: 'email',  label: 'Email' },
  { value: 'note',   label: 'Note' },
  { value: 'meeting', label: 'Meeting' },
];

interface Props {
  contactId: number;
  deals?: Deal[];
}

export default function InteractionForm({ contactId, deals = [] }: Props) {
  const qc = useQueryClient();
  const [type, setType] = useState<InteractionType>('call');
  const [summary, setSummary] = useState('');
  const [dealId, setDealId] = useState('');
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      createInteraction({
        contact_id: contactId,
        deal_id: dealId ? parseInt(dealId) : null,
        type,
        summary,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contactId] });
      qc.invalidateQueries({ queryKey: ['interactions'] });
      setSummary('');
      setDealId('');
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        <PlusCircle className="w-4 h-4" />
        Log an interaction
      </button>
    );
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); save.mutate(); }}
      className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
    >
      <p className="text-sm font-semibold text-gray-800">Log Interaction</p>

      <div className="flex gap-2">
        {TYPES.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              type === t.value
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {deals.length > 0 && (
        <select
          value={dealId}
          onChange={e => setDealId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">No deal (optional)</option>
          {deals.map(d => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      )}

      <textarea
        value={summary}
        onChange={e => setSummary(e.target.value)}
        required
        rows={3}
        placeholder="What happened? Add notes, outcomes, next steps…"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={save.isPending || !summary.trim()}
          className="flex-1 px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
