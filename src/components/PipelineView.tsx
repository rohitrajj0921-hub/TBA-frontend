/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  UserCheck, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Briefcase, 
  RefreshCw, 
  CheckSquare, 
  HelpCircle,
  Loader2,
  Bookmark,
  TrendingUp,
  ArrowRight,
  Target,
  Percent,
  CheckCircle2,
  Users,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell
} from 'recharts';
import { Selection, SelectionStatus, Joining, JoiningStatus, User, Candidate } from '../types.js';
import { useMemo } from 'react';

interface PipelineViewProps {
  token: string;
  currentUser: User;
}

export default function PipelineView({ token, currentUser }: PipelineViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'selections' | 'joinings'>('selections');
  const [selections, setSelections] = useState<Selection[]>([]);
  const [joinings, setJoinings] = useState<Joining[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Sorting State
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  const fetchPipelineData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch selections
      const selRes = await fetch('/api/selections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const selData = await selRes.json();

      // Fetch joinings
      const joiRes = await fetch('/api/joinings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const joiData = await joiRes.json();

      // Fetch candidates
      const candRes = await fetch('/api/candidates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let candData: Candidate[] = [];
      if (candRes.ok) {
        candData = await candRes.json();
      }

      // Fetch reports for funnel data
      const repRes = await fetch('/api/dashboard/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let conversionFunnel: any[] = [];
      if (repRes.ok) {
        const repData = await repRes.json();
        conversionFunnel = repData.conversionFunnel || [];
      }

      if (!selRes.ok || !joiRes.ok) {
        throw new Error("Failed to load recruitment pipeline logs");
      }

      setSelections(selData);
      setJoinings(joiData);
      setCandidates(candData);
      setFunnelData(conversionFunnel);
    } catch (err: any) {
      setError(err.message || "Failed to load pipeline reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, [token]);

  const getSelectionBadge = (status: SelectionStatus) => {
    switch (status) {
      case SelectionStatus.SELECTED:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case SelectionStatus.REJECTED:
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case SelectionStatus.HOLD:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const getJoiningBadge = (status: JoiningStatus) => {
    switch (status) {
      case JoiningStatus.JOINED:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case JoiningStatus.DID_NOT_JOIN:
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case JoiningStatus.PENDING:
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    }
  };

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    candidates.forEach(c => {
      if (c.source) sources.add(c.source);
    });
    return Array.from(sources).sort();
  }, [candidates]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    candidates.forEach(c => {
      if (c.tags) {
        c.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [candidates]);

  const processedSelections = useMemo(() => {
    return selections
      .map(sel => {
        const cand = candidates.find(c => c.id === sel.candidateId);
        return {
          ...sel,
          candidateSource: cand?.source || 'Unknown',
          candidateTags: cand?.tags || [],
          candidateCallDate: cand?.callDate || cand?.createdAt?.split('T')[0] || sel.date,
        };
      })
      .filter(item => {
        // Source filter
        if (filterSource && item.candidateSource !== filterSource) return false;
        // Tag filter
        if (filterTag && !item.candidateTags.includes(filterTag)) return false;
        // Date From filter
        if (filterDateFrom && item.candidateCallDate < filterDateFrom) return false;
        // Date To filter
        if (filterDateTo && item.candidateCallDate > filterDateTo) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return b.candidateCallDate.localeCompare(a.candidateCallDate);
        }
        if (sortBy === 'date-asc') {
          return a.candidateCallDate.localeCompare(b.candidateCallDate);
        }
        if (sortBy === 'verdict-desc') {
          return b.date.localeCompare(a.date);
        }
        if (sortBy === 'verdict-asc') {
          return a.date.localeCompare(b.date);
        }
        if (sortBy === 'name-asc') {
          return a.candidateName.localeCompare(b.candidateName);
        }
        if (sortBy === 'name-desc') {
          return b.candidateName.localeCompare(a.candidateName);
        }
        return 0;
      });
  }, [selections, candidates, filterSource, filterTag, filterDateFrom, filterDateTo, sortBy]);

  const processedJoinings = useMemo(() => {
    return joinings
      .map(joi => {
        const cand = candidates.find(c => c.id === joi.candidateId);
        return {
          ...joi,
          candidateSource: cand?.source || 'Unknown',
          candidateTags: cand?.tags || [],
          candidateCallDate: cand?.callDate || cand?.createdAt?.split('T')[0] || joi.joiningDate,
        };
      })
      .filter(item => {
        // Source filter
        if (filterSource && item.candidateSource !== filterSource) return false;
        // Tag filter
        if (filterTag && !item.candidateTags.includes(filterTag)) return false;
        // Date From filter
        if (filterDateFrom && item.candidateCallDate < filterDateFrom) return false;
        // Date To filter
        if (filterDateTo && item.candidateCallDate > filterDateTo) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return b.candidateCallDate.localeCompare(a.candidateCallDate);
        }
        if (sortBy === 'date-asc') {
          return a.candidateCallDate.localeCompare(b.candidateCallDate);
        }
        if (sortBy === 'verdict-desc') {
          return b.joiningDate.localeCompare(a.joiningDate);
        }
        if (sortBy === 'verdict-asc') {
          return a.joiningDate.localeCompare(b.joiningDate);
        }
        if (sortBy === 'name-asc') {
          return a.candidateName.localeCompare(b.candidateName);
        }
        if (sortBy === 'name-desc') {
          return b.candidateName.localeCompare(a.candidateName);
        }
        return 0;
      });
  }, [joinings, candidates, filterSource, filterTag, filterDateFrom, filterDateTo, sortBy]);

  return (
    <div className="p-8 space-y-8 text-slate-700 bg-slate-50 min-h-screen font-sans">
      
      {/* Header and Sync */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Pipeline Placement & Onboarding</h2>
          <p className="text-xs text-slate-500 mt-1">Track final candidate technical selection rounds, released offers, and company joining dates.</p>
        </div>
        <button
          id="btn-sync-pipeline"
          onClick={fetchPipelineData}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 text-slate-700 shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Sync Pipeline</span>
        </button>
      </div>

      {/* Funnel Conversion Rates Section */}
      {funnelData && funnelData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Recruitment Pipeline Funnel & Stage Conversion Rates</span>
              </h3>
              <p className="text-xs text-slate-400">
                Visualize candidate flow efficiency through consecutive evaluation phases.
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase rounded-md flex items-center space-x-1">
              <Percent className="w-3 h-3" />
              <span>Conversion Rates</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Recharts Bar Chart Funnel */}
            <div className="lg:col-span-7 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stage Candidate Count</h4>
              <div className="h-60 text-xs font-sans">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={funnelData}
                    margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                    barSize={18}
                  >
                    <XAxis type="number" axisLine={false} tickLine={false} stroke="#94a3b8" />
                    <YAxis 
                      dataKey="stage" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      stroke="#475569" 
                      width={140}
                      tick={{ fontSize: 9, fontWeight: 'bold' }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" name="Candidates" radius={[0, 6, 6, 0]}>
                      {funnelData.map((entry, index) => {
                        const colors = ['#6366f1', '#a855f7', '#f59e0b', '#10b981', '#3b82f6'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stage-to-Stage Conversions list */}
            <div className="lg:col-span-5 space-y-3.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Step-by-Step Transition Efficiency</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {[
                  {
                    from: "Screening",
                    to: "Interested",
                    countFrom: funnelData[0]?.count ?? 0,
                    countTo: funnelData[1]?.count ?? 0,
                    rate: (funnelData[0]?.count ?? 0) > 0 ? Math.round(((funnelData[1]?.count ?? 0) / funnelData[0].count) * 100) : 0,
                    bgLight: "bg-indigo-50 text-indigo-600"
                  },
                  {
                    from: "Interested",
                    to: "Interview",
                    countFrom: funnelData[1]?.count ?? 0,
                    countTo: funnelData[2]?.count ?? 0,
                    rate: (funnelData[1]?.count ?? 0) > 0 ? Math.round(((funnelData[2]?.count ?? 0) / funnelData[1].count) * 100) : 0,
                    bgLight: "bg-purple-50 text-purple-600"
                  },
                  {
                    from: "Interview",
                    to: "Selection",
                    countFrom: funnelData[2]?.count ?? 0,
                    countTo: funnelData[3]?.count ?? 0,
                    rate: (funnelData[2]?.count ?? 0) > 0 ? Math.round(((funnelData[3]?.count ?? 0) / funnelData[2].count) * 100) : 0,
                    bgLight: "bg-amber-50 text-amber-600"
                  },
                  {
                    from: "Selection",
                    to: "Joining",
                    countFrom: funnelData[3]?.count ?? 0,
                    countTo: funnelData[4]?.count ?? 0,
                    rate: (funnelData[3]?.count ?? 0) > 0 ? Math.round(((funnelData[4]?.count ?? 0) / funnelData[3].count) * 100) : 0,
                    bgLight: "bg-emerald-50 text-emerald-600"
                  }
                ].map((step, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between group hover:border-slate-300 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg font-black text-xs shrink-0 ${step.bgLight}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-slate-800">{step.from}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">{step.to}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {step.countFrom} ➔ {step.countTo} candidates
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-end">
                        <span>{step.rate}%</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Conversion</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          id="tab-pipeline-selections"
          onClick={() => setActiveSubTab('selections')}
          className={`pb-4 text-sm font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'selections' 
              ? 'text-indigo-600 border-b-2 border-indigo-600' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="w-4 h-4" />
            <span>Selection Rounds ({processedSelections.length !== selections.length ? `${processedSelections.length}/${selections.length}` : selections.length})</span>
          </div>
        </button>

        <button
          id="tab-pipeline-joinings"
          onClick={() => setActiveSubTab('joinings')}
          className={`pb-4 text-sm font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'joinings' 
              ? 'text-indigo-600 border-b-2 border-indigo-600' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4" />
            <span>Offers & Joining ({processedJoinings.length !== joinings.length ? `${processedJoinings.length}/${joinings.length}` : joinings.length})</span>
          </div>
        </button>
      </div>

      {/* Search & Filter Options Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Filter className="w-4 h-4" /></span>
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Advanced Filter & Sort Controls</span>
          </div>
          
          {(filterSource || filterTag || filterDateFrom || filterDateTo || sortBy !== 'date-desc') && (
            <button
              onClick={() => {
                setFilterSource('');
                setFilterTag('');
                setFilterDateFrom('');
                setFilterDateTo('');
                setSortBy('date-desc');
              }}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>Reset Filters</span>
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Tag Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Candidate Tag</label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="">All Tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Recruitment Source</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="">All Sources</option>
              {uniqueSources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sourced Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sourced Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          {/* Sort Control */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sort Order</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="date-desc">Candidate Sourced (Newest First)</option>
              <option value="date-asc">Candidate Sourced (Oldest First)</option>
              <option value="verdict-desc">
                {activeSubTab === 'selections' ? 'Verdict Date (Newest First)' : 'Joining Date (Newest First)'}
              </option>
              <option value="verdict-asc">
                {activeSubTab === 'selections' ? 'Verdict Date (Oldest First)' : 'Joining Date (Oldest First)'}
              </option>
              <option value="name-asc">Candidate Name (A-Z)</option>
              <option value="name-desc">Candidate Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs font-semibold">Compiling hiring logs...</p>
        </div>
      ) : activeSubTab === 'selections' ? (
        
        /* SELECTIONS LIST */
        processedSelections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
            <Bookmark className="w-9 h-9 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No selection evaluations match the current filters</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting or relaxing your filtering criteria.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider bg-slate-50 font-semibold">
                    <th className="py-4 px-5 font-bold">Candidate Name & Context</th>
                    <th className="py-4 px-5 font-bold">Selection Verdict</th>
                    <th className="py-4 px-5 font-bold">Verdict Date</th>
                    <th className="py-4 px-5 font-bold">Logged By</th>
                    <th className="py-4 px-5 font-bold">Committee Comments / Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {processedSelections.map((sel) => (
                    <tr key={sel.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{sel.candidateName}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                              Source: {sel.candidateSource}
                            </span>
                            {sel.candidateTags && sel.candidateTags.map((tag: string) => (
                              <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getSelectionBadge(sel.status)}`}>
                          {sel.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-500">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sel.date}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-indigo-600 font-semibold">
                        {sel.updatedByName}
                      </td>
                      <td className="py-4 px-5 max-w-sm">
                        <p className="text-xs text-slate-600 leading-relaxed italic">
                          "{sel.remarks || 'No decision comments logged.'}"
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (

        /* ONBOARDINGS & JOININGS LIST */
        processedJoinings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
            <Bookmark className="w-9 h-9 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No onboarding metrics match the current filters</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting or relaxing your filtering criteria.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider bg-slate-50 font-semibold">
                    <th className="py-4 px-5 font-bold">Candidate Name & Context</th>
                    <th className="py-4 px-5 font-bold text-center">Offer Status</th>
                    <th className="py-4 px-5 font-bold">Scheduled Joining Date</th>
                    <th className="py-4 px-5 font-bold">Onboarding Status</th>
                    <th className="py-4 px-5 font-bold">Logged By</th>
                    <th className="py-4 px-5 font-bold">Coordination remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {processedJoinings.map((joi) => (
                    <tr key={joi.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{joi.candidateName}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                              Source: {joi.candidateSource}
                            </span>
                            {joi.candidateTags && joi.candidateTags.map((tag: string) => (
                              <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        {joi.offerReleased ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 text-[10px] font-bold uppercase">Released</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-200 text-[10px] font-bold uppercase">Pending</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-bold font-mono">
                        {joi.joiningDate}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getJoiningBadge(joi.status)}`}>
                          {joi.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-indigo-600 font-semibold">
                        {joi.updatedByName}
                      </td>
                      <td className="py-4 px-5 max-w-sm">
                        <p className="text-xs text-slate-600 leading-relaxed italic">
                          "{joi.remarks || 'No onboarding notes logged.'}"
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

    </div>
  );
}
