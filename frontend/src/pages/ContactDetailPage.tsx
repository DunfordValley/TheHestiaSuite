import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Phone, Pencil, Trash2, Loader2 } from 'lucide-react';
import { fetchContact, deleteContact } from '../lib/api';
import ContactModal from '../components/contacts/ContactModal';
import Timeline from '../components/timeline/Timeline';
import InteractionForm from '../components/timeline/InteractionForm';
import type { Contact, DealStage } from '../types';

const STAGE_COLORS: Record<DealStage, string> = {
  'Lead':        'bg-gray-100 text-gray-600',
  'Qualified':   'bg-blue-100 text-blue-700',
  'Proposal':    'bg-indigo-100 text-indigo-700',
  'Negotiation': 'bg-amber-100 text-amber-700',
  'Closed Won':  'bg-emerald-100 text-emerald-700',
  'Closed Lost': 'bg-rose-100 text-rose-700',
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'timeline' | 'deals'>('timeline');
  const [editing, setEditing] = useState(false);

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', parseInt(id!)],
    queryFn: () => fetchContact(parseInt(id!)),
    enabled: !!id,
  });

  const del = useMutation({
    mutationFn: () => deleteContact(parseInt(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      navigate('/contacts');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Contact not found.</p>
        <button onClick={() => navigate('/contacts')} className="mt-4 text-indigo-500 hover:text-indigo-600 text-sm">
          ← Back to contacts
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/contacts')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Contacts
      </button>

      {/* Contact header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-700 text-xl font-bold">
                {contact.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{contact.name}</h1>
              {contact.title && <p className="text-gray-500 text-sm">{contact.title}</p>}
              {contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this contact? This cannot be undone.')) del.mutate();
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Contact details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
          {contact.company && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              {contact.company}
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${contact.email}`} className="hover:text-indigo-600">{contact.email}</a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${contact.phone}`} className="hover:text-indigo-600">{contact.phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(['timeline', 'deals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'timeline' ? `Timeline (${contact.interactions.length})` : `Deals (${contact.deals.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'timeline' && (
        <div className="space-y-4">
          <InteractionForm contactId={contact.id} deals={contact.deals} />
          <Timeline interactions={contact.interactions} contactId={contact.id} />
        </div>
      )}

      {tab === 'deals' && (
        <div className="space-y-3">
          {contact.deals.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              No deals linked to this contact yet.
            </div>
          ) : (
            contact.deals.map(deal => (
              <div key={deal.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{deal.title}</p>
                  {deal.value && (
                    <p className="text-xs text-emerald-700 font-medium mt-0.5">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(deal.value))}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STAGE_COLORS[deal.stage as DealStage] ?? 'bg-gray-100 text-gray-600'}`}>
                  {deal.stage}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {editing && (
        <ContactModal
          contact={contact as unknown as Contact}
          onClose={() => {
            setEditing(false);
            qc.invalidateQueries({ queryKey: ['contact', contact.id] });
          }}
        />
      )}
    </div>
  );
}
