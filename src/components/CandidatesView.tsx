/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Calendar, 
  CheckCircle, 
  UserCheck, 
  Trash2, 
  Loader2, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  User as UserIcon,
  Filter,
  Users,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import { Candidate, CandidateStatus, User, UserRole, InterviewMode, InterviewStatus, SelectionStatus, JoiningStatus } from '../types.js';
import CandidateForm from './CandidateForm.tsx';

interface CandidatesViewProps {
  token: string;
  currentUser: User;
}

export default function CandidatesView({ token, currentUser }: CandidatesViewProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // Custom Tag Filter State
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  
  // Sort State
  const [sortBy, setSortBy] = useState<string>('newest');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [activeFormCandidate, setActiveFormCandidate] = useState<Candidate | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  // Sub-modals for workflow logging
  const [showScheduleModal, setShowScheduleModal] = useState<Candidate | null>(null);
  const [showSelectionModal, setShowSelectionModal] = useState<Candidate | null>(null);
  const [showJoiningModal, setShowJoiningModal] = useState<Candidate | null>(null);

  // Scheduling states
  const [intvDate, setIntvDate] = useState('');
  const [intvTime, setIntvTime] = useState('');
  const [intvClient, setIntvClient] = useState('');
  const [intvPosition, setIntvPosition] = useState('');
  const [intvMode, setIntvMode] = useState<InterviewMode>(InterviewMode.ONLINE);
  const [intvRemarks, setIntvRemarks] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Selection states
  const [selStatus, setSelStatus] = useState<SelectionStatus>(SelectionStatus.SELECTED);
  const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0]);
  const [selRemarks, setSelRemarks] = useState('');
  const [submittingSelection, setSubmittingSelection] = useState(false);

  // Joining states
  const [joiOfferReleased, setJoiOfferReleased] = useState(true);
  const [joiDate, setJoiDate] = useState('');
  const [joiStatus, setJoiStatus] = useState<JoiningStatus>(JoiningStatus.PENDING);
  const [joiRemarks, setJoiRemarks] = useState('');
  const [submittingJoining, setSubmittingJoining] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const statusQuery = selectedStatus !== 'ALL' ? `&status=${selectedStatus}` : '';
      const response = await fetch(`/api/candidates?search=${encodeURIComponent(searchQuery)}${statusQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load candidate listings");
      }
      setCandidates(data);
    } catch (err: any) {
      setError(err.message || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [searchQuery, selectedStatus, token]);

  useEffect(() => {
    const handleCreated = () => {
      fetchCandidates();
    };
    window.addEventListener('candidate-created', handleCreated);
    return () => {
      window.removeEventListener('candidate-created', handleCreated);
    };
  }, [token]);

  const handleDelete = async (candidateId: string) => {
    if (!window.confirm("Are you absolutely sure you want to completely delete this candidate and all of their interview records from the database?")) {
      return;
    }

    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to delete candidate");
      }

      fetchCandidates();
    } catch (err: any) {
      alert(err.message || "Failed to execute deletion.");
    }
  };

  // Workflow Handlers
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showScheduleModal || !intvDate || !intvTime || !intvClient || !intvPosition) {
      alert("Please complete all required scheduling fields.");
      return;
    }

    setScheduling(true);
    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          candidateId: showScheduleModal.id,
          date: intvDate,
          time: intvTime,
          client: intvClient,
          position: intvPosition,
          interviewMode: intvMode,
          status: InterviewStatus.SCHEDULED,
          remarks: intvRemarks
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to schedule interview session");
      }

      alert(`Successfully scheduled interview with ${showScheduleModal.name} for ${intvClient}!`);
      setShowScheduleModal(null);
      // Clean states
      setIntvDate(''); setIntvTime(''); setIntvClient(''); setIntvPosition(''); setIntvRemarks('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setScheduling(false);
    }
  };

  const handleSelectionVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSelectionModal || !selDate || !selStatus) {
      alert("Please specify a status and date.");
      return;
    }

    setSubmittingSelection(true);
    try {
      const response = await fetch('/api/selections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          candidateId: showSelectionModal.id,
          status: selStatus,
          date: selDate,
          remarks: selRemarks
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to log candidate selection verdict");
      }

      alert(`Successfully logged selection verdict for ${showSelectionModal.name}!`);
      setShowSelectionModal(null);
      setSelRemarks('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingSelection(false);
    }
  };

  const handleJoiningStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showJoiningModal || !joiDate) {
      alert("Please specify a joining date.");
      return;
    }

    setSubmittingJoining(true);
    try {
      const response = await fetch('/api/joinings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          candidateId: showJoiningModal.id,
          offerReleased: joiOfferReleased,
          joiningDate: joiDate,
          status: joiStatus,
          remarks: joiRemarks
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to log candidate onboarding status");
      }

      alert(`Successfully logged onboarding/joining details for ${showJoiningModal.name}!`);
      setShowJoiningModal(null);
      setJoiDate(''); setJoiRemarks('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingJoining(false);
    }
  };

  const getStatusStyle = (status: CandidateStatus) => {
    switch (status) {
      case CandidateStatus.INTERESTED:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case CandidateStatus.FOLLOW_UP:
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case CandidateStatus.CALL_BACK_LATER:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case CandidateStatus.NOT_INTERESTED:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      case CandidateStatus.WRONG_NUMBER:
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-150';
    }
  };

  const statusFilters = [
    { key: 'ALL', label: 'All Candidates' },
    { key: CandidateStatus.INTERESTED, label: 'Interested' },
    { key: CandidateStatus.FOLLOW_UP, label: 'Follow-ups' },
    { key: CandidateStatus.CALL_BACK_LATER, label: 'Call Back Later' },
    { key: CandidateStatus.NOT_INTERESTED, label: 'Not Interested' }
  ];

  const hasWriteAccess = true; // Recruiters, Team Leaders, and Admins can log candidates
  const hasAuthWorkflowAccess = [UserRole.ADMIN, UserRole.TEAM_LEADER].includes(currentUser.role);

  // Extract all unique custom tags
  const uniqueTags = Array.from(
    new Set(
      candidates.flatMap(c => c.tags || [])
    )
  ).filter(Boolean);

  // Filter candidates by selected tag
  let processedCandidates = candidates.filter(cand => {
    if (selectedTag === 'ALL') return true;
    return cand.tags && cand.tags.includes(selectedTag);
  });

  // Sort candidates
  processedCandidates = [...processedCandidates].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
    }
    if (sortBy === 'name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'name-desc') {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === 'experience-desc') {
      return b.experience - a.experience;
    }
    if (sortBy === 'tag-count-desc') {
      const aCount = a.tags ? a.tags.length : 0;
      const bCount = b.tags ? b.tags.length : 0;
      return bCount - aCount;
    }
    return 0;
  });

  return (
    <div className="p-8 space-y-8 text-slate-700 bg-slate-50 min-h-screen font-sans">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Candidate Pool</h2>
          <p className="text-xs text-slate-500 mt-1">Screen resumes, log custom labels, and manage sourcing pipelines.</p>
        </div>
        
        {hasWriteAccess && (
          <button
            id="btn-add-candidate"
            onClick={() => {
              setActiveFormCandidate(null);
              setShowFormModal(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        )}
      </div>

      {/* Sourcing Search, Sort, & Status panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="input-candidate-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile, company, skills, or recruiter..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Sorter and Controls */}
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] uppercase font-bold text-slate-500">Sort By:</span>
              <select
                id="select-candidate-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none font-semibold"
              >
                <option value="newest">Newest Sourced</option>
                <option value="oldest">Oldest Sourced</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
                <option value="experience-desc">Experience (High to Low)</option>
                <option value="tag-count-desc">Label Count (Most to Least)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Filters Group */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mr-2 flex items-center space-x-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Status:</span>
          </span>
          {statusFilters.map((filter) => (
            <button
              id={`filter-status-${filter.key}`}
              key={filter.key}
              onClick={() => setSelectedStatus(filter.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatus === filter.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Custom Labels / Tags Filter System */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mr-2 flex items-center space-x-1">
            <Tag className="w-3 h-3 text-emerald-500" />
            <span>Labels:</span>
          </span>
          
          <button
            id="filter-tag-all"
            onClick={() => setSelectedTag('ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              selectedTag === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50/40 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            All Labels ({uniqueTags.length})
          </button>

          {uniqueTags.map((tag) => (
            <button
              id={`filter-tag-${tag}`}
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                selectedTag === tag
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50/10 text-emerald-600 hover:bg-emerald-50 border border-emerald-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

      </div>

      {/* List / Grid Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs text-slate-500">Fetching registered candidates from databases...</p>
        </div>
      ) : processedCandidates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-700">No candidates found</p>
          <p className="text-xs text-slate-400 mt-1">Try modifying your filters, searches, or custom tags.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-5 font-semibold text-[10px]">Candidate Information</th>
                  <th className="py-4 px-5 font-semibold text-[10px]">Compensation & Sourcing</th>
                  <th className="py-4 px-5 font-semibold text-[10px]">Labels & Tags</th>
                  <th className="py-4 px-5 font-semibold text-[10px]">Expertise Skills</th>
                  <th className="py-4 px-5 font-semibold text-[10px]">Sourcing Stage</th>
                  <th className="py-4 px-5 font-semibold text-[10px]">Remarks & Notes</th>
                  <th className="py-4 px-5 font-semibold text-right text-[10px]">Pipelines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-50/50 text-slate-600 transition-colors">
                    {/* Information */}
                    <td className="py-4 px-5 space-y-1.5 max-w-xs">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{cand.name}</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-500">
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>+91 {cand.mobile}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3 h-3 text-slate-400 truncate" />
                          <span className="truncate">{cand.email}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{cand.location}</span>
                        </div>
                      </div>
                    </td>

                    {/* Sourcing */}
                    <td className="py-4 px-5 space-y-1">
                      <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cand.currentCompany}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>Exp: <span className="text-slate-900 font-bold">{cand.experience} yrs</span></div>
                        <div>NP: <span className="text-slate-900 font-bold">{cand.noticePeriod} days</span></div>
                        <div className="text-[10px] text-indigo-600/80 mt-1 font-semibold">Source: {cand.source}</div>
                      </div>
                    </td>

                    {/* Custom Labels / Tags */}
                    <td className="py-4 px-5 max-w-xs">
                      {cand.tags && cand.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cand.tags.map(t => (
                            <span 
                              key={t} 
                              className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold flex items-center gap-1"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              <span>{t}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No labels</span>
                      )}
                    </td>

                    {/* Skills */}
                    <td className="py-4 px-5 max-w-xs">
                      {cand.skills && cand.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cand.skills.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-slate-50 border border-slate-150 text-slate-600 rounded-md text-[10px] font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No expertise added</span>
                      )}
                    </td>

                    {/* Sourcing Stage */}
                    <td className="py-4 px-5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusStyle(cand.status)}`}>
                        {cand.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1.5 flex items-center space-x-1">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span>Recruiter: {cand.recruiterName}</span>
                      </div>
                    </td>

                    {/* Remarks */}
                    <td className="py-4 px-5 max-w-xs">
                      <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                        {cand.remarks || <span className="text-slate-400 italic">No feedback remarks logged.</span>}
                      </p>
                    </td>

                    {/* Action Panel */}
                    <td className="py-4 px-5 text-right space-y-1.5">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Edit button */}
                        <button
                          id={`btn-edit-${cand.id}`}
                          onClick={() => {
                            setActiveFormCandidate(cand);
                            setShowFormModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                          title="Edit Candidate Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Schedule Interview */}
                        <button
                          id={`btn-schedule-${cand.id}`}
                          onClick={() => setShowScheduleModal(cand)}
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-100 transition-all cursor-pointer"
                          title="Schedule Interview Session"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>

                        {/* Selection status (Admin/TL) */}
                        {hasAuthWorkflowAccess && (
                          <button
                            id={`btn-verdict-${cand.id}`}
                            onClick={() => {
                              setSelStatus(SelectionStatus.SELECTED);
                              setShowSelectionModal(cand);
                            }}
                            className="p-1.5 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg border border-transparent hover:border-cyan-100 transition-all cursor-pointer"
                            title="Log Selection Verdict"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Onboarding status (Admin/TL) */}
                        {hasAuthWorkflowAccess && (
                          <button
                            id={`btn-onboard-${cand.id}`}
                            onClick={() => {
                              setJoiStatus(JoiningStatus.PENDING);
                              setShowJoiningModal(cand);
                            }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-100 transition-all cursor-pointer"
                            title="Log Onboarding & Placement Status"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Candidate (Admin/TL) */}
                        {hasAuthWorkflowAccess && (
                          <button
                            id={`btn-delete-${cand.id}`}
                            onClick={() => handleDelete(cand.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            title="Remove Candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Sourcing Form Modal */}
      {showFormModal && (
        <CandidateForm
          token={token}
          candidate={activeFormCandidate}
          onClose={() => {
            setShowFormModal(false);
            setActiveFormCandidate(null);
          }}
          onSaveSuccess={() => {
            setShowFormModal(false);
            setActiveFormCandidate(null);
            fetchCandidates();
          }}
        />
      )}

      {/* SUB-MODAL 1: Schedule Interview */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-800">
            <h3 className="text-md font-bold text-slate-900">Schedule Technical Session</h3>
            <p className="text-xs text-slate-500">Scheduling technical or client validation rounds for <span className="text-indigo-600 font-semibold">{showScheduleModal.name}</span>.</p>
            
            <form onSubmit={handleScheduleInterview} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Interview Date *</label>
                  <input 
                    id="schedule-date"
                    type="date" 
                    value={intvDate} 
                    onChange={(e) => setIntvDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Start Time *</label>
                  <input 
                    id="schedule-time"
                    type="time" 
                    value={intvTime} 
                    onChange={(e) => setIntvTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Client *</label>
                <input 
                  id="schedule-client"
                  type="text" 
                  value={intvClient} 
                  onChange={(e) => setIntvClient(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                  placeholder="e.g. Google India"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Designation / Role *</label>
                <input 
                  id="schedule-role"
                  type="text" 
                  value={intvPosition} 
                  onChange={(e) => setIntvPosition(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                  placeholder="e.g. Senior Backend Engineer"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Interview Mode</label>
                <select 
                  id="schedule-mode"
                  value={intvMode} 
                  onChange={(e) => setIntvMode(e.target.value as InterviewMode)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1 font-semibold"
                >
                  <option value={InterviewMode.ONLINE}>Online / Google Meet</option>
                  <option value={InterviewMode.OFFLINE}>Offline / Client HQ</option>
                  <option value={InterviewMode.TELEPHONIC}>Telephonic screening</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Meeting Instructions</label>
                <textarea 
                  id="schedule-remarks"
                  value={intvRemarks} 
                  onChange={(e) => setIntvRemarks(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                  placeholder="Log Meet links, coordinate info, or client requests..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowScheduleModal(null)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  id="schedule-submit"
                  type="submit"
                  disabled={scheduling}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all"
                >
                  {scheduling ? 'Scheduling...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: Log Selection Verdict */}
      {showSelectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-800">
            <h3 className="text-md font-bold text-slate-900">Log Candidate Verdict</h3>
            <p className="text-xs text-slate-500">Save the technical screening or interview committee result for <span className="text-indigo-600 font-semibold">{showSelectionModal.name}</span>.</p>

            <form onSubmit={handleSelectionVerdict} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Technical Verdict *</label>
                <select 
                  id="verdict-status"
                  value={selStatus} 
                  onChange={(e) => setSelStatus(e.target.value as SelectionStatus)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1 font-bold"
                >
                  <option value={SelectionStatus.SELECTED}>Selected / Cleared</option>
                  <option value={SelectionStatus.REJECTED}>Rejected / Not Recommended</option>
                  <option value={SelectionStatus.HOLD}>Hold / Keep in Pipeline</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Decision / Logging Date *</label>
                <input 
                  id="verdict-date"
                  type="date" 
                  value={selDate} 
                  onChange={(e) => setSelDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Committee Feedback & Remarks</label>
                <textarea 
                  id="verdict-remarks"
                  value={selRemarks} 
                  onChange={(e) => setSelRemarks(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                  placeholder="Detail client feedback scores, domain competency clearing notes..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowSelectionModal(null)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  id="verdict-submit"
                  type="submit"
                  disabled={submittingSelection}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all"
                >
                  {submittingSelection ? 'Logging...' : 'Save Verdict'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: Log Joining & Placement Details */}
      {showJoiningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-800">
            <h3 className="text-md font-bold text-slate-900">Log Onboarding Status</h3>
            <p className="text-xs text-slate-500">Add joining dates and actual placement metrics for <span className="text-indigo-600 font-semibold">{showJoiningModal.name}</span>.</p>

            <form onSubmit={handleJoiningStatus} className="space-y-4">
              <div className="flex items-center space-x-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <input 
                  id="joining-offer-released"
                  type="checkbox" 
                  checked={joiOfferReleased} 
                  onChange={(e) => setJoiOfferReleased(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label className="text-xs text-slate-700 font-bold">Official Offer Letter Released</label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Joining Date *</label>
                <input 
                  id="joining-date"
                  type="date" 
                  value={joiDate} 
                  onChange={(e) => setJoiDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Onboarding Status</label>
                <select 
                  id="joining-status"
                  value={joiStatus} 
                  onChange={(e) => setJoiStatus(e.target.value as JoiningStatus)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1 font-bold"
                >
                  <option value={JoiningStatus.PENDING}>Pending Onboarding</option>
                  <option value={JoiningStatus.JOINED}>Joined Successfully</option>
                  <option value={JoiningStatus.DID_NOT_JOIN}>Did Not Join (Offer Declined/Ghosted)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Onboarding Notes</label>
                <textarea 
                  id="joining-remarks"
                  value={joiRemarks} 
                  onChange={(e) => setJoiRemarks(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 mt-1"
                  placeholder="e.g. Completed background check, negotiation details, start-date deferrals..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowJoiningModal(null)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  id="joining-submit"
                  type="submit"
                  disabled={submittingJoining}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all"
                >
                  {submittingJoining ? 'Saving...' : 'Save Metrics'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
