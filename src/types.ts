/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "Admin",
  TEAM_LEADER = "Team Leader",
  HR_RECRUITER = "HR Recruiter"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  teamLeadId?: string;
  permissions?: string[];
  restrictedUserIds?: string[];
  meetingsDisabled?: boolean;
}

export enum CandidateStatus {
  INTERESTED = "Interested",
  NOT_INTERESTED = "Not Interested",
  FOLLOW_UP = "Follow-up",
  CALL_BACK_LATER = "Call Back Later",
  WRONG_NUMBER = "Wrong Number"
}

export interface Candidate {
  id: string;
  name: string;
  mobile: string;
  email: string;
  location: string;
  currentCompany: string;
  currentSalary: number;
  expectedSalary: number;
  experience: number; // in years
  noticePeriod: number; // in days
  skills: string[]; // array of skills
  tags?: string[]; // custom categorization tags
  recruiterId: string;
  recruiterName: string;
  source: string;
  callDate: string;
  remarks: string;
  status: CandidateStatus;
  createdAt: string;
  
  // Extra fields matching Google Sheets reference:
  timeHour?: string;
  role?: string;
  interviewDate?: string;
  doneInterview?: string;
  notDoneInterview?: string;
  rescheduleInterview?: string;
  feedback?: string;
  selectionDate?: string;
  offerReceivedSalary?: number;
  offerRemark?: string;
  joiningDate?: string;
  joiningStatusText?: string;
}

export enum InterviewStatus {
  SCHEDULED = "Scheduled",
  ATTENDED = "Attended",
  NO_SHOW = "No Show",
  RESCHEDULED = "Rescheduled"
}

export enum InterviewMode {
  ONLINE = "Online",
  OFFLINE = "Offline",
  TELEPHONIC = "Telephonic"
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  date: string;
  time: string;
  client: string;
  position: string;
  interviewMode: InterviewMode;
  status: InterviewStatus;
  remarks: string;
  scheduledBy: string;
  scheduledByName: string;
  createdAt: string;
}

export enum SelectionStatus {
  SELECTED = "Selected",
  REJECTED = "Rejected",
  HOLD = "Hold",
  PENDING = "Pending"
}

export interface Selection {
  id: string;
  candidateId: string;
  candidateName: string;
  status: SelectionStatus;
  date: string;
  remarks: string;
  updatedBy: string;
  updatedByName: string;
  createdAt: string;
}

export enum JoiningStatus {
  PENDING = "Pending",
  JOINED = "Joined",
  DID_NOT_JOIN = "Did Not Join"
}

export interface Joining {
  id: string;
  candidateId: string;
  candidateName: string;
  offerReleased: boolean;
  joiningDate: string;
  status: JoiningStatus;
  remarks: string;
  updatedBy: string;
  updatedByName: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCalls: number;
  interested: number;
  notInterested: number;
  followUp: number;
  interviewsScheduled: number;
  interviewsCompleted: number;
  selected: number;
  joined: number;
}

export interface RecruiterPerformance {
  recruiterId: string;
  recruiterName: string;
  totalCalls: number;
  interestedCount: number;
  interviewsScheduled: number;
  selections: number;
  joined: number;
  conversionRate: number; // percentage
}

export interface DailyReport {
  date: string;
  callsLogged: number;
  interested: number;
  notInterested: number;
  followUp: number;
  interviewsScheduled: number;
  interviewsAttended: number;
  selected: number;
  joined: number;
}

export interface WeeklyReport {
  weekRange: string;
  callsLogged: number;
  interested: number;
  interviewsScheduled: number;
  selected: number;
  joined: number;
}

export interface MonthlyReport {
  month: string;
  callsLogged: number;
  interested: number;
  interviewsScheduled: number;
  selected: number;
  joined: number;
}

export interface JoiningReportItem {
  candidateId: string;
  candidateName: string;
  recruiterName: string;
  position: string;
  client: string;
  offerReleasedDate: string;
  joiningDate: string;
  status: JoiningStatus;
  remarks: string;
}

export interface ConversionFunnelItem {
  stage: string;
  count: number;
  percentage: number; // calculated relative to total calls
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  message: string;
  timestamp: string;
  receiverId?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface TeamMeeting {
  id: string;
  title: string;
  description: string;
  meetingUrl: string;
  createdBy: string;
  creatorName: string;
  scheduledAt: string;
  createdAt: string;
  isActive: boolean;
  invitedUserIds?: string[];
}

export interface PastMeeting {
  id: string;
  meetingId?: string;
  title: string;
  description?: string;
  durationMinutes: number;
  participants: string[];
  completedAt: string;
}

export enum TaskStatus {
  PENDING = "Pending",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed"
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdBy: string;
  createdByName: string;
  createdByRole: UserRole;
  assignees: string[]; // array of user IDs
  createdAt: string;
  teamId?: string; // if created by a TL, identifies their team
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  createdAt: string;
}



