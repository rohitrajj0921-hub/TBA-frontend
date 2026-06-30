/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  UserCheck, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  Search, 
  ArrowLeft, 
  ArrowRight, 
  Filter, 
  Info, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  ClipboardCheck, 
  UserPlus, 
  FileText,
  CalendarDays,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { User as UserType, Candidate, CandidateStatus, UserRole } from '../types.js';

interface DailyTrackerViewProps {
  token: string;
  currentUser: UserType;
}

// Interface for rich daily candidate activity records
interface SourcingRecord {
  id: string;
  name: string;
  email: string;
  mobile: string;
  location: string;
  role: string;
  experience: number;
  expectedSalary: number;
  currentSalary: number;
  status: 'Contacted' | 'Interested' | 'Interview Scheduled' | 'Follow-up' | 'Rejected';
  addedBy: string;
  addedByEmail: string;
  date: string; // YYYY-MM-DD
  time: string;
  remarks: string;
  skills: string[];
}

export default function DailyTrackerView({ token, currentUser }: DailyTrackerViewProps) {
  // Date selection state - Default to local formatted string
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teamUsers, setTeamUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive modal/panel states
  const [selectedBox, setSelectedBox] = useState<'contacted' | 'interested' | 'scheduled' | 'followup' | null>('contacted');
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<SourcingRecord | null>(null);
  const [showAllTimeReport, setShowAllTimeReport] = useState(false);
  const [allTimeSearch, setAllTimeSearch] = useState('');
  
  // Day-by-Day data injection form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formRole, setFormRole] = useState('Frontend Engineer');
  const [formStatus, setFormStatus] = useState<'Contacted' | 'Interested' | 'Interview Scheduled' | 'Follow-up' | 'Rejected'>('Interested');
  const [formRecruiterId, setFormRecruiterId] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formExperience, setFormExperience] = useState('3');
  const [formSalary, setFormSalary] = useState('1200000');
  const [formLocation, setFormLocation] = useState('Bengaluru');

  // Hardcoded historical seed data to guarantee beautiful clickable dashboards for previous days
  const historicalSeeds: SourcingRecord[] = useMemo(() => [
    {
      id: 'seed-9',
      name: 'Kunal Verma',
      email: 'kunal.verma@example.com',
      mobile: '+91 95432 10987',
      location: 'Bengaluru',
      role: 'Backend Engineer',
      experience: 5,
      expectedSalary: 1800000,
      currentSalary: 1350000,
      status: 'Interested',
      addedBy: 'Priya Patel',
      addedByEmail: 'priya@recruitcore.com',
      date: '2026-06-29',
      time: '10:00 AM',
      remarks: 'Strong experience with Node.js and system design. Clear communication.',
      skills: ['Node.js', 'TypeScript', 'Express', 'PostgreSQL']
    },
    {
      id: 'seed-10',
      name: 'Pooja Hegde',
      email: 'pooja.h@example.com',
      mobile: '+91 98761 23450',
      location: 'Hyderabad',
      role: 'Frontend Developer',
      experience: 3,
      expectedSalary: 1200000,
      currentSalary: 900000,
      status: 'Interview Scheduled',
      addedBy: 'Rohan Gupta',
      addedByEmail: 'rohan@recruitcore.com',
      date: '2026-06-29',
      time: '01:30 PM',
      remarks: 'Technically sound React developer. Set up round 1 evaluation.',
      skills: ['React', 'Tailwind CSS', 'Redux Toolkit']
    },
    {
      id: 'seed-1',
      name: 'Anjali Sharma',
      email: 'anjali.sharma@example.com',
      mobile: '+91 98765 43210',
      location: 'New Delhi',
      role: 'React Developer',
      experience: 4,
      expectedSalary: 1400000,
      currentSalary: 1000000,
      status: 'Interested',
      addedBy: 'Priya Patel',
      addedByEmail: 'priya@recruitcore.com',
      date: '2026-06-28',
      time: '11:30 AM',
      remarks: 'Excellent communication skills, strong grasp of state management and Hooks. Agreed to attend technical assessment round.',
      skills: ['React', 'Redux', 'TypeScript', 'Tailwind CSS']
    },
    {
      id: 'seed-2',
      name: 'Vikram Aditya',
      email: 'vikram.aditya@example.com',
      mobile: '+91 91234 56789',
      location: 'Bengaluru',
      role: 'Node.js Engineer',
      experience: 6,
      expectedSalary: 2200000,
      currentSalary: 1700000,
      status: 'Interview Scheduled',
      addedBy: 'Rohan Gupta',
      addedByEmail: 'rohan@recruitcore.com',
      date: '2026-06-28',
      time: '02:15 PM',
      remarks: 'Scheduled final panel evaluation with VP of Engineering for July 1st. Experienced with high-throughput microservices.',
      skills: ['Node.js', 'Express', 'Redis', 'PostgreSQL']
    },
    {
      id: 'seed-3',
      name: 'Siddharth Roy',
      email: 'siddharth.roy@example.com',
      mobile: '+91 88877 66554',
      location: 'Mumbai',
      role: 'Product Manager',
      experience: 5,
      expectedSalary: 1800000,
      currentSalary: 1400000,
      status: 'Follow-up',
      addedBy: 'Priya Patel',
      addedByEmail: 'priya@recruitcore.com',
      date: '2026-06-28',
      time: '10:00 AM',
      remarks: 'Currently evaluating counter-offer. Requested follow-up callback on Monday afternoon.',
      skills: ['Product Roadmapping', 'SQL', 'Agile Scrum']
    },
    {
      id: 'seed-4',
      name: 'Meera Nair',
      email: 'meera.nair@example.com',
      mobile: '+91 77766 55443',
      location: 'Chennai',
      role: 'UI/UX Designer',
      experience: 3,
      expectedSalary: 950000,
      currentSalary: 700000,
      status: 'Contacted',
      addedBy: 'Karan Malhotra',
      addedByEmail: 'karan@recruitcore.com',
      date: '2026-06-28',
      time: '04:50 PM',
      remarks: 'Sent initial portfolio submission link. Reviewing case study submissions.',
      skills: ['Figma', 'Prototyping', 'User Research']
    },
    {
      id: 'seed-5',
      name: 'Rohan Deshmukh',
      email: 'rohan.d@example.com',
      mobile: '+91 99887 76655',
      location: 'Pune',
      role: 'DevOps Engineer',
      experience: 8,
      expectedSalary: 3000000,
      currentSalary: 2400000,
      status: 'Interested',
      addedBy: 'Priya Patel',
      addedByEmail: 'priya@recruitcore.com',
      date: '2026-06-27',
      time: '09:45 AM',
      remarks: 'Strong experience with Docker/Kubernetes container orchestrations on AWS. Ready to accept immediate joining.',
      skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform']
    },
    {
      id: 'seed-6',
      name: 'Neha Kapoor',
      email: 'neha.kapoor@example.com',
      mobile: '+91 95554 44332',
      location: 'Gurugram',
      role: 'HR Executive',
      experience: 2,
      expectedSalary: 600000,
      currentSalary: 450000,
      status: 'Rejected',
      addedBy: 'Rohan Gupta',
      addedByEmail: 'rohan@recruitcore.com',
      date: '2026-06-27',
      time: '03:10 PM',
      remarks: 'Expected package beyond maximum band assigned for junior HR position.',
      skills: ['Sourcing', 'Employee Engagement']
    },
    {
      id: 'seed-7',
      name: 'Arjun Khanna',
      email: 'arjun.khanna@example.com',
      mobile: '+91 91112 22334',
      location: 'Hyderabad',
      role: 'Data Scientist',
      experience: 5,
      expectedSalary: 2400000,
      currentSalary: 1900000,
      status: 'Interview Scheduled',
      addedBy: 'Karan Malhotra',
      addedByEmail: 'karan@recruitcore.com',
      date: '2026-06-27',
      time: '11:00 AM',
      remarks: 'Scheduled live system design screening with Lead ML Architect.',
      skills: ['Python', 'PyTorch', 'SQL', 'LLMs']
    },
    {
      id: 'seed-8',
      name: 'Aishwarya Sen',
      email: 'aishwarya@example.com',
      mobile: '+91 93334 44555',
      location: 'Kolkata',
      role: 'QA Engineer',
      experience: 4,
      expectedSalary: 1100000,
      currentSalary: 850000,
      status: 'Follow-up',
      addedBy: 'Priya Patel',
      addedByEmail: 'priya@recruitcore.com',
      date: '2026-06-26',
      time: '02:30 PM',
      remarks: 'Pending feedback from previous client technical screening. Recruiter following up with panel.',
      skills: ['Selenium', 'Cypress', 'API Automation']
    },
  ], []);

  // Custom added candidates store in local storage to allow stateful day-by-day writes
  const [customRecords, setCustomRecords] = useState<SourcingRecord[]>(() => {
    try {
      const stored = localStorage.getItem('sourcing_custom_daily_records');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Fetch real candidates and users from DB on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const cRes = await fetch('/api/candidates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          setCandidates(cData);
        }

        const uRes = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (uRes.ok) {
          const uData = await uRes.json();
          setTeamUsers(uData);
          if (uData.length > 0) {
            setFormRecruiterId(uData[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching database data for Sourcing Tracker:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  // Merge database candidates with local storage records & hardcoded seed data
  const mergedSourcingRecords = useMemo(() => {
    // 1. Transform real candidates from DB into identical SourcingRecord format
    const dbSourcingRecords: SourcingRecord[] = candidates.map(cand => {
      // Determine YYYY-MM-DD from cand.callDate or cand.createdAt
      let recordDate = '';
      if (cand.callDate && cand.callDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        recordDate = cand.callDate;
      } else if (cand.createdAt) {
        recordDate = cand.createdAt.substring(0, 10);
      } else {
        recordDate = '2026-06-29'; // default fallback to today
      }

      // Map CandidateStatus enum to SourcingRecord status
      let s: SourcingRecord['status'] = 'Contacted';
      if (cand.status === CandidateStatus.INTERESTED) s = 'Interested';
      else if (cand.status === CandidateStatus.NOT_INTERESTED) s = 'Rejected';
      else if (cand.status === CandidateStatus.FOLLOW_UP) s = 'Follow-up';
      else if (cand.status === CandidateStatus.CALL_BACK_LATER) s = 'Follow-up';

      // Guess if interview scheduled
      if (cand.interviewDate) {
        s = 'Interview Scheduled';
      }

      return {
        id: cand.id,
        name: cand.name,
        email: cand.email || `${cand.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        mobile: cand.mobile || '+91 99999 99999',
        location: cand.location || 'Remote',
        role: cand.role || cand.targetRole || 'Software Engineer',
        experience: cand.experience || 3,
        expectedSalary: cand.expectedSalary || 1200000,
        currentSalary: cand.currentSalary || 900000,
        status: s,
        addedBy: cand.recruiterName || 'System Admin',
        addedByEmail: 'admin@recruitcore.com',
        date: recordDate,
        time: cand.timeHour || '10:00 AM',
        remarks: cand.remarks || 'Sourced through main recruitment pipeline.',
        skills: cand.skills || []
      };
    });

    // Combine all arrays
    return [...dbSourcingRecords, ...customRecords, ...historicalSeeds];
  }, [candidates, customRecords, historicalSeeds]);

  // Filter records by selected date
  const recordsForSelectedDate = useMemo(() => {
    return mergedSourcingRecords.filter(r => r.date === selectedDate);
  }, [mergedSourcingRecords, selectedDate]);

  // Aggregate counters for boxes
  const dailyAggregates = useMemo(() => {
    const list = recordsForSelectedDate;
    const contacted = list.length;
    const interested = list.filter(r => r.status === 'Interested').length;
    const scheduled = list.filter(r => r.status === 'Interview Scheduled').length;
    const followup = list.filter(r => r.status === 'Follow-up').length;

    return { contacted, interested, scheduled, followup };
  }, [recordsForSelectedDate]);

  // Clickable stats box drilldown list
  const drilledCandidates = useMemo(() => {
    const list = recordsForSelectedDate;
    if (selectedBox === 'contacted') return list;
    if (selectedBox === 'interested') return list.filter(r => r.status === 'Interested');
    if (selectedBox === 'scheduled') return list.filter(r => r.status === 'Interview Scheduled');
    if (selectedBox === 'followup') return list.filter(r => r.status === 'Follow-up');
    return [];
  }, [recordsForSelectedDate, selectedBox]);

  // All time report filtered records
  const allTimeRecordsFiltered = useMemo(() => {
    return mergedSourcingRecords.filter(r => {
      const term = allTimeSearch.toLowerCase();
      return (
        r.name.toLowerCase().includes(term) ||
        r.role.toLowerCase().includes(term) ||
        r.addedBy.toLowerCase().includes(term) ||
        r.status.toLowerCase().includes(term) ||
        r.date.includes(term)
      );
    });
  }, [mergedSourcingRecords, allTimeSearch]);

  // Change selected date helper
  const adjustDate = (days: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const setTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Submit day-by-day manual activity update candidate
  const handleAddSourcingLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formMobile.trim()) {
      alert("Please provide Candidate Name, Email, and Mobile number.");
      return;
    }

    const matchedRecruiter = teamUsers.find(u => u.id === formRecruiterId);
    const recruiterName = matchedRecruiter ? matchedRecruiter.name : currentUser.name;
    const recruiterEmail = matchedRecruiter ? matchedRecruiter.email : currentUser.email;

    const newRecord: SourcingRecord = {
      id: `custom-src-${Date.now()}`,
      name: formName,
      email: formEmail,
      mobile: formMobile,
      location: formLocation,
      role: formRole,
      experience: Number(formExperience) || 3,
      expectedSalary: Number(formSalary) || 1200000,
      currentSalary: Math.round((Number(formSalary) || 1200000) * 0.75),
      status: formStatus,
      addedBy: recruiterName,
      addedByEmail: recruiterEmail,
      date: selectedDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      remarks: formRemarks.trim() || "Manually updated via executive sourcing logger.",
      skills: formRole.toLowerCase().includes('frontend') 
        ? ['React', 'TypeScript', 'Tailwind CSS'] 
        : ['Node.js', 'Express', 'SQL', 'MongoDB']
    };

    const updated = [newRecord, ...customRecords];
    setCustomRecords(updated);
    localStorage.setItem('sourcing_custom_daily_records', JSON.stringify(updated));

    // Reset Form
    setFormName('');
    setFormEmail('');
    setFormMobile('');
    setFormRemarks('');
    setShowAddForm(false);
    
    alert(`Successfully saved sourcing log for ${formName} under selected day: ${selectedDate}!`);
  };

  return (
    <div className="space-y-6">

      {/* Main Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl border border-slate-850 shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-rose-600 rounded text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-white" /> Executive Tracker
            </span>
            <span className="text-xs text-rose-300 font-bold bg-rose-950/50 border border-rose-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-rose-400 animate-pulse" /> Sourcing Day-by-Day Update
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white mt-1">
            Daily Candidate Activity Monitor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Filter candidate metrics day-by-day, log manual recruitment updates, and drill down into individual profiles.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowAllTimeReport(!showAllTimeReport)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              showAllTimeReport 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-755 hover:text-white border border-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showAllTimeReport ? "Switch to Day Tracker" : "All-Time Detailed Report"}</span>
          </button>

          {!showAllTimeReport && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Manual Data</span>
            </button>
          )}
        </div>
      </div>

      {showAllTimeReport ? (
        /* ALL-TIME DETAILED REPORT PANEL */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">All-Time Detailed Sourcing Report</h3>
              <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
                Complete search and audit list of all candidates contacted, scheduled, and categorized across all dates.
              </p>
            </div>

            <button
              onClick={() => setShowAllTimeReport(false)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
            >
              Back to Date Selection
            </button>
          </div>

          {/* Search box for all-time view */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={allTimeSearch}
              onChange={(e) => setAllTimeSearch(e.target.value)}
              placeholder="Search candidate name, recruiter, status (e.g. 'Interested', 'Follow-up'), role or YYYY-MM-DD date..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2">
                  <th className="pb-3 pr-2">Date / Time</th>
                  <th className="pb-3 px-2">Candidate Info</th>
                  <th className="pb-3 px-2">Role & Exp</th>
                  <th className="pb-3 px-2">Sourced By</th>
                  <th className="pb-3 px-2 text-center">Status</th>
                  <th className="pb-3 pl-2 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {allTimeRecordsFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No candidate activity records match your search criteria.
                    </td>
                  </tr>
                ) : (
                  allTimeRecordsFiltered.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                      <td className="py-3.5 pr-2 font-mono text-slate-500 font-bold">
                        <div>{record.date}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{record.time}</div>
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="font-bold text-slate-900 dark:text-white">{record.name}</div>
                        <div className="text-[10px] text-slate-450 mt-0.5">{record.email}</div>
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="font-bold text-slate-800 dark:text-slate-300">{record.role}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{record.experience} Yrs Experience</div>
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="font-bold text-slate-800 dark:text-slate-300">{record.addedBy}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{record.addedByEmail}</div>
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          record.status === 'Interested' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                          record.status === 'Interview Scheduled' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' :
                          record.status === 'Follow-up' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                          record.status === 'Rejected' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3.5 pl-2 text-right">
                        <button
                          onClick={() => setSelectedCandidateDetail(record)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 rounded-md font-bold text-[10px] cursor-pointer"
                        >
                          View Info
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DATE SELECTOR & INTERACTIVE SOURCING LOGGER SCREEN */
        <div className="space-y-6">

          {/* Date Selector Navigation and "Today" button */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={() => adjustDate(-1)}
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:shadow-xs transition-all cursor-pointer"
                title="Previous Day"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Core Date Input picker */}
              <div className="relative flex-1 sm:flex-none">
                <Calendar className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 select-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => adjustDate(1)}
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:shadow-xs transition-all cursor-pointer"
                title="Next Day"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* "Today" and custom helper text */}
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <p className="text-[11px] text-slate-450 dark:text-slate-550 font-bold hidden md:block">
                Currently tracking: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{recordsForSelectedDate.length} Candidates</span> on this day
              </p>

              <button
                onClick={setTodayDate}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30 transition-all cursor-pointer"
              >
                Today
              </button>
            </div>

          </div>

          {/* Log Sourcing Data day-by-day Drawer/Form */}
          {showAddForm && (
            <div className="bg-slate-50/50 dark:bg-slate-950/25 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Add Sourcing Update Log for Selected Day ({selectedDate})
                  </h4>
                </div>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="text-slate-405 hover:text-slate-600 font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddSourcingLog} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Candidate Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Candidate Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Candidate Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Mobile */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="e.g. +91 99999 88888"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Profile Role</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="e.g. UI/UX Designer"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Log Category Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  >
                    <option value="Contacted">Sourced & Contacted</option>
                    <option value="Interested">Interested / Pre-Screened</option>
                    <option value="Interview Scheduled">Interview Scheduled</option>
                    <option value="Follow-up">Follow-up Pending</option>
                    <option value="Rejected">Not Interested / Rejected</option>
                  </select>
                </div>

                {/* Sourced By Recruiter Select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Recruiter</label>
                  <select
                    value={formRecruiterId}
                    onChange={(e) => setFormRecruiterId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  >
                    {teamUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                    <option value="admin">System Admin</option>
                  </select>
                </div>

                {/* Experience & Salary & Location */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Experience (Yrs)</label>
                  <input
                    type="number"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Expected Salary (₹)</label>
                  <input
                    type="number"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Remarks Row */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Executive Discussion remarks</label>
                  <input
                    type="text"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="Briefly log what the recruiter discussed with candidate..."
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Submit button */}
                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Save Sourcing Activity
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 1. CLICKABLE DAILY METRIC STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Box 1: Total Contacted */}
            <button
              onClick={() => setSelectedBox('contacted')}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all hover:shadow-md cursor-pointer ${
                selectedBox === 'contacted'
                  ? 'bg-slate-900 dark:bg-slate-950 text-white border-slate-900 dark:border-slate-800 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-black uppercase tracking-wider ${selectedBox === 'contacted' ? 'text-slate-450' : 'text-slate-400'}`}>
                  Total Contacted Today
                </span>
                <span className={`p-1.5 rounded-lg border text-indigo-500 ${selectedBox === 'contacted' ? 'bg-indigo-950/40 border-indigo-900/30' : 'bg-indigo-50 border-indigo-100'}`}><Users className="w-4 h-4" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black font-mono leading-none">{dailyAggregates.contacted}</h3>
                <p className={`text-[9px] mt-1 font-semibold ${selectedBox === 'contacted' ? 'text-indigo-400' : 'text-slate-500'}`}>
                  Total sourcing candidate logs on this date
                </p>
              </div>
            </button>

            {/* Box 2: Pre-Screened Interested */}
            <button
              id="box-interested"
              onClick={() => setSelectedBox('interested')}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all hover:shadow-md cursor-pointer ${
                selectedBox === 'interested'
                  ? 'bg-emerald-950 dark:bg-emerald-1000 text-white border-emerald-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-black uppercase tracking-wider ${selectedBox === 'interested' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  Interested Candidates
                </span>
                <span className={`p-1.5 rounded-lg border text-emerald-500 ${selectedBox === 'interested' ? 'bg-emerald-950 border-emerald-900' : 'bg-emerald-50 border-emerald-100'}`}><CheckCircle className="w-4 h-4" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black font-mono leading-none">{dailyAggregates.interested}</h3>
                <p className={`text-[9px] mt-1 font-semibold ${selectedBox === 'interested' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  Agreed to assessment/screen call on this date
                </p>
              </div>
            </button>

            {/* Box 3: Interviews Scheduled */}
            <button
              onClick={() => setSelectedBox('scheduled')}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all hover:shadow-md cursor-pointer ${
                selectedBox === 'scheduled'
                  ? 'bg-indigo-950 dark:bg-indigo-1000 text-white border-indigo-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-black uppercase tracking-wider ${selectedBox === 'scheduled' ? 'text-indigo-400' : 'text-slate-400'}`}>
                  Interviews Scheduled
                </span>
                <span className={`p-1.5 rounded-lg border text-indigo-500 ${selectedBox === 'scheduled' ? 'bg-indigo-950 border-indigo-900' : 'bg-indigo-50 border-indigo-100'}`}><ClipboardCheck className="w-4 h-4" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black font-mono leading-none">{dailyAggregates.scheduled}</h3>
                <p className={`text-[9px] mt-1 font-semibold ${selectedBox === 'scheduled' ? 'text-indigo-400' : 'text-slate-500'}`}>
                  Interviews booked on this specific date
                </p>
              </div>
            </button>

            {/* Box 4: Follow-up Pending */}
            <button
              onClick={() => setSelectedBox('followup')}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all hover:shadow-md cursor-pointer ${
                selectedBox === 'followup'
                  ? 'bg-amber-950 dark:bg-amber-1000 text-white border-amber-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-black uppercase tracking-wider ${selectedBox === 'followup' ? 'text-amber-400' : 'text-slate-400'}`}>
                  Follow-ups Pending
                </span>
                <span className={`p-1.5 rounded-lg border text-amber-500 ${selectedBox === 'followup' ? 'bg-amber-950 border-amber-900' : 'bg-amber-50 border-amber-100'}`}><Clock className="w-4 h-4" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black font-mono leading-none">{dailyAggregates.followup}</h3>
                <p className={`text-[9px] mt-1 font-semibold ${selectedBox === 'followup' ? 'text-amber-400' : 'text-slate-500'}`}>
                  Follow-ups logged by recruiters on this date
                </p>
              </div>
            </button>

          </div>

          {/* 2. COMPREHENSIVE LIST VIEW FOR THE DRILLDOWN BOX */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Box: Sourcing list under chosen category */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Sourcing List: {selectedBox === 'contacted' ? 'All Contacted Logs' : selectedBox === 'interested' ? 'Interested Candidates' : selectedBox === 'scheduled' ? 'Scheduled Interviews' : 'Follow-ups'} ({drilledCandidates.length})
                  </h4>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">Date: {selectedDate}</p>
              </div>

              {drilledCandidates.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400 text-center">
                  <Info className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold uppercase tracking-wider">No logged entries found</p>
                  <p className="text-[10px] text-slate-400 max-w-sm">No activity log matches the selected status category for {selectedDate}. Use the "Log Manual Data" button to record update events.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {drilledCandidates.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedCandidateDetail(item)}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-950/10 px-2 rounded-xl transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs">{item.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">({item.time})</span>
                        </div>
                        <p className="text-[11px] text-slate-650 dark:text-slate-400 truncate max-w-md font-semibold">{item.remarks}</p>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-800 dark:text-slate-350">{item.role}</p>
                          <p className="text-[9px] font-bold uppercase text-indigo-650 dark:text-indigo-400">By: {item.addedBy}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Box: Absolute detailed information regarding selected Candidate */}
            <div className="lg:col-span-1">
              {selectedCandidateDetail ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 sticky top-24">
                  
                  {/* Detailed Candidate Card Header */}
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center font-black text-sm uppercase shadow-sm">
                      {selectedCandidateDetail.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-950 dark:text-white leading-tight">{selectedCandidateDetail.name}</h4>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-bold mt-0.5">{selectedCandidateDetail.role}</p>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">{selectedCandidateDetail.email}</p>
                    </div>
                  </div>

                  {/* Added Info Metadata */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                      <span>Sourcing Log metadata</span>
                      <span className="font-extrabold uppercase text-[8px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                        {selectedCandidateDetail.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                      <div>
                        <p className="text-slate-400 uppercase text-[8px] font-black tracking-wider">Sourced By Recruiter</p>
                        <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedCandidateDetail.addedBy}</p>
                        <p className="text-[9px] text-slate-450 font-semibold">{selectedCandidateDetail.addedByEmail}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase text-[8px] font-black tracking-wider">Sourcing Event Date</p>
                        <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">{selectedCandidateDetail.date}</p>
                        <p className="text-[9px] text-slate-450 font-semibold font-mono">Logged at {selectedCandidateDetail.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Details stats */}
                  <div className="space-y-3.5">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Candidate Particulars</h5>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                        <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider flex items-center gap-1">
                          <Phone className="w-3 h-3 text-indigo-500" /> Phone
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white font-mono">{selectedCandidateDetail.mobile}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                        <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-500" /> Location
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white truncate">{selectedCandidateDetail.location}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                        <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-indigo-500" /> Experience
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white font-mono">{selectedCandidateDetail.experience} Years</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950/10 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                        <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-indigo-500" /> Exp Salary
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white font-mono">₹{(selectedCandidateDetail.expectedSalary / 100000).toFixed(1)} LPA</p>
                      </div>
                    </div>
                  </div>

                  {/* Discussion Remarks */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Recruiter Evaluation remarks</h5>
                    <div className="bg-slate-50 dark:bg-slate-950/10 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 font-medium text-slate-750 dark:text-slate-300 leading-relaxed">
                      {selectedCandidateDetail.remarks}
                    </div>
                  </div>

                  {/* Skills tags */}
                  {selectedCandidateDetail.skills.length > 0 && (
                    <div className="space-y-2 text-xs">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Profile Tag Skills</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidateDetail.skills.map((skill, index) => (
                          <span key={index} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedCandidateDetail(null)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Clear Selected View
                  </button>

                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 italic space-y-2 sticky top-24">
                  <Info className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select a candidate list item</p>
                  <p className="text-[10px] text-slate-400">Click any candidate item listed in the central sourcing panel to display all related logs, remarks, salaries, and the recruiter details who added the profile.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
