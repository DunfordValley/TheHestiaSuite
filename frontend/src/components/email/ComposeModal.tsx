import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Send, Loader2 } from 'lucide-react';
import { sendEmail, fetchTemplates } from '../../lib/api';
import type { Contact, SendEmailPayload } from '../../types';

interface Props {
  contact: Contact;
  onClose: () => void;
}

export default function ComposeModal({ contact, onClose }: Props) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: fetchTemplates,
  });

  function applyTemplate(id: string) {
    setSelectedTemplateId(id);
    if (!id) return;
    const tpl = templates.find(t => t.id === parseInt(id));
    if (!tpl) return;
    const sub = tpl.subject
      .replace(/\{name\}/g, contact.name)
      .replace(/\{company\}/g, contact.company ?? '');
    const bod = tpl.body
      .replace(/\{name\}/g, contact.name)
      .replace(/\{company\}/g, contact.company ?? '');
    setSubject(sub);
    setBody(bod);
  }

  const send = useMutation({
    mutationFn: () => {
      const payload: SendEmailPayload = {
        contact_id: contact.id,
        to: contact.email!,
        subject,
        body,
      };
      return sendEmail(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contact.id] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); send.mutate(); }}
          className="px-6 py-5 space-y-4"
        >
          {/* To */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <input
              type="text"
              value={contact.email ?? ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
          </div>

          {/* Template picker */}
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Template</label>
              <select
                value={selectedTemplateId}
                onChange={e => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">— No template —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject line"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              required
              rows={8}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your message here…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {send.isError && (
            <p className="text-sm text-red-600">Failed to send. Please try again.</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={send.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-60"
            >
              {send.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Send</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
