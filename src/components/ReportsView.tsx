/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Award, 
  BarChart, 
  Calendar, 
  Filter, 
  FileText, 
  ArrowDown, 
  Download, 
  User, 
  Briefcase,
  Loader2,
  PieChart,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { DailyReport, JoiningReportItem, ConversionFunnelItem, RecruiterPerformance } from '../types.js';

interface ReportsViewProps {
  token: string;
}

interface TimeToHireStage {
  stage: string;
  avgDays: number;
  candidatesCount: number;
}

interface TimeToHireRole {
  role: string;
  avgDays: number;
  candidatesCount: number;
}

interface TimeToHireData {
  stages: TimeToHireStage[];
  roles: TimeToHireRole[];
}

export default function ReportsView({ token }: ReportsViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data sets
  const [recruiterPerf, setRecruiterPerf] = useState<RecruiterPerformance[]>([]);
  const [dailyRep, setDailyRep] = useState<DailyReport[]>([]);
  const [joiningRep, setJoiningRep] = useState<JoiningReportItem[]>([]);
  const [funnel, setFunnel] = useState<ConversionFunnelItem[]>([]);
  const [timeToHire, setTimeToHire] = useState<TimeToHireData | null>(null);

  // Report Category State
  const [activeReportType, setActiveReportType] = useState<'recruiter' | 'daily' | 'joining' | 'funnel' | 'timetohire'>('recruiter');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load system reports");
      }

      setRecruiterPerf(data.recruiterPerformance || []);
      setDailyRep(data.dailyReport || []);
      setJoiningRep(data.joiningReport || []);
      setFunnel(data.conversionFunnel || []);
      setTimeToHire(data.timeToHireReport || null);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while compiling charts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  const triggerLocalPrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-8 text-slate-700 bg-slate-50 min-h-screen font-sans">
      
      {/* Header and Download buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">ATS Analytics & Reports</h2>
          <p className="text-xs text-slate-500 mt-1">Sourcing throughputs, team metrics, daily logs, conversion ratios, and onboarding schedules.</p>
        </div>
        <div className="flex space-x-2">
          <button
            id="btn-print-report"
            onClick={triggerLocalPrint}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 text-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Reports navigation filters */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 print:hidden">
        <button
          id="btn-report-type-recruiter"
          onClick={() => setActiveReportType('recruiter')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeReportType === 'recruiter'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 shadow-sm'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Recruiter Sourcing Performance</span>
        </button>

        <button
          id="btn-report-type-daily"
          onClick={() => setActiveReportType('daily')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeReportType === 'daily'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 shadow-sm'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Daily & Weekly Logging</span>
        </button>

        <button
          id="btn-report-type-joining"
          onClick={() => setActiveReportType('joining')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeReportType === 'joining'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 shadow-sm'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Onboarding & Joining List</span>
        </button>

        <button
          id="btn-report-type-funnel"
          onClick={() => setActiveReportType('funnel')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeReportType === 'funnel'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 shadow-sm'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Conversion Funnel Analysis</span>
        </button>

        <button
          id="btn-report-type-timetohire"
          onClick={() => setActiveReportType('timetohire')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeReportType === 'timetohire'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 shadow-sm'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Time-to-Hire (Recharts)</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs font-semibold">Compiling analytical metrics & reports...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-150 text-rose-700 rounded-xl text-xs text-center max-w-md mx-auto">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 1. RECRUITER PERFORMANCE */}
          {activeReportType === 'recruiter' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-md">Recruiter Throughput Rankings</h3>
                <p className="text-xs text-slate-500 mt-1">Aggregates tracking the sifting volumes, scheduled panel loops, and actual onboarding closures.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Recruiter</th>
                      <th className="py-3 px-4 font-semibold text-center">Calls Logged</th>
                      <th className="py-3 px-4 font-semibold text-center">Interested</th>
                      <th className="py-3 px-4 font-semibold text-center">Interviews Scheduled</th>
                      <th className="py-3 px-4 font-semibold text-center">Selections</th>
                      <th className="py-3 px-4 font-semibold text-center">Joined hires</th>
                      <th className="py-3 px-4 font-semibold text-right">Yield Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {recruiterPerf.map((rec) => (
                      <tr key={rec.recruiterId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{rec.recruiterName}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold">{rec.totalCalls}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-indigo-600 font-semibold">{rec.interestedCount}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-amber-600 font-semibold">{rec.interviewsScheduled}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-cyan-600 font-semibold">{rec.selections}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-emerald-600 font-semibold">{rec.joined}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-600">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[11px] font-bold">
                            {rec.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. DAILY REPORT */}
          {activeReportType === 'daily' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-md">Daily Log Metrics</h3>
                <p className="text-xs text-slate-500 mt-1">Granular analysis showing daily recruiter logging activity and candidates advancing through interviews.</p>
              </div>

              {dailyRep.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No daily logs registered in the selected window.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider bg-slate-50 font-semibold">
                        <th className="py-3 px-4 font-semibold">Activity Date</th>
                        <th className="py-3 px-4 font-semibold text-center">Calls Screened</th>
                        <th className="py-3 px-4 font-semibold text-center font-mono text-emerald-600">Interested</th>
                        <th className="py-3 px-4 font-semibold text-center text-slate-400">Not Interested</th>
                        <th className="py-3 px-4 font-semibold text-center text-indigo-400">Follow-up Pools</th>
                        <th className="py-3 px-4 font-semibold text-center text-amber-400">Interviews Booked</th>
                        <th className="py-3 px-4 font-semibold text-center text-cyan-400">Selected Offers</th>
                        <th className="py-3 px-4 font-semibold text-center text-emerald-400">Joined Placements</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {dailyRep.map((rep) => (
                        <tr key={rep.date} className="hover:bg-slate-50 transition-colors text-slate-700">
                          <td className="py-3.5 px-4 font-bold text-slate-800">{rep.date}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold">{rep.callsLogged}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-600">{rep.interested}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-semibold">{rep.notInterested}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-indigo-600 font-semibold">{rep.followUp}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-amber-600 font-semibold">{rep.interviewsScheduled}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-cyan-600 font-semibold">{rep.selected}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-emerald-600 font-semibold">{rep.joined}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. JOINING REPORT */}
          {activeReportType === 'joining' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-md">Onboarding & Placement Onboard Schedules</h3>
                <p className="text-xs text-slate-500 mt-1">Tracks candidate offer release events and actual scheduled corporate join dates.</p>
              </div>

              {joiningRep.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No onboarding schedules logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider bg-slate-50 font-semibold">
                        <th className="py-3 px-4">Candidate</th>
                        <th className="py-3 px-4">Target Client</th>
                        <th className="py-3 px-4">Target Designation</th>
                        <th className="py-3 px-4">Scheduled Join Date</th>
                        <th className="py-3 px-4">Onboarding Status</th>
                        <th className="py-3 px-4">Sourcing Recruiter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {joiningRep.map((joi) => (
                        <tr key={joi.candidateId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{joi.candidateName}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">{joi.client}</td>
                          <td className="py-3.5 px-4 text-slate-500">{joi.position}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-600">{joi.joiningDate}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              joi.status === 'Joined' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              joi.status === 'Did Not Join' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {joi.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{joi.recruiterName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. CONVERSION FUNNEL */}
          {activeReportType === 'funnel' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-md">Pipeline Yield & Drop-off Funnel</h3>
                <p className="text-xs text-slate-500 mt-1">Yield analysis across candidate screening filters and scheduled loops to onboarding join rates.</p>
              </div>

              <div className="space-y-6 max-w-2xl">
                {funnel.map((step, index) => (
                  <div key={step.stage} className="flex items-center space-x-4">
                    <div className="w-36 text-xs font-semibold text-slate-500 text-right shrink-0">{step.stage}</div>
                    
                    <div className="flex-1 h-8 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden relative flex items-center px-4 shadow-inner">
                      {/* Proportional background shading bar */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 opacity-80 transition-all duration-300 bg-indigo-600"
                        style={{ width: `${step.percentage}%` }}
                      />
                      <div className="relative z-10 flex justify-between w-full text-xs font-bold text-slate-800">
                        <span className={step.percentage > 40 ? "text-white" : "text-slate-800"}>{step.count} Candidates</span>
                        <span className={step.percentage > 80 ? "text-white" : "text-slate-800"}>{step.percentage}% Yield</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. TIME-TO-HIRE ANALYSIS (RECHARTS) */}
          {activeReportType === 'timetohire' && timeToHire && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Avg. Total Hire Time</span>
                    <h4 className="text-xl font-black text-slate-800 mt-0.5">
                      {timeToHire.stages.find(s => s.stage.includes("Overall"))?.avgDays || 22.5} Days
                    </h4>
                  </div>
                </div>

                <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Sourcing to Loop</span>
                    <h4 className="text-xl font-black text-slate-800 mt-0.5">
                      {timeToHire.stages.find(s => s.stage.includes("Sourcing"))?.avgDays || 3.5} Days
                    </h4>
                  </div>
                </div>

                <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Fastest Pipeline</span>
                    <h4 className="text-xl font-black text-emerald-600 mt-0.5">
                      {Math.min(...timeToHire.roles.map(r => r.avgDays))} Days
                    </h4>
                  </div>
                </div>

                <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Slowest Pipeline</span>
                    <h4 className="text-xl font-black text-rose-600 mt-0.5">
                      {Math.max(...timeToHire.roles.map(r => r.avgDays))} Days
                    </h4>
                  </div>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Time-to-Hire Across Stages */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Average Days Spent per Hiring Stage</h3>
                    <p className="text-[11px] text-slate-400">Calculates transit speeds from sourcing calls to interviews, panel evaluations, selections, and onboarding.</p>
                  </div>
                  <div className="h-72 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={timeToHire.stages}
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        barSize={32}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="stage" 
                          axisLine={false} 
                          tickLine={false} 
                          stroke="#94a3b8" 
                          tickFormatter={(val) => val.split(' ')[0]} 
                        />
                        <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" unit="d" />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                          labelStyle={{ fontWeight: 'bold', color: '#818cf8' }}
                        />
                        <Bar dataKey="avgDays" name="Avg. Duration (Days)" radius={[8, 8, 0, 0]}>
                          {timeToHire.stages.map((entry, index) => {
                            const colors = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Time-to-Hire By Role/Position */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Overall Time-to-Hire by Job Role</h3>
                    <p className="text-[11px] text-slate-400">Measures the absolute duration (in days) required to fully place and onboard candidates for each designation.</p>
                  </div>
                  <div className="h-72 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timeToHire.roles}
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="role" 
                          axisLine={false} 
                          tickLine={false} 
                          stroke="#94a3b8" 
                          tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + "..." : val}
                        />
                        <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" unit="d" />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                          labelStyle={{ fontWeight: 'bold', color: '#818cf8' }}
                        />
                        <Area type="monotone" dataKey="avgDays" name="Avg. Days to Onboard" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDays)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Table Data Source Detail */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Granular Stage Transit Logs</h3>
                  <p className="text-xs text-slate-500">The actual averages compiled from real-time updates and active recruitment selections.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Recruitment Phase Pipeline</th>
                        <th className="py-3 px-4 font-semibold text-center">Avg. Process Duration</th>
                        <th className="py-3 px-4 font-semibold text-center">Involved Cohort Size</th>
                        <th className="py-3 px-4 font-semibold text-right">Target Benchmark SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                      {timeToHire.stages.map((stageItem) => (
                        <tr key={stageItem.stage} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 text-slate-800 font-bold">{stageItem.stage}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600 bg-indigo-50/20">{stageItem.avgDays} Days</td>
                          <td className="py-3.5 px-4 text-center font-mono">{stageItem.candidatesCount} Candidate(s)</td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                              {stageItem.stage.includes("Onboard") ? "< 20 Days" : stageItem.stage.includes("Selection") ? "< 3 Days" : "< 5 Days"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
