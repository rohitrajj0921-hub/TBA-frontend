/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, AlertCircle, Save, Tag } from 'lucide-react';
import { Candidate, CandidateStatus } from '../types.js';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, ensureFirebaseAuth, handleFirestoreError, OperationType } from '../firebase-client.js';

interface CandidateFormProps {
  token: string;
  candidate?: Candidate | null; // If passed, we are in Edit mode
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function CandidateForm({ token, candidate, onClose, onSaveSuccess }: CandidateFormProps) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentSalary, setCurrentSalary] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [experience, setExperience] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  
  // Custom Labels / Tags State
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const [source, setSource] = useState('LinkedIn');
  const [callDate, setCallDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<CandidateStatus>(CandidateStatus.INTERESTED);

  // Extra sheet fields
  const [timeHour, setTimeHour] = useState('');
  const [role, setRole] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [doneInterview, setDoneInterview] = useState('');
  const [notDoneInterview, setNotDoneInterview] = useState('');
  const [rescheduleInterview, setRescheduleInterview] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectionDate, setSelectionDate] = useState('');
  const [offerReceivedSalary, setOfferReceivedSalary] = useState('');
  const [offerRemark, setOfferRemark] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [joiningStatusText, setJoiningStatusText] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-save and draft states
  const [autosaving, setAutosaving] = useState(false);
  const [lastDraftSaved, setLastDraftSaved] = useState<string | null>(null);
  const [availableDraft, setAvailableDraft] = useState<any>(null);

  // Check for existing draft on mount
  useEffect(() => {
    const checkForDraft = async () => {
      try {
        await ensureFirebaseAuth();
        const draftId = candidate ? `candidate_${candidate.id}` : `new_recruiter_${token}`;
        const draftRef = doc(db, 'candidateDrafts', draftId);
        const docSnap = await getDoc(draftRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAvailableDraft(data);
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.GET, `candidateDrafts/${candidate ? `candidate_${candidate.id}` : `new_recruiter_${token}`}`);
        } catch (specErr) {
          console.warn("Firestore candidateDrafts GET failed gracefully:", specErr);
        }
      }
    };
    checkForDraft();
  }, [candidate, token]);

  // Track state in Ref for interval access
  const formStateRef = useRef({
    name, mobile, email, location, currentCompany, currentSalary, expectedSalary,
    experience, noticePeriod, skills, tags, source, callDate, remarks, status,
    timeHour, role, interviewDate, doneInterview, notDoneInterview, rescheduleInterview,
    feedback, selectionDate, offerReceivedSalary, offerRemark, joiningDate, joiningStatusText,
    saving
  });

  useEffect(() => {
    formStateRef.current = {
      name, mobile, email, location, currentCompany, currentSalary, expectedSalary,
      experience, noticePeriod, skills, tags, source, callDate, remarks, status,
      timeHour, role, interviewDate, doneInterview, notDoneInterview, rescheduleInterview,
      feedback, selectionDate, offerReceivedSalary, offerRemark, joiningDate, joiningStatusText,
      saving
    };
  }, [
    name, mobile, email, location, currentCompany, currentSalary, expectedSalary,
    experience, noticePeriod, skills, tags, source, callDate, remarks, status,
    timeHour, role, interviewDate, doneInterview, notDoneInterview, rescheduleInterview,
    feedback, selectionDate, offerReceivedSalary, offerRemark, joiningDate, joiningStatusText,
    saving
  ]);

  // Set up auto-save interval every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const state = formStateRef.current;
      if (state.saving) return;
      if (!state.name && !state.mobile && !state.email) return;

      const triggerAutoSave = async () => {
        setAutosaving(true);
        try {
          await ensureFirebaseAuth();
          const draftId = candidate ? `candidate_${candidate.id}` : `new_recruiter_${token}`;
          const draftRef = doc(db, 'candidateDrafts', draftId);
          await setDoc(draftRef, {
            id: draftId,
            candidateId: candidate ? candidate.id : '',
            recruiterId: token,
            name: state.name,
            mobile: state.mobile,
            email: state.email,
            location: state.location,
            currentCompany: state.currentCompany,
            currentSalary: Number(state.currentSalary) || 0,
            expectedSalary: Number(state.expectedSalary) || 0,
            experience: Number(state.experience) || 0,
            noticePeriod: Number(state.noticePeriod) || 0,
            skills: state.skills,
            tags: state.tags,
            source: state.source,
            callDate: state.callDate,
            remarks: state.remarks,
            status: state.status,
            timeHour: state.timeHour,
            role: state.role,
            interviewDate: state.interviewDate,
            doneInterview: state.doneInterview,
            notDoneInterview: state.notDoneInterview,
            rescheduleInterview: state.rescheduleInterview,
            feedback: state.feedback,
            selectionDate: state.selectionDate,
            offerReceivedSalary: Number(state.offerReceivedSalary) || 0,
            offerRemark: state.offerRemark,
            joiningDate: state.joiningDate,
            joiningStatusText: state.joiningStatusText,
            updatedAt: new Date().toISOString()
          });
          setLastDraftSaved(new Date().toLocaleTimeString());
        } catch (err) {
          const draftId = candidate ? `candidate_${candidate.id}` : `new_recruiter_${token}`;
          try {
            handleFirestoreError(err, OperationType.WRITE, `candidateDrafts/${draftId}`);
          } catch (specErr) {
            console.warn("Firestore candidateDrafts WRITE failed gracefully:", specErr);
          }
        } finally {
          setAutosaving(false);
        }
      };

      triggerAutoSave();
    }, 30000); // 30 seconds

    return () => clearInterval(timer);
  }, [candidate, token]);

  const handleRestoreDraft = () => {
    if (!availableDraft) return;

    if (availableDraft.name !== undefined) setName(availableDraft.name);
    if (availableDraft.mobile !== undefined) setMobile(availableDraft.mobile);
    if (availableDraft.email !== undefined) setEmail(availableDraft.email);
    if (availableDraft.location !== undefined) setLocation(availableDraft.location);
    if (availableDraft.currentCompany !== undefined) setCurrentCompany(availableDraft.currentCompany);
    if (availableDraft.currentSalary !== undefined) setCurrentSalary(availableDraft.currentSalary.toString());
    if (availableDraft.expectedSalary !== undefined) setExpectedSalary(availableDraft.expectedSalary.toString());
    if (availableDraft.experience !== undefined) setExperience(availableDraft.experience.toString());
    if (availableDraft.noticePeriod !== undefined) setNoticePeriod(availableDraft.noticePeriod.toString());
    if (availableDraft.skills !== undefined) setSkills(availableDraft.skills || []);
    if (availableDraft.tags !== undefined) setTags(availableDraft.tags || []);
    if (availableDraft.source !== undefined) setSource(availableDraft.source);
    if (availableDraft.callDate !== undefined) setCallDate(availableDraft.callDate);
    if (availableDraft.remarks !== undefined) setRemarks(availableDraft.remarks);
    if (availableDraft.status !== undefined) setStatus(availableDraft.status);

    if (availableDraft.timeHour !== undefined) setTimeHour(availableDraft.timeHour || '');
    if (availableDraft.role !== undefined) setRole(availableDraft.role || '');
    if (availableDraft.interviewDate !== undefined) setInterviewDate(availableDraft.interviewDate || '');
    if (availableDraft.doneInterview !== undefined) setDoneInterview(availableDraft.doneInterview || '');
    if (availableDraft.notDoneInterview !== undefined) setNotDoneInterview(availableDraft.notDoneInterview || '');
    if (availableDraft.rescheduleInterview !== undefined) setRescheduleInterview(availableDraft.rescheduleInterview || '');
    if (availableDraft.feedback !== undefined) setFeedback(availableDraft.feedback || '');
    if (availableDraft.selectionDate !== undefined) setSelectionDate(availableDraft.selectionDate || '');
    if (availableDraft.offerReceivedSalary !== undefined) setOfferReceivedSalary(availableDraft.offerReceivedSalary ? availableDraft.offerReceivedSalary.toString() : '');
    if (availableDraft.offerRemark !== undefined) setOfferRemark(availableDraft.offerRemark || '');
    if (availableDraft.joiningDate !== undefined) setJoiningDate(availableDraft.joiningDate || '');
    if (availableDraft.joiningStatusText !== undefined) setJoiningStatusText(availableDraft.joiningStatusText || '');

    setLastDraftSaved(new Date(availableDraft.updatedAt).toLocaleTimeString());
    setAvailableDraft(null); // Hide draft prompt banner
  };

  const handleDismissDraft = async () => {
    setAvailableDraft(null);
    const draftId = candidate ? `candidate_${candidate.id}` : `new_recruiter_${token}`;
    try {
      await ensureFirebaseAuth();
      await deleteDoc(doc(db, 'candidateDrafts', draftId));
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `candidateDrafts/${draftId}`);
      } catch (specErr) {
        console.warn("Firestore candidateDrafts DELETE failed gracefully:", specErr);
      }
    }
  };

  useEffect(() => {
    if (candidate) {
      setName(candidate.name);
      setMobile(candidate.mobile);
      setEmail(candidate.email);
      setLocation(candidate.location);
      setCurrentCompany(candidate.currentCompany);
      setCurrentSalary(candidate.currentSalary.toString());
      setExpectedSalary(candidate.expectedSalary.toString());
      setExperience(candidate.experience.toString());
      setNoticePeriod(candidate.noticePeriod.toString());
      setSkills(candidate.skills || []);
      setTags(candidate.tags || []);
      setSource(candidate.source);
      setCallDate(candidate.callDate);
      setRemarks(candidate.remarks);
      setStatus(candidate.status);
      
      // Populate extra spreadsheet fields
      setTimeHour(candidate.timeHour || '');
      setRole(candidate.role || '');
      setInterviewDate(candidate.interviewDate || '');
      setDoneInterview(candidate.doneInterview || '');
      setNotDoneInterview(candidate.notDoneInterview || '');
      setRescheduleInterview(candidate.rescheduleInterview || '');
      setFeedback(candidate.feedback || '');
      setSelectionDate(candidate.selectionDate || '');
      setOfferReceivedSalary(candidate.offerReceivedSalary ? candidate.offerReceivedSalary.toString() : '');
      setOfferRemark(candidate.offerRemark || '');
      setJoiningDate(candidate.joiningDate || '');
      setJoiningStatusText(candidate.joiningStatusText || '');
    }
  }, [candidate]);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSkill.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTag.trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !mobile || !email || !location || !status) {
      setError("Please complete all required fields (*).");
      return;
    }

    // Phone validation
    const cleanPhone = mobile.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSaving(true);

    const payload = {
      name,
      mobile: cleanPhone,
      email,
      location,
      currentCompany: currentCompany || "N/A",
      currentSalary: Number(currentSalary) || 0,
      expectedSalary: Number(expectedSalary) || 0,
      experience: Number(experience) || 0,
      noticePeriod: Number(noticePeriod) || 0,
      skills,
      tags,
      source,
      callDate,
      remarks,
      status,
      
      // Extra spreadsheet fields
      timeHour,
      role,
      interviewDate,
      doneInterview,
      notDoneInterview,
      rescheduleInterview,
      feedback,
      selectionDate,
      offerReceivedSalary: Number(offerReceivedSalary) || 0,
      offerRemark,
      joiningDate,
      joiningStatusText
    };

    try {
      const url = candidate ? `/api/candidates/${candidate.id}` : '/api/candidates';
      const method = candidate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save candidate profiling.");
      }

      // Delete the auto-saved draft on successful save & register
      const draftId = candidate ? `candidate_${candidate.id}` : `new_recruiter_${token}`;
      try {
        await ensureFirebaseAuth();
        await deleteDoc(doc(db, 'candidateDrafts', draftId));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `candidateDrafts/${draftId}`);
        } catch (specErr) {
          console.warn("Firestore candidateDrafts DELETE failed gracefully:", specErr);
        }
      }

      onSaveSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while saving the candidate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-150 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden relative flex flex-col my-8 max-h-[90vh] text-slate-800">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{candidate ? 'Edit Candidate Profile' : 'Source New Candidate'}</h3>
            <p className="text-xs text-slate-500 mt-1">Screen resumes and log candidate profiles.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Restore Draft Banner */}
        {availableDraft && (
          <div className="bg-indigo-50 border-b border-indigo-100 p-4 flex items-center justify-between text-xs text-indigo-950 animate-pulse">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 animate-bounce" />
              <span>
                We recovered an unsaved draft from{' '}
                <span className="font-semibold">
                  {new Date(availableDraft.updatedAt).toLocaleTimeString()}
                </span>
                . Would you like to restore it?
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all cursor-pointer shadow-sm text-xs"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={handleDismissDraft}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-all cursor-pointer text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">1. Contact & Sourcing</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Candidate Full Name *</label>
                <input 
                  id="form-cand-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. Rahul Sen"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mobile Number * (10 Digits)</label>
                <input 
                  id="form-cand-mobile"
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address *</label>
                <input 
                  id="form-cand-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. rahul@gmail.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Current Location *</label>
                <input 
                  id="form-cand-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. Mumbai, Delhi"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Sourcing Channel</label>
                <select 
                  id="form-cand-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Naukri">Naukri</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Referral">Referral</option>
                  <option value="Direct Sourced">Direct Sourced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Initial Screening Date</label>
                <input 
                  id="form-cand-calldate"
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Professional Information */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">2. Compensation & Background</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Current Employer / Company</label>
                <input 
                  id="form-cand-company"
                  type="text"
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. TCS, Accenture"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Experience (Years)</label>
                <input 
                  id="form-cand-exp"
                  type="number"
                  step="0.5"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. 3.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Current CTC / Salary (Annual INR)</label>
                <input 
                  id="form-cand-cursal"
                  type="number"
                  value={currentSalary}
                  onChange={(e) => setCurrentSalary(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. 600000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Expected CTC / Salary (Annual INR)</label>
                <input 
                  id="form-cand-expsal"
                  type="number"
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. 950000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Notice Period (Days)</label>
                <input 
                  id="form-cand-notice"
                  type="number"
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. 30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Initial Sourcing Status *</label>
                <select 
                  id="form-cand-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CandidateStatus)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  required
                >
                  <option value={CandidateStatus.INTERESTED}>Interested</option>
                  <option value={CandidateStatus.FOLLOW_UP}>Follow-up Pool</option>
                  <option value={CandidateStatus.CALL_BACK_LATER}>Call Back Later</option>
                  <option value={CandidateStatus.NOT_INTERESTED}>Not Interested</option>
                  <option value={CandidateStatus.WRONG_NUMBER}>Wrong Number</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Skills & Custom Labels */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">3. Candidate Expertise & Labels</h4>
            
            {/* Dynamic Skills Builder */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Add Expertise Skills</label>
              <div className="flex space-x-2">
                <input 
                  id="form-skill-input"
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill(e))}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. React, Spring Boot, Figma"
                />
                <button 
                  id="form-add-skill-btn"
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm flex items-center justify-center cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {/* Skills Display */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {skills.map((skill) => (
                    <span 
                      key={skill} 
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50/50 border border-indigo-100 text-indigo-700 rounded-lg text-xs"
                    >
                      <span>{skill}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 hover:text-red-500 cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Labels / Tags Builder */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Custom Categorization Labels / Tags</span>
              </label>
              <div className="flex space-x-2">
                <input 
                  id="form-tag-input"
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(e))}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. Hot Profile, High Salary, Immediate Joiner, Lead material"
                />
                <button 
                  id="form-add-tag-btn"
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-sm flex items-center justify-center cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {/* Tags Display */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-xs font-medium"
                    >
                      <span>{tag}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(tag)}
                        className="text-emerald-400 hover:text-rose-500 cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Recruiter Remarks / Initial Feedback</label>
              <textarea 
                id="form-cand-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="Log notes about communications, technical capabilities or constraints..."
              />
            </div>

            {/* Sheet Tracker Extra Fields Section */}
            <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
              <h3 className="text-sm font-bold text-indigo-900 border-b border-indigo-50 pb-2 flex items-center space-x-2">
                <span>Spreadsheet Sourcing Tracker Sync Fields</span>
                <span className="text-[10px] bg-yellow-400 text-yellow-950 font-black px-1.5 py-0.5 rounded uppercase">Dual Sync Active</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Call Time Hour (TIME HOUR)</label>
                  <input 
                    id="form-sheet-time-hour"
                    type="text"
                    value={timeHour}
                    onChange={(e) => setTimeHour(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="e.g. 11:30 AM"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Target Position (Role)</label>
                  <input 
                    id="form-sheet-role"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="e.g. Frontend Dev"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Interview Date</label>
                  <input 
                    id="form-sheet-interview-date"
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Done Interview</label>
                  <select 
                    id="form-sheet-done-interview"
                    value={doneInterview}
                    onChange={(e) => setDoneInterview(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">-- Select --</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Rescheduled">Rescheduled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Not Done Interview</label>
                  <select 
                    id="form-sheet-not-done-interview"
                    value={notDoneInterview}
                    onChange={(e) => setNotDoneInterview(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">-- Select --</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Reschedule Remarks</label>
                  <input 
                    id="form-sheet-reschedule"
                    type="text"
                    value={rescheduleInterview}
                    onChange={(e) => setRescheduleInterview(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="e.g. Next week, Busy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Interview Feedback</label>
                  <input 
                    id="form-sheet-feedback"
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="Log feedback"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Selection Date</label>
                  <input 
                    id="form-sheet-selection-date"
                    type="date"
                    value={selectionDate}
                    onChange={(e) => setSelectionDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Offer Package CTC</label>
                  <input 
                    id="form-sheet-offer-ctc"
                    type="number"
                    value={offerReceivedSalary}
                    onChange={(e) => setOfferReceivedSalary(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="Offered CTC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Offer Remarks</label>
                  <input 
                    id="form-sheet-offer-remark"
                    type="text"
                    value={offerRemark}
                    onChange={(e) => setOfferRemark(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="e.g. Offered"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Joining Date</label>
                  <input 
                    id="form-sheet-joining-date"
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Joining Status text</label>
                  <input 
                    id="form-sheet-joining-status"
                    type="text"
                    value={joiningStatusText}
                    onChange={(e) => setJoiningStatusText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="e.g. Joined, Delayed"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            {autosaving && (
              <>
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                <span className="italic">Saving draft...</span>
              </>
            )}
            {!autosaving && lastDraftSaved && (
              <>
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span>Draft saved at {lastDraftSaved}</span>
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              id="form-cand-submit"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 cursor-pointer disabled:opacity-50 transition-all shadow-md hover:shadow-indigo-600/10"
            >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{candidate ? 'Update Profile' : 'Save & Register'}</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  </div>
  );
}
