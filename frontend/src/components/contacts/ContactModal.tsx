import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { createContact, updateContact } from '../../lib/api';
import type { Contact, ContactFormData } from '../../types';

interface Props {
  contact?: Contact | null;
  onClose: () => void;
}

const empty: ContactFormData = {
  name: '', email: '', phone: '', company: '', title: '', tags: '',
};

export default function ContactModal({ contact, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ContactFormData>(empty);

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        company: contact.company ?? '',
        title: contact.title ?? '',
        tags: contact.tags.join(', '),
      });
    } else {
      setForm(empty);
    }
  }, [contact]);

  const save = useMutation({
    mutationFn: () =>
      contact ? updateContact(contact.id, form) : createContact(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
    },
  });

  function field(key: keyof ContactFormData) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {contact ? 'Edit Contact' : 'New Contact'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); save.mutate(); }}
          className="px-6 py-5 space-y-4"
        >
          {[
            { label: 'Full Name *', key: 'name' as const, placeholder: 'Jane Smith' },
            { label: 'Email', key: 'email' as const, placeholder: 'jane@company.com' },
            { label: 'Phone', key: 'phone' as const, placeholder: '555-0100' },
            { label: 'Company', key: 'company' as const, placeholder: 'Acme Corp' },
            { label: 'Job Title', key: 'title' as const, placeholder: 'VP Sales' },
            { label: 'Tags', key: 'tags' as const, placeholder: 'enterprise, warm (comma-separated)' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                placeholder={placeholder}
                required={key === 'name'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                {...field(key)}
              />
            </div>
          ))}

          {save.isError && (
            <p className="text-sm text-red-600">Failed to save. Please try again.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-60"
            >
              {save.isPending ? 'Saving…' : contact ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
