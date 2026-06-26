import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { fetchContacts, deleteContact } from '../lib/api';
import ContactCard from '../components/contacts/ContactCard';
import ContactModal from '../components/contacts/ContactModal';
import type { Contact } from '../types';

export default function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editContact, setEditContact] = useState<Contact | null | undefined>(undefined);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => fetchContacts(search || undefined),
  });

  const del = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setEditContact(null)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-1">No contacts found</p>
          <p className="text-sm">
            {search ? 'Try a different search term.' : 'Add your first contact to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={c => setEditContact(c)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {editContact !== undefined && (
        <ContactModal
          contact={editContact}
          onClose={() => setEditContact(undefined)}
        />
      )}
    </div>
  );
}
