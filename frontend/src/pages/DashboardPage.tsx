import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, DollarSign, Trophy, Phone, Mail, FileText, Calendar } from 'lucide-react';
import { fetchContacts, fetchDealStats, fetchInteractions } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import type { InteractionWithMeta } from '../types';

const TYPE_ICONS = {
  call:    { icon: Phone,    color: 'text-emerald-500 bg-emerald-100' },
  email:   { icon: Mail,    color: 'text-blue-500 bg-blue-100' },
  note:    { icon: FileText, color: 'text-amber-500 bg-amber-100' },
  meeting: { icon: Calendar, color: 'text-violet-500 bg-violet-100' },
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => fetchContacts(),
  });

  const { data: stats } = useQuery({
    queryKey: ['deal-stats'],
    queryFn: fetchDealStats,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions'],
    queryFn: () => fetchInteractions(undefined, 10),
  });

  const statCards = [
    {
      label: 'Total Contacts',
      value: contacts.length,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-500',
    },
    {
      label: 'Open Deals',
      value: stats?.open_deals ?? '—',
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-500',
    },
    {
      label: 'Pipeline Value',
      value: stats
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(stats.pipeline_value))
        : '—',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-500',
    },
    {
      label: 'Deals Won',
      value: stats?.won_deals ?? '—',
      icon: Trophy,
      color: 'bg-amber-50 text-amber-500',
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back. Here's what's happening.</p>
        </div>
        <button
          onClick={() => navigate('/contacts')}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
        >
          + Add Contact
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {interactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No interactions yet. Open a contact and log the first one.
            </div>
          ) : (
            interactions.map((item: InteractionWithMeta) => {
              const cfg = TYPE_ICONS[item.type] ?? TYPE_ICONS.note;
              const Icon = cfg.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 px-6 py-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer truncate"
                        onClick={() => item.contact_id && navigate(`/contacts/${item.contact_id}`)}
                      >
                        {item.contact_name ?? 'Unknown'}
                      </span>
                      {item.deal_title && (
                        <span className="text-xs text-gray-400 truncate">· {item.deal_title}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{item.summary}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(item.occurred_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
