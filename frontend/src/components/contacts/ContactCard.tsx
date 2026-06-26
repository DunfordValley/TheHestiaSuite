import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Phone, ArrowRight } from 'lucide-react';
import type { Contact } from '../../types';

const TAG_COLORS: Record<string, string> = {
  enterprise: 'bg-indigo-100 text-indigo-700',
  warm:       'bg-amber-100 text-amber-700',
  hot:        'bg-rose-100 text-rose-700',
  tech:       'bg-cyan-100 text-cyan-700',
  startup:    'bg-violet-100 text-violet-700',
  retail:     'bg-emerald-100 text-emerald-700',
};

function tagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}

interface Props {
  contact: Contact;
  onEdit: (c: Contact) => void;
}

export default function ContactCard({ contact, onEdit }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-700 font-semibold text-sm">
            {contact.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{contact.name}</h3>
          {contact.title && (
            <p className="text-gray-500 text-xs truncate">{contact.title}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {contact.company && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{contact.company}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>{contact.phone}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map(tag => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-auto">
        <button
          onClick={() => onEdit(contact)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => navigate(`/contacts/${contact.id}`)}
          className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          View <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
