import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Mail, Pencil, Trash2, Plus, X, Loader2 } from 'lucide-react';
import {
  fetchGmailStatus,
  disconnectGmail,
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../lib/api';
import type { EmailTemplate } from '../types';

const emptyForm = { name: '', subject: '', body: '' };

export default function SettingsPage() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [banner, setBanner] = useState<'connected' | 'error' | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState(emptyForm);

  // Read ?gmail= param once on mount
  useEffect(() => {
    const status = searchParams.get('gmail');
    if (status === 'connected' || status === 'error') {
      setBanner(status);
      navigate('/settings', { replace: true });
      const t = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  const { data: gmailStatus, isLoading: gmailLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: fetchGmailStatus,
  });

  const disconnect = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gmail-status'] }),
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: fetchTemplates,
  });

  const saveTemplate = useMutation({
    mutationFn: () =>
      editingTemplate
        ? updateTemplate(editingTemplate.id, templateForm)
        : createTemplate(templateForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateForm(emptyForm);
    },
  });

  const destroyTemplate = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  });

  function openNewTemplate() {
    setEditingTemplate(null);
    setTemplateForm(emptyForm);
    setShowTemplateForm(true);
  }

  function openEditTemplate(tpl: EmailTemplate) {
    setEditingTemplate(tpl);
    setTemplateForm({ name: tpl.name, subject: tpl.subject, body: tpl.body });
    setShowTemplateForm(true);
  }

  function cancelTemplateForm() {
    setShowTemplateForm(false);
    setEditingTemplate(null);
    setTemplateForm(emptyForm);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Banner */}
      {banner && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
          banner === 'connected'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {banner === 'connected'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />
          }
          {banner === 'connected'
            ? 'Gmail connected successfully.'
            : 'Gmail connection failed. Please try again.'}
        </div>
      )}

      {/* Gmail connection */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Gmail</h2>
            <p className="text-xs text-gray-500">Connect your Gmail account to send emails and sync your inbox</p>
          </div>
        </div>

        {gmailLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking connection…
          </div>
        ) : gmailStatus?.connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Connected
              </span>
              {gmailStatus.email && (
                <span className="text-sm text-gray-500">· {gmailStatus.email}</span>
              )}
            </div>
            <button
              onClick={() => {
                if (confirm('Disconnect Gmail? Email features will stop working.')) {
                  disconnect.mutate();
                }
              }}
              disabled={disconnect.isPending}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Not connected</span>
            <a
              href="/api/gmail/auth"
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
            >
              Connect Gmail
            </a>
          </div>
        )}
      </section>

      {/* Email templates */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Email Templates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Use <code className="bg-gray-100 px-1 rounded text-xs">{'{name}'}</code> and{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">{'{company}'}</code> as placeholders
            </p>
          </div>
          {!showTemplateForm && (
            <button
              onClick={openNewTemplate}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          )}
        </div>

        {/* Template form */}
        {showTemplateForm && (
          <form
            onSubmit={e => { e.preventDefault(); saveTemplate.mutate(); }}
            className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </p>
              <button type="button" onClick={cancelTemplateForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Template Name *</label>
              <input
                type="text"
                required
                value={templateForm.name}
                onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Follow-up after meeting"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                required
                value={templateForm.subject}
                onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Following up, {name}"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Body *</label>
              <textarea
                required
                rows={6}
                value={templateForm.body}
                onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))}
                placeholder={`Hi {name},\n\nGreat to connect with you recently…`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            {saveTemplate.isError && (
              <p className="text-sm text-red-600">Failed to save template. Please try again.</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelTemplateForm}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveTemplate.isPending}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-60"
              >
                {saveTemplate.isPending ? 'Saving…' : editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </form>
        )}

        {/* Template list */}
        {templatesLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
          </div>
        ) : templates.length === 0 && !showTemplateForm ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No templates yet. Create one to speed up your outreach.
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map(tpl => (
              <div
                key={tpl.id}
                className="flex items-center justify-between gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tpl.name}</p>
                  <p className="text-xs text-gray-400 truncate">{tpl.subject}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditTemplate(tpl)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete template "${tpl.name}"?`)) {
                        destroyTemplate.mutate(tpl.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
