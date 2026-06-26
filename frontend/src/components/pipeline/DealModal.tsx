import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { createDeal, fetchContacts } from '../../lib/api';
import type { DealFormData, DealStage } from '../../types';

const STAGES: DealStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

interface Props {
  defaultStage?: DealStage;
  onClose: () => void;
}

const empty: DealFormData = {
  title: '', contact_id: '', stage: 'Lead', value: '', close_date: '', notes: '',
};

export default function DealModal({ defaultStage = 'Lead', onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<DealFormData>({ ...empty, stage: defaultStage });

  useEffect(() => {
    setForm(f => ({ ...f, stage: defaultStage }));
  }, [defaultStage]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => fetchContacts(),
  });

  const save = useMutation({
    mutationFn: () => createDeal(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
      onClose();
    },
  });

  function set(key: keyof DealFormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); save.mutate(); }}
          className="px-6 py-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Deal Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Enterprise Contract Q3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contact</label>
            <select
              value={form.contact_id}
              onChange={e => set('contact_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No contact</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={e => set('stage', e.target.value as DealStage)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={e => set('value', e.target.value)}
                placeholder="10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Close Date</label>
            <input
              type="date"
              value={form.close_date}
              onChange={e => set('close_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any relevant context…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {save.isError && (
            <p className="text-sm text-red-600">Failed to save. Please try again.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-60"
            >
              {save.isPending ? 'Creating…' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
