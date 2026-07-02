/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { 
  User, 
  UserRole, 
  Candidate, 
  CandidateStatus, 
  Interview, 
  InterviewStatus, 
  InterviewMode, 
  Selection, 
  SelectionStatus, 
  Joining, 
  JoiningStatus,
  ChatMessage,
  ActivityLog,
  TeamMeeting,
  PastMeeting,
  Task,
  TaskComment,
  TaskStatus
} from './src/types.js';

const DB_PATH = path.join(process.cwd(), 'db.json');

interface Schema {
  users: (User & { passwordHash: string })[];
  candidates: Candidate[];
  interviews: Interview[];
  selections: Selection[];
  joinings: Joining[];
  messages: ChatMessage[];
  settings?: {
    showLoginDemoInfo: boolean;
  };
  logs: ActivityLog[];
  meetings?: TeamMeeting[];
  pastMeetings?: PastMeeting[];
  tasks?: Task[];
  taskComments?: TaskComment[];
}

// Basic hash function to avoid storing plain passwords in DB
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'hash_' + hash.toString(16);
}

const INITIAL_DB: Schema = {
  users: [
    {
      id: "usr_rohit",
      name: "Rohit Raj",
      email: "rohitrajj2109@gmail.com",
      role: UserRole.ADMIN,
      passwordHash: hashPassword("9523103315"),
      createdAt: "2026-06-29T15:00:00Z"
    },
    {
      id: "usr_rohit_real",
      name: "Rohit Raj",
      email: "rohitrajj0921@gmail.com",
      role: UserRole.ADMIN,
      passwordHash: hashPassword("9523103315"),
      createdAt: "2026-06-30T04:30:00Z"
    }
  ],
  candidates: [],
  interviews: [],
  selections: [],
  joinings: [],
  messages: [],
  settings: {
    showLoginDemoInfo: false
  },
  logs: [],
  meetings: [],
  pastMeetings: [],
  tasks: [],
  taskComments: []
};

export class ATSDatabase {
  private static db: any = null;
  private static supabaseClient: any = null;
  private static cache: Schema = INITIAL_DB;
  private static isInitialized = false;

  private static async writeToSupabase(tableName: string, docId: string, record: any) {
    if (!this.supabaseClient) return;
    try {
      const cleaned = { ...record };
      const { error } = await this.supabaseClient.from(tableName).upsert(cleaned);
      if (error) {
        console.error(`Supabase error writing to '${tableName}':`, error.message);
      }
    } catch (err: any) {
      console.error(`Supabase exception writing to '${tableName}':`, err.message);
    }
  }

  private static async deleteFromSupabase(tableName: string, docId: string) {
    if (!this.supabaseClient) return;
    try {
      const { error } = await this.supabaseClient.from(tableName).delete().eq('id', docId);
      if (error) {
        console.error(`Supabase error deleting from '${tableName}':`, error.message);
      }
    } catch (err: any) {
      console.error(`Supabase exception deleting from '${tableName}':`, err.message);
    }
  }

  private static async syncFromSupabase() {
    if (!this.supabaseClient) return;

    let tableMissingLogged = false;
    const fetchTable = async (tableName: string, fallback: any[]) => {
      try {
        const { data, error } = await this.supabaseClient.from(tableName).select('*');
        if (error) {
          if (!tableMissingLogged) {
            console.warn("\n[SUPABASE CONFIGURATION SUGGESTION]");
            console.warn(`If you haven't created the tables in your Supabase project yet, please run this SQL in your Supabase SQL Editor:`);
            console.warn(`
-- SQL Script to set up Supabase Tables:
create table if not exists users (id text primary key, name text, email text, role text, "passwordHash" text, "createdAt" text, "teamLeadId" text, permissions jsonb, "restrictedUserIds" jsonb, "meetingsDisabled" boolean);
create table if not exists candidates (id text primary key, name text, email text, mobile text, location text, experience text, role text, "currentCompany" text, "resumeUrl" text, "recruiterId" text, "recruiterName" text, status text, "createdAt" text, "joiningDate" text);
create table if not exists interviews (id text primary key, "candidateId" text, "candidateName" text, "recruiterId" text, "recruiterName" text, "interviewerName" text, "scheduledTime" text, mode text, "meetingLink" text, status text, feedback text, rating integer, "createdAt" text);
create table if not exists selections (id text primary key, "candidateId" text, "candidateName" text, "recruiterId" text, "recruiterName" text, "offeredLpa" numeric, "offeredRole" text, "offerLetterUrl" text, status text, "createdAt" text);
create table if not exists joinings (id text primary key, "candidateId" text, "candidateName" text, "recruiterId" text, "recruiterName" text, "joiningDate" text, status text, "createdAt" text);
create table if not exists messages (id text primary key, "userId" text, "userName" text, "userRole" text, content text, timestamp text, "receiverId" text);
create table if not exists logs (id text primary key, "userId" text, "userName" text, "userEmail" text, "userRole" text, action text, details text, timestamp text);
create table if not exists settings (id text primary key, "showLoginDemoInfo" boolean);
create table if not exists meetings (id text primary key, topic text, date text, "startTime" text, "endTime" text, "hostId" text, "hostName" text, "meetingUrl" text, "invitees" jsonb, "createdAt" text);
create table if not exists past_meetings (id text primary key, topic text, date text, "startTime" text, "endTime" text, "hostId" text, "hostName" text, "meetingUrl" text, "invitees" jsonb, "createdAt" text, "recordingUrl" text, transcript text, summary text);
create table if not exists tasks (id text primary key, title text, description text, "assignedToId" text, "assignedToName" text, "candidateId" text, "candidateName" text, "dueDate" text, status text, priority text, "creatorId" text, "creatorName" text, "createdAt" text);
create table if not exists task_comments (id text primary key, "taskId" text, "userId" text, "userName" text, content text, "createdAt" text);
            `);
            tableMissingLogged = true;
          }
          console.warn(`Could not sync table '${tableName}' from Supabase yet (Message: ${error.message}). Falling back to local offline DB cache.`);
          return fallback;
        }
        return data || fallback;
      } catch (err: any) {
        console.warn(`Exception syncing '${tableName}' from Supabase: ${err.message}`);
        return fallback;
      }
    };

    const usersList = await fetchTable('users', INITIAL_DB.users);
    const candidatesList = await fetchTable('candidates', INITIAL_DB.candidates);
    const interviewsList = await fetchTable('interviews', INITIAL_DB.interviews);
    const selectionsList = await fetchTable('selections', INITIAL_DB.selections);
    const joiningsList = await fetchTable('joinings', INITIAL_DB.joinings);
    const messagesList = await fetchTable('messages', INITIAL_DB.messages);
    const logsList = await fetchTable('logs', INITIAL_DB.logs);
    
    const settingsList = await fetchTable('settings', []);
    const settingsObj = settingsList.length > 0 ? settingsList[0] : (INITIAL_DB.settings || { showLoginDemoInfo: true });

    const meetingsList = await fetchTable('meetings', []);
    const pastMeetingsList = await fetchTable('past_meetings', []);
    const tasksList = await fetchTable('tasks', []);
    const taskCommentsList = await fetchTable('task_comments', []);

    this.cache = {
      users: usersList,
      candidates: candidatesList,
      interviews: interviewsList,
      selections: selectionsList,
      joinings: joiningsList,
      messages: messagesList,
      settings: settingsObj,
      logs: logsList,
      meetings: meetingsList,
      pastMeetings: pastMeetingsList,
      tasks: tasksList,
      taskComments: taskCommentsList
    };

    this.saveToFile(this.cache);
  }

  static async initialize() {
    try {
      let supabaseUrl = process.env.SUPABASE_URL;
      if (supabaseUrl) {
        supabaseUrl = supabaseUrl.trim();
        if (supabaseUrl.endsWith("/")) {
          supabaseUrl = supabaseUrl.slice(0, -1);
        }
        if (supabaseUrl.endsWith("/rest/v1")) {
          supabaseUrl = supabaseUrl.replace("/rest/v1", "");
        }
      }

      const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        console.log("================ SUPABASE DETECTED ================");
        console.log(`Connecting to Supabase at: ${supabaseUrl}`);
        this.supabaseClient = createClient(supabaseUrl, supabaseKey);
        await this.syncFromSupabase();
        this.ensureDefaultUsers();
        
        const hasDemoData = this.cache.candidates?.some(c => 
          ['cand_1', 'cand_vikram', 'cand_sneha', 'cand_amit', 'cand_meera'].includes(c.id) || 
          c.name.includes("Rohan")
        ) || this.cache.users?.some(u => 
          ['usr_aditi', 'usr_kunal', 'usr_riya'].includes(u.id)
        );

        if (hasDemoData) {
          await this.wipeDummyData();
        }
        this.isInitialized = true;
        console.log("Supabase initialization complete.");
        console.log("==================================================");
        return;
      }

      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) {
        console.log("Firebase config file not found. Falling back to local file-based JSON database.");
        this.cache = this.loadFromFile();
        this.ensureDefaultUsers();
        const hasDemoData = this.cache.candidates?.some(c => 
          ['cand_1', 'cand_vikram', 'cand_sneha', 'cand_amit', 'cand_meera'].includes(c.id) || 
          c.name.includes("Rohan")
        ) || this.cache.users?.some(u => 
          ['usr_aditi', 'usr_kunal', 'usr_riya'].includes(u.id)
        );

        if (hasDemoData) {
          await this.wipeDummyData();
        }
        return;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const app = getApps().length === 0 ? initializeApp({
        projectId: config.projectId
      }) : getApps()[0];
      
      let dbInstance;
      if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
        dbInstance = getFirestore(app, config.firestoreDatabaseId);
      } else {
        dbInstance = getFirestore(app);
      }
      dbInstance.settings({ ignoreUndefinedProperties: true });

      // Verify connection by performing a test read
      try {
        await dbInstance.collection('users').limit(1).get();
        this.db = dbInstance;
        console.log("Firebase Admin SDK initialized successfully and verified connection.");
      } catch (connErr: any) {
        console.log(`Unable to connect to database ID "${config.firestoreDatabaseId}". Trying default database fallback...`);
        // Try fallback to (default) database if different
        if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
          const fallbackDb = getFirestore(app);
          fallbackDb.settings({ ignoreUndefinedProperties: true });
          try {
            await fallbackDb.collection('users').limit(1).get();
            this.db = fallbackDb;
            console.log("Fallback to (default) database succeeded and verified connection.");
          } catch (fallbackErr: any) {
            console.log("Default database fallback was not reachable either.");
            throw connErr;
          }
        } else {
          throw connErr;
        }
      }

      console.log("Synchronizing Firestore collections...");
      await this.syncFromFirestore();
      this.ensureDefaultUsers();
      const hasDemoData = this.cache.candidates?.some(c => 
        ['cand_1', 'cand_vikram', 'cand_sneha', 'cand_amit', 'cand_meera'].includes(c.id) || 
        c.name.includes("Rohan")
      ) || this.cache.users?.some(u => 
        ['usr_aditi', 'usr_kunal', 'usr_riya'].includes(u.id)
      );

      if (hasDemoData) {
        await this.wipeDummyData();
      }
      this.setupRealtimeListeners();
      this.isInitialized = true;
      console.log("Firestore synchronization complete and live sync active.");
    } catch (err: any) {
      console.log("Firestore database is temporarily unreachable or permissions are propagating. Using robust offline/local-file storage backup instead.");
      this.db = null; // Ensure db is null so subsequent operations safely use local file DB fallback
      this.cache = this.loadFromFile();
      this.ensureDefaultUsers();
      const hasDemoDataBackup = this.cache.candidates?.some(c => 
        ['cand_1', 'cand_vikram', 'cand_sneha', 'cand_amit', 'cand_meera'].includes(c.id) || 
        c.name.includes("Rohan")
      ) || this.cache.users?.some(u => 
        ['usr_aditi', 'usr_kunal', 'usr_riya'].includes(u.id)
      );

      if (hasDemoDataBackup) {
        await this.wipeDummyData();
      }
    }
  }

  static async wipeDummyData() {
    console.log("Wiping dummy data from RecruitCore database...");
    
    // 1. Clean the local cache arrays
    this.cache.candidates = [];
    this.cache.interviews = [];
    this.cache.selections = [];
    this.cache.joinings = [];
    this.cache.messages = [];
    this.cache.logs = [];
    this.cache.meetings = [];
    this.cache.pastMeetings = [];
    this.cache.tasks = [];
    this.cache.taskComments = [];
    
    // Filter users to keep only our real/default admins
    this.cache.users = (this.cache.users || []).filter(u => 
      u && u.email && (
        u.email.toLowerCase() === "rohitrajj2109@gmail.com" || 
        u.email.toLowerCase() === "rohitrajj0921@gmail.com"
      )
    );

    // Default system settings
    this.cache.settings = {
      showLoginDemoInfo: false
    };

    // 2. Save the clean cache locally
    this.saveToFile(this.cache);

    // 3. Clear Firestore collections if connected
    if (this.db) {
      const collectionsToWipe = [
        'candidates', 'interviews', 'selections', 'joinings', 
        'messages', 'logs', 'meetings', 'pastMeetings', 'tasks', 'taskComments'
      ];

      for (const colName of collectionsToWipe) {
        try {
          const snapshot = await this.db.collection(colName).get();
          if (!snapshot.empty) {
            const batch = this.db.batch();
            snapshot.forEach((doc: any) => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Successfully wiped Firestore collection: ${colName}`);
          }
        } catch (e: any) {
          console.error(`Error wiping collection ${colName}:`, e.message);
        }
      }

      // Sync settings
      try {
        await this.db.collection('settings').doc('system').set(this.cache.settings);
      } catch (e: any) {
        console.error("Error updating system settings in Firestore:", e.message);
      }

      // Filter Firestore users: delete non-admin dummy users
      try {
        const usersSnapshot = await this.db.collection('users').get();
        if (!usersSnapshot.empty) {
          const batch = this.db.batch();
          let count = 0;
          usersSnapshot.forEach((doc: any) => {
            const userData = doc.data();
            const email = (userData.email || "").toLowerCase();
            if (email !== "rohitrajj2109@gmail.com" && email !== "rohitrajj0921@gmail.com") {
              batch.delete(doc.ref);
              count++;
            }
          });
          if (count > 0) {
            await batch.commit();
            console.log(`Deleted ${count} dummy users from Firestore.`);
          }
        }
      } catch (e: any) {
        console.error("Error cleaning users in Firestore:", e.message);
      }
    }
    
    console.log("Dummy data wipe complete.");
  }

  private static ensureDefaultUsers() {
    const defaultUsers = [
      {
        id: "usr_rohit",
        name: "Rohit Raj",
        email: "rohitrajj2109@gmail.com",
        role: UserRole.ADMIN,
        passwordHash: hashPassword("9523103315")
      },
      {
        id: "usr_rohit_real",
        name: "Rohit Raj",
        email: "rohitrajj0921@gmail.com",
        role: UserRole.ADMIN,
        passwordHash: hashPassword("9523103315")
      }
    ];

    let updated = false;
    for (const u of defaultUsers) {
      const found = (this.cache.users || []).find(existing => existing && existing.email && existing.email.toLowerCase() === u.email.toLowerCase());
      if (!found) {
        console.log(`Ensuring default admin user ${u.email} exists in database...`);
        const defaultAdmin = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash: u.passwordHash,
          createdAt: new Date().toISOString(),
          permissions: ['candidates', 'interviews', 'pipeline', 'reports', 'chat'],
          restrictedUserIds: [],
          meetingsDisabled: false
        };
        this.cache.users.push(defaultAdmin);
        updated = true;
        if (this.db) {
          this.db.collection('users').doc(defaultAdmin.id).set(defaultAdmin)
            .catch((err: any) => console.error("Firestore write error (ensureDefaultUsers):", err));
        }
      }
    }
    if (updated) {
      this.saveToFile(this.cache);
    }
  }

  private static async syncFromFirestore() {
    if (!this.db) return;

    // 1. Sync Users
    const usersSnapshot = await this.db.collection('users').get();
    let usersList: any[] = [];
    if (usersSnapshot.empty) {
      console.log("Seeding empty Firestore users collection...");
      const batch = this.db.batch();
      INITIAL_DB.users.forEach(user => {
        batch.set(this.db!.collection('users').doc(user.id), user);
      });
      await batch.commit();
      usersList = INITIAL_DB.users;
    } else {
      usersSnapshot.forEach((doc: any) => {
        usersList.push(doc.data());
      });
    }

    // 2. Sync Candidates
    const candidatesSnapshot = await this.db.collection('candidates').get();
    let candidatesList: any[] = [];
    if (candidatesSnapshot.empty) {
      console.log("Seeding empty Firestore candidates collection...");
      const batch = this.db.batch();
      INITIAL_DB.candidates.forEach(cand => {
        batch.set(this.db!.collection('candidates').doc(cand.id), cand);
      });
      await batch.commit();
      candidatesList = INITIAL_DB.candidates;
    } else {
      candidatesSnapshot.forEach((doc: any) => {
        candidatesList.push(doc.data());
      });
    }

    // 3. Sync Interviews
    const interviewsSnapshot = await this.db.collection('interviews').get();
    let interviewsList: any[] = [];
    if (interviewsSnapshot.empty) {
      console.log("Seeding empty Firestore interviews collection...");
      const batch = this.db.batch();
      INITIAL_DB.interviews.forEach(intv => {
        batch.set(this.db!.collection('interviews').doc(intv.id), intv);
      });
      await batch.commit();
      interviewsList = INITIAL_DB.interviews;
    } else {
      interviewsSnapshot.forEach((doc: any) => {
        interviewsList.push(doc.data());
      });
    }

    // 4. Sync Selections
    const selectionsSnapshot = await this.db.collection('selections').get();
    let selectionsList: any[] = [];
    if (selectionsSnapshot.empty) {
      console.log("Seeding empty Firestore selections collection...");
      const batch = this.db.batch();
      INITIAL_DB.selections.forEach(sel => {
        batch.set(this.db!.collection('selections').doc(sel.id), sel);
      });
      await batch.commit();
      selectionsList = INITIAL_DB.selections;
    } else {
      selectionsSnapshot.forEach((doc: any) => {
        selectionsList.push(doc.data());
      });
    }

    // 5. Sync Joinings
    const joiningsSnapshot = await this.db.collection('joinings').get();
    let joiningsList: any[] = [];
    if (joiningsSnapshot.empty) {
      console.log("Seeding empty Firestore joinings collection...");
      const batch = this.db.batch();
      INITIAL_DB.joinings.forEach(joi => {
        batch.set(this.db!.collection('joinings').doc(joi.id), joi);
      });
      await batch.commit();
      joiningsList = INITIAL_DB.joinings;
    } else {
      joiningsSnapshot.forEach((doc: any) => {
        joiningsList.push(doc.data());
      });
    }

    // 6. Sync Messages
    const messagesSnapshot = await this.db.collection('messages').get();
    let messagesList: any[] = [];
    if (messagesSnapshot.empty) {
      console.log("Seeding empty Firestore messages collection...");
      const batch = this.db.batch();
      INITIAL_DB.messages.forEach(msg => {
        batch.set(this.db!.collection('messages').doc(msg.id), msg);
      });
      await batch.commit();
      messagesList = INITIAL_DB.messages;
    } else {
      messagesSnapshot.forEach((doc: any) => {
        messagesList.push(doc.data());
      });
    }

    // 6.5 Sync Logs
    const logsSnapshot = await this.db.collection('logs').get();
    let logsList: any[] = [];
    if (logsSnapshot.empty) {
      console.log("Seeding Firestore logs collection with default audit records...");
      const batch = this.db.batch();
      INITIAL_DB.logs.forEach(log => {
        batch.set(this.db!.collection('logs').doc(log.id), log);
      });
      await batch.commit();
      logsList = INITIAL_DB.logs;
    } else {
      logsSnapshot.forEach((doc: any) => {
        logsList.push(doc.data());
      });
    }

    // 7. Sync Settings
    const settingsDoc = await this.db.collection('settings').doc('system').get();
    let settingsObj = INITIAL_DB.settings || { showLoginDemoInfo: true };
    if (!settingsDoc.exists) {
      console.log("Seeding empty Firestore system settings document...");
      await this.db.collection('settings').doc('system').set(settingsObj);
    } else {
      settingsObj = settingsDoc.data() as any;
    }

    // 7.5 Sync Meetings
    const meetingsSnapshot = await this.db.collection('meetings').get();
    let meetingsList: any[] = [];
    if (meetingsSnapshot.empty) {
      console.log("Seeding empty Firestore meetings collection...");
      meetingsList = [];
    } else {
      meetingsSnapshot.forEach((doc: any) => {
        meetingsList.push(doc.data());
      });
    }

    // 7.6 Sync Past Meetings
    const pastMeetingsSnapshot = await this.db.collection('past_meetings').get();
    let pastMeetingsList: any[] = [];
    if (pastMeetingsSnapshot.empty) {
      console.log("Seeding empty Firestore past_meetings collection...");
      pastMeetingsList = [];
    } else {
      pastMeetingsSnapshot.forEach((doc: any) => {
        pastMeetingsList.push(doc.data());
      });
    }

    // 7.7 Sync Tasks
    const tasksSnapshot = await this.db.collection('tasks').get();
    let tasksList: any[] = [];
    if (!tasksSnapshot.empty) {
      tasksSnapshot.forEach((doc: any) => {
        tasksList.push(doc.data());
      });
    }

    // 7.8 Sync Task Comments
    const taskCommentsSnapshot = await this.db.collection('task_comments').get();
    let taskCommentsList: any[] = [];
    if (!taskCommentsSnapshot.empty) {
      taskCommentsSnapshot.forEach((doc: any) => {
        taskCommentsList.push(doc.data());
      });
    }

    this.cache = {
      users: usersList,
      candidates: candidatesList,
      interviews: interviewsList,
      selections: selectionsList,
      joinings: joiningsList,
      messages: messagesList,
      settings: settingsObj,
      logs: logsList,
      meetings: meetingsList,
      pastMeetings: pastMeetingsList,
      tasks: tasksList,
      taskComments: taskCommentsList
    };

    // Save cache backup locally
    this.saveToFile(this.cache);
  }

  private static setupRealtimeListeners() {
    if (!this.db) return;
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      console.log("Running in serverless/production environment. Disabling real-time Firestore listeners to prevent container timeouts and exhaustion.");
      return;
    }

    this.db.collection('users').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      if (list.length > 0) {
        this.cache.users = list;
        this.saveToFile(this.cache);
      }
    }, (err: any) => console.error("Firestore users live sync error:", err));

    this.db.collection('candidates').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      if (list.length > 0) {
        this.cache.candidates = list;
        this.saveToFile(this.cache);
      }
    }, (err: any) => console.error("Firestore candidates live sync error:", err));

    this.db.collection('interviews').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      if (list.length > 0) {
        this.cache.interviews = list;
        this.saveToFile(this.cache);
      }
    }, (err: any) => console.error("Firestore interviews live sync error:", err));

    this.db.collection('selections').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      if (list.length > 0) {
        this.cache.selections = list;
        this.saveToFile(this.cache);
      }
    }, (err: any) => console.error("Firestore selections live sync error:", err));

    this.db.collection('joinings').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      if (list.length > 0) {
        this.cache.joinings = list;
        this.saveToFile(this.cache);
      }
    }, (err: any) => console.error("Firestore joinings live sync error:", err));

    this.db.collection('messages').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      this.cache.messages = list;
      this.saveToFile(this.cache);
    }, (err: any) => console.error("Firestore messages live sync error:", err));

    this.db.collection('logs').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      this.cache.logs = list;
      this.saveToFile(this.cache);
    }, (err: any) => console.error("Firestore logs live sync error:", err));

    this.db.collection('settings').doc('system').onSnapshot((snap: any) => {
      if (snap.exists) {
        this.cache.settings = snap.data() as any;
        this.saveToFile(this.cache);
      }
    }, (err: any) => console.error("Firestore settings live sync error:", err));

    this.db.collection('meetings').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      this.cache.meetings = list;
      this.saveToFile(this.cache);
    }, (err: any) => console.error("Firestore meetings live sync error:", err));

    this.db.collection('past_meetings').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      this.cache.pastMeetings = list;
      this.saveToFile(this.cache);
    }, (err: any) => console.error("Firestore past_meetings live sync error:", err));

    this.db.collection('tasks').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      this.cache.tasks = list;
      this.saveToFile(this.cache);
    }, (err: any) => console.error("Firestore tasks live sync error:", err));

    this.db.collection('task_comments').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      this.cache.taskComments = list;
      this.saveToFile(this.cache);
    }, (err: any) => console.error("Firestore task_comments live sync error:", err));
  }

  private static loadFromFile(): Schema {
    try {
      if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2), 'utf8');
        return INITIAL_DB;
      }
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed.logs) {
        parsed.logs = [];
      }
      if (!parsed.meetings) {
        parsed.meetings = [];
      }
      if (!parsed.pastMeetings) {
        parsed.pastMeetings = [];
      }
      if (!parsed.tasks) {
        parsed.tasks = [];
      }
      if (!parsed.taskComments) {
        parsed.taskComments = [];
      }
      return parsed;
    } catch (e) {
      return INITIAL_DB;
    }
  }

  private static saveToFile(data: Schema) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error("Error writing database backup file:", e);
    }
  }

  // --- SETTINGS METHODS ---
  static getSettings() {
    if (!this.cache.settings) {
      this.cache.settings = { showLoginDemoInfo: true };
      this.saveToFile(this.cache);
    }
    return this.cache.settings;
  }

  static updateSettings(updates: { showLoginDemoInfo: boolean }) {
    this.cache.settings = {
      showLoginDemoInfo: updates.hasOwnProperty('showLoginDemoInfo') ? updates.showLoginDemoInfo : (this.cache.settings?.showLoginDemoInfo ?? true)
    };
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('settings', 'system', this.cache.settings);
    }
    if (this.db) {
      this.db.collection('settings').doc('system').set(this.cache.settings)
        .catch((err: any) => console.error("Firestore write error (updateSettings):", err));
    }
    return this.cache.settings;
  }

  // --- USER METHODS ---
  static getUsers() {
    return this.cache.users.map(({ passwordHash, ...user }) => user);
  }

  static getUserByEmail(email: string) {
    if (!email) return null;
    const user = (this.cache.users || []).find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  static createUser(user: Omit<User, 'id' | 'createdAt'> & { passwordPlain: string }) {
    const userEmail = (user.email || "").toLowerCase();
    const existing = (this.cache.users || []).find(u => u && u.email && u.email.toLowerCase() === userEmail);
    if (existing) {
      throw new Error(`User with email ${user.email} already exists`);
    }

    const newUser = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name: user.name,
      email: user.email.toLowerCase(),
      role: user.role,
      passwordHash: hashPassword(user.passwordPlain),
      createdAt: new Date().toISOString(),
      teamLeadId: user.teamLeadId,
      permissions: user.permissions || [],
      restrictedUserIds: user.restrictedUserIds || [],
      meetingsDisabled: user.meetingsDisabled || false
    };

    this.cache.users.push(newUser);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('users', newUser.id, newUser);
    }
    if (this.db) {
      this.db.collection('users').doc(newUser.id).set(newUser)
        .catch((err: any) => console.error("Firestore write error (createUser):", err));
    }

    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  static updateUser(id: string, updates: Partial<User> & { passwordPlain?: string }) {
    const index = this.cache.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error("User not found");
    }

    const current = this.cache.users[index];
    
    if (updates.email && updates.email.toLowerCase() !== current.email.toLowerCase()) {
      const existing = this.cache.users.find(u => u.email.toLowerCase() === updates.email!.toLowerCase());
      if (existing) {
        throw new Error(`User with email ${updates.email} already exists`);
      }
    }

    const passwordHash = updates.passwordPlain 
      ? hashPassword(updates.passwordPlain) 
      : current.passwordHash;

    const updatedUser = {
      ...current,
      name: updates.name ?? current.name,
      email: (updates.email ?? current.email).toLowerCase(),
      role: (updates.role ?? current.role) as UserRole,
      passwordHash,
      teamLeadId: updates.hasOwnProperty('teamLeadId') ? updates.teamLeadId : current.teamLeadId,
      permissions: updates.hasOwnProperty('permissions') ? updates.permissions : current.permissions,
      restrictedUserIds: updates.hasOwnProperty('restrictedUserIds') ? updates.restrictedUserIds : current.restrictedUserIds,
      meetingsDisabled: updates.hasOwnProperty('meetingsDisabled') ? updates.meetingsDisabled : current.meetingsDisabled
    };

    this.cache.users[index] = updatedUser;
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('users', id, updatedUser);
    }
    if (this.db) {
      this.db.collection('users').doc(id).set(updatedUser)
        .catch((err: any) => console.error("Firestore write error (updateUser):", err));
    }

    const { passwordHash: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  static deleteUser(id: string) {
    const index = this.cache.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error("User not found");
    }
    
    const userToDelete = this.cache.users[index];
    if (userToDelete.role === 'Admin') {
      const adminCount = this.cache.users.filter(u => u.role === 'Admin').length;
      if (adminCount <= 1) {
        throw new Error("Cannot delete the last administrator");
      }
    }

    this.cache.users.splice(index, 1);
    
    const batchUpdates: Promise<any>[] = [];
    this.cache.users.forEach(u => {
      if (u.teamLeadId === id) {
        delete u.teamLeadId;
        if (this.supabaseClient) {
          this.writeToSupabase('users', u.id, u);
        }
        if (this.db) {
          batchUpdates.push(this.db.collection('users').doc(u.id).update({ teamLeadId: FieldValue.delete() }));
        }
      }
    });

    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.deleteFromSupabase('users', id);
    }
    if (this.db) {
      this.db.collection('users').doc(id).delete()
        .catch((err: any) => console.error("Firestore write error (deleteUser):", err));
      Promise.all(batchUpdates)
        .catch((err: any) => console.error("Firestore batch update error (deleteUser):", err));
    }
    return true;
  }

  static verifyUserCredentials(email: string, passwordPlain: string): User | null {
    if (!email) return null;
    const user = (this.cache.users || []).find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;

    if (user.passwordHash === hashPassword(passwordPlain)) {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }

  // --- CANDIDATE METHODS ---
  static getCandidates() {
    return this.cache.candidates;
  }

  static getCandidateById(id: string) {
    return this.cache.candidates.find(c => c.id === id) || null;
  }

  static checkDuplicateMobile(mobile: string, excludeId?: string): boolean {
    const cleanMobile = mobile.replace(/\D/g, '');
    return this.cache.candidates.some(c => {
      if (excludeId && c.id === excludeId) return false;
      const otherMobile = c.mobile.replace(/\D/g, '');
      return otherMobile === cleanMobile && cleanMobile.length > 0;
    });
  }

  static createCandidate(candidate: Omit<Candidate, 'id' | 'createdAt' | 'recruiterName'>) {
    if (this.checkDuplicateMobile(candidate.mobile)) {
      throw new Error(`Duplicate mobile number detected. Candidate with mobile ${candidate.mobile} already exists.`);
    }

    const recruiter = this.cache.users.find(u => u.id === candidate.recruiterId);
    const recruiterName = recruiter ? recruiter.name : "System";

    const newCandidate: Candidate = {
      ...candidate,
      id: `cand_${Math.random().toString(36).substring(2, 9)}`,
      recruiterName,
      createdAt: new Date().toISOString()
    };

    this.cache.candidates.push(newCandidate);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('candidates', newCandidate.id, newCandidate);
    }
    if (this.db) {
      this.db.collection('candidates').doc(newCandidate.id).set(newCandidate)
        .catch((err: any) => console.error("Firestore write error (createCandidate):", err));
    }
    return newCandidate;
  }

  static updateCandidate(id: string, updates: Partial<Candidate>) {
    const idx = this.cache.candidates.findIndex(c => c.id === id);
    if (idx === -1) throw new Error("Candidate not found");

    if (updates.mobile && this.checkDuplicateMobile(updates.mobile, id)) {
      throw new Error(`Duplicate mobile number detected. Another candidate has the mobile ${updates.mobile}.`);
    }

    let recruiterName = this.cache.candidates[idx].recruiterName;
    if (updates.recruiterId) {
      const rec = this.cache.users.find(u => u.id === updates.recruiterId);
      if (rec) recruiterName = rec.name;
    }

    const updatedCandidate = {
      ...this.cache.candidates[idx],
      ...updates,
      recruiterName
    } as Candidate;

    this.cache.candidates[idx] = updatedCandidate;
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('candidates', id, updatedCandidate);
    }
    if (this.db) {
      this.db.collection('candidates').doc(id).set(updatedCandidate)
        .catch((err: any) => console.error("Firestore write error (updateCandidate):", err));
    }
    return updatedCandidate;
  }

  static deleteCandidate(id: string) {
    this.cache.candidates = this.cache.candidates.filter(c => c.id !== id);
    this.cache.interviews = this.cache.interviews.filter(i => i.candidateId !== id);
    this.cache.selections = this.cache.selections.filter(s => s.candidateId !== id);
    this.cache.joinings = this.cache.joinings.filter(j => j.candidateId !== id);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.deleteFromSupabase('candidates', id);
      this.supabaseClient.from('interviews').delete().eq('candidateId', id).catch((err: any) => console.error(err));
      this.supabaseClient.from('selections').delete().eq('candidateId', id).catch((err: any) => console.error(err));
      this.supabaseClient.from('joinings').delete().eq('candidateId', id).catch((err: any) => console.error(err));
    }
    if (this.db) {
      const batch = this.db.batch();
      batch.delete(this.db.collection('candidates').doc(id));
      
      this.db.collection('interviews').where('candidateId', '==', id).get()
        .then((snap: any) => {
          snap.forEach((doc: any) => batch.delete(doc.ref));
          return this.db!.collection('selections').where('candidateId', '==', id).get();
        })
        .then((snap: any) => {
          snap.forEach((doc: any) => batch.delete(doc.ref));
          return this.db!.collection('joinings').where('candidateId', '==', id).get();
        })
        .then((snap: any) => {
          snap.forEach((doc: any) => batch.delete(doc.ref));
          return batch.commit();
        })
        .catch((err: any) => console.error("Firestore write error (deleteCandidate):", err));
    }
  }

  // --- INTERVIEW METHODS ---
  static getInterviews() {
    return this.cache.interviews;
  }

  static getInterviewById(id: string) {
    return this.cache.interviews.find(i => i.id === id) || null;
  }

  static createInterview(interview: Omit<Interview, 'id' | 'createdAt' | 'candidateName' | 'scheduledByName'>) {
    const cand = this.cache.candidates.find(c => c.id === interview.candidateId);
    if (!cand) throw new Error("Candidate not found");

    const user = this.cache.users.find(u => u.id === interview.scheduledBy);
    const scheduledByName = user ? user.name : "System";

    const newInterview: Interview = {
      ...interview,
      id: `int_${Math.random().toString(36).substring(2, 9)}`,
      candidateName: cand.name,
      scheduledByName,
      createdAt: new Date().toISOString()
    };

    this.cache.interviews.push(newInterview);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('interviews', newInterview.id, newInterview);
    }
    if (this.db) {
      this.db.collection('interviews').doc(newInterview.id).set(newInterview)
        .catch((err: any) => console.error("Firestore write error (createInterview):", err));
    }
    return newInterview;
  }

  static updateInterview(id: string, updates: Partial<Interview>) {
    const idx = this.cache.interviews.findIndex(i => i.id === id);
    if (idx === -1) throw new Error("Interview not found");

    let candidateName = this.cache.interviews[idx].candidateName;
    if (updates.candidateId) {
      const cand = this.cache.candidates.find(c => c.id === updates.candidateId);
      if (cand) candidateName = cand.name;
    }

    let scheduledByName = this.cache.interviews[idx].scheduledByName;
    if (updates.scheduledBy) {
      const user = this.cache.users.find(u => u.id === updates.scheduledBy);
      if (user) scheduledByName = user.name;
    }

    const updatedInterview = {
      ...this.cache.interviews[idx],
      ...updates,
      candidateName,
      scheduledByName
    } as Interview;

    this.cache.interviews[idx] = updatedInterview;
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('interviews', id, updatedInterview);
    }
    if (this.db) {
      this.db.collection('interviews').doc(id).set(updatedInterview)
        .catch((err: any) => console.error("Firestore write error (updateInterview):", err));
    }
    return updatedInterview;
  }

  static deleteInterview(id: string) {
    this.cache.interviews = this.cache.interviews.filter(i => i.id !== id);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.deleteFromSupabase('interviews', id);
    }
    if (this.db) {
      this.db.collection('interviews').doc(id).delete()
        .catch((err: any) => console.error("Firestore write error (deleteInterview):", err));
    }
  }

  // --- SELECTION METHODS ---
  static getSelections() {
    return this.cache.selections;
  }

  static createSelection(selection: Omit<Selection, 'id' | 'createdAt' | 'candidateName' | 'updatedByName'>) {
    const cand = this.cache.candidates.find(c => c.id === selection.candidateId);
    if (!cand) throw new Error("Candidate not found");

    const user = this.cache.users.find(u => u.id === selection.updatedBy);
    const updatedByName = user ? user.name : "System";

    const newSelection: Selection = {
      ...selection,
      id: `sel_${Math.random().toString(36).substring(2, 9)}`,
      candidateName: cand.name,
      updatedByName,
      createdAt: new Date().toISOString()
    };

    this.cache.selections = this.cache.selections.filter(s => s.candidateId !== selection.candidateId);
    this.cache.selections.push(newSelection);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.supabaseClient.from('selections').delete().eq('candidateId', selection.candidateId)
        .then(() => this.writeToSupabase('selections', newSelection.id, newSelection))
        .catch((err: any) => console.error(err));
    }
    if (this.db) {
      this.db.collection('selections').where('candidateId', '==', selection.candidateId).get()
        .then((snap: any) => {
          const batch = this.db!.batch();
          snap.forEach((doc: any) => batch.delete(doc.ref));
          batch.set(this.db!.collection('selections').doc(newSelection.id), newSelection);
          return batch.commit();
        })
        .catch((err: any) => console.error("Firestore write error (createSelection):", err));
    }
    return newSelection;
  }

  static updateSelection(id: string, updates: Partial<Selection>) {
    const idx = this.cache.selections.findIndex(s => s.id === id);
    if (idx === -1) throw new Error("Selection record not found");

    let candidateName = this.cache.selections[idx].candidateName;
    if (updates.candidateId) {
      const cand = this.cache.candidates.find(c => c.id === updates.candidateId);
      if (cand) candidateName = cand.name;
    }

    let updatedByName = this.cache.selections[idx].updatedByName;
    if (updates.updatedBy) {
      const user = this.cache.users.find(u => u.id === updates.updatedBy);
      if (user) updatedByName = user.name;
    }

    const updatedSelection = {
      ...this.cache.selections[idx],
      ...updates,
      candidateName,
      updatedByName
    } as Selection;

    this.cache.selections[idx] = updatedSelection;
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('selections', id, updatedSelection);
    }
    if (this.db) {
      this.db.collection('selections').doc(id).set(updatedSelection)
        .catch((err: any) => console.error("Firestore write error (updateSelection):", err));
    }
    return updatedSelection;
  }

  // --- JOINING METHODS ---
  static getJoinings() {
    return this.cache.joinings;
  }

  static createJoining(joining: Omit<Joining, 'id' | 'createdAt' | 'candidateName' | 'updatedByName'>) {
    const cand = this.cache.candidates.find(c => c.id === joining.candidateId);
    if (!cand) throw new Error("Candidate not found");

    const user = this.cache.users.find(u => u.id === joining.updatedBy);
    const updatedByName = user ? user.name : "System";

    const newJoining: Joining = {
      ...joining,
      id: `joi_${Math.random().toString(36).substring(2, 9)}`,
      candidateName: cand.name,
      updatedByName,
      createdAt: new Date().toISOString()
    };

    this.cache.joinings = this.cache.joinings.filter(j => j.candidateId !== joining.candidateId);
    this.cache.joinings.push(newJoining);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.supabaseClient.from('joinings').delete().eq('candidateId', joining.candidateId)
        .then(() => this.writeToSupabase('joinings', newJoining.id, newJoining))
        .catch((err: any) => console.error(err));
    }
    if (this.db) {
      this.db.collection('joinings').where('candidateId', '==', joining.candidateId).get()
        .then((snap: any) => {
          const batch = this.db!.batch();
          snap.forEach((doc: any) => batch.delete(doc.ref));
          batch.set(this.db!.collection('joinings').doc(newJoining.id), newJoining);
          return batch.commit();
        })
        .catch((err: any) => console.error("Firestore write error (createJoining):", err));
    }
    return newJoining;
  }

  static updateJoining(id: string, updates: Partial<Joining>) {
    const idx = this.cache.joinings.findIndex(j => j.id === id);
    if (idx === -1) throw new Error("Joining record not found");

    let candidateName = this.cache.joinings[idx].candidateName;
    if (updates.candidateId) {
      const cand = this.cache.candidates.find(c => c.id === updates.candidateId);
      if (cand) candidateName = cand.name;
    }

    let updatedByName = this.cache.joinings[idx].updatedByName;
    if (updates.updatedBy) {
      const user = this.cache.users.find(u => u.id === updates.updatedBy);
      if (user) updatedByName = user.name;
    }

    const updatedJoining = {
      ...this.cache.joinings[idx],
      ...updates,
      candidateName,
      updatedByName
    } as Joining;

    this.cache.joinings[idx] = updatedJoining;
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('joinings', id, updatedJoining);
    }
    if (this.db) {
      this.db.collection('joinings').doc(id).set(updatedJoining)
        .catch((err: any) => console.error("Firestore write error (updateJoining):", err));
    }
    return updatedJoining;
  }

  // --- CHAT METHODS ---
  static getMessages() {
    return this.cache.messages;
  }

  static createMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const newMessage: ChatMessage = {
      id: `msg_${Math.random().toString(36).substring(2, 9)}`,
      userId: msg.userId,
      userName: msg.userName,
      userRole: msg.userRole,
      message: msg.message,
      timestamp: new Date().toISOString(),
      receiverId: msg.receiverId
    };

    this.cache.messages.push(newMessage);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('messages', newMessage.id, newMessage);
    }
    if (this.db) {
      this.db.collection('messages').doc(newMessage.id).set(newMessage)
        .catch((err: any) => console.error("Firestore write error (createMessage):", err));
    }
    return newMessage;
  }

  static deleteMessage(id: string) {
    const initialLen = this.cache.messages.length;
    this.cache.messages = this.cache.messages.filter(m => m.id !== id);
    if (this.cache.messages.length !== initialLen) {
      this.saveToFile(this.cache);

      if (this.supabaseClient) {
        this.deleteFromSupabase('messages', id);
      }
      if (this.db) {
        this.db.collection('messages').doc(id).delete()
          .catch((err: any) => console.error("Firestore write error (deleteMessage):", err));
      }
      return true;
    }
    return false;
  }

  static clearAllMessages() {
    this.cache.messages = [];
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.supabaseClient.from('messages').delete().neq('id', 'placeholder')
        .catch((err: any) => console.error("Supabase write error (clearAllMessages):", err));
    }
    if (this.db) {
      this.db.collection('messages').get()
        .then((snap: any) => {
          const batch = this.db!.batch();
          snap.forEach((doc: any) => batch.delete(doc.ref));
          return batch.commit();
        })
        .catch((err: any) => console.error("Firestore write error (clearAllMessages):", err));
    }
  }

  // --- LOGS METHODS ---
  static getLogs() {
    if (!this.cache.logs) {
      this.cache.logs = [];
    }
    // Sort descending by timestamp (newest logs first)
    return [...this.cache.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static createLog(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
    if (!this.cache.logs) {
      this.cache.logs = [];
    }

    const newLog: ActivityLog = {
      id: `log_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      userId: log.userId,
      userName: log.userName,
      userEmail: log.userEmail,
      userRole: log.userRole,
      action: log.action,
      details: log.details,
      timestamp: new Date().toISOString()
    };

    this.cache.logs.push(newLog);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('logs', newLog.id, newLog);
    }
    if (this.db) {
      this.db.collection('logs').doc(newLog.id).set(newLog)
        .catch((err: any) => console.error("Firestore write error (createLog):", err));
    }
    return newLog;
  }

  // --- MEETINGS METHODS ---
  static getMeetings() {
    if (!this.cache.meetings) {
      this.cache.meetings = [];
    }
    return [...this.cache.meetings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static createMeeting(meeting: Omit<TeamMeeting, 'id' | 'createdAt'>) {
    if (!this.cache.meetings) {
      this.cache.meetings = [];
    }

    const newMeeting: TeamMeeting = {
      id: `meet_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      title: meeting.title,
      description: meeting.description || "",
      meetingUrl: meeting.meetingUrl,
      createdBy: meeting.createdBy,
      creatorName: meeting.creatorName,
      scheduledAt: meeting.scheduledAt,
      createdAt: new Date().toISOString(),
      isActive: meeting.isActive !== undefined ? meeting.isActive : true,
      invitedUserIds: meeting.invitedUserIds || []
    };

    this.cache.meetings.push(newMeeting);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('meetings', newMeeting.id, newMeeting);
    }
    if (this.db) {
      this.db.collection('meetings').doc(newMeeting.id).set(newMeeting)
        .catch((err: any) => console.error("Firestore write error (createMeeting):", err));
    }
    return newMeeting;
  }

  static deleteMeeting(id: string) {
    if (!this.cache.meetings) {
      this.cache.meetings = [];
    }
    const initialLen = this.cache.meetings.length;
    this.cache.meetings = this.cache.meetings.filter(m => m.id !== id);
    if (this.cache.meetings.length !== initialLen) {
      this.saveToFile(this.cache);

      if (this.supabaseClient) {
        this.deleteFromSupabase('meetings', id);
      }
      if (this.db) {
        this.db.collection('meetings').doc(id).delete()
          .catch((err: any) => console.error("Firestore write error (deleteMeeting):", err));
      }
      return true;
    }
    return false;
  }

  // --- PAST MEETINGS METHODS ---
  static getPastMeetings() {
    if (!this.cache.pastMeetings) {
      this.cache.pastMeetings = [];
    }
    return [...this.cache.pastMeetings].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  static createPastMeeting(pastMeeting: Omit<PastMeeting, 'id' | 'completedAt'>) {
    if (!this.cache.pastMeetings) {
      this.cache.pastMeetings = [];
    }

    const newPastMeeting: PastMeeting = {
      id: `past_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      meetingId: pastMeeting.meetingId || "",
      title: pastMeeting.title,
      description: pastMeeting.description || "",
      durationMinutes: Number(pastMeeting.durationMinutes) || 0,
      participants: pastMeeting.participants || [],
      completedAt: new Date().toISOString()
    };

    this.cache.pastMeetings.push(newPastMeeting);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('past_meetings', newPastMeeting.id, newPastMeeting);
    }
    if (this.db) {
      this.db.collection('past_meetings').doc(newPastMeeting.id).set(newPastMeeting)
        .catch((err: any) => console.error("Firestore write error (createPastMeeting):", err));
    }
    return newPastMeeting;
  }

  // --- TASK MANAGEMENT METHODS ---
  static getTasks() {
    if (!this.cache.tasks) {
      this.cache.tasks = [];
    }
    return [...this.cache.tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static createTask(task: Omit<Task, 'id' | 'createdAt'>) {
    if (!this.cache.tasks) {
      this.cache.tasks = [];
    }

    const newTask: Task = {
      ...task,
      id: `task_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    this.cache.tasks.push(newTask);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('tasks', newTask.id, newTask);
    }
    if (this.db) {
      this.db.collection('tasks').doc(newTask.id).set(newTask)
        .catch((err: any) => console.error("Firestore write error (createTask):", err));
    }
    return newTask;
  }

  static updateTask(id: string, updates: Partial<Task>) {
    if (!this.cache.tasks) {
      this.cache.tasks = [];
    }
    const idx = this.cache.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("Task not found");

    const updatedTask = {
      ...this.cache.tasks[idx],
      ...updates
    } as Task;

    this.cache.tasks[idx] = updatedTask;
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('tasks', id, updatedTask);
    }
    if (this.db) {
      this.db.collection('tasks').doc(id).set(updatedTask)
        .catch((err: any) => console.error("Firestore write error (updateTask):", err));
    }
    return updatedTask;
  }

  static deleteTask(id: string) {
    if (!this.cache.tasks) {
      this.cache.tasks = [];
    }
    const initialLen = this.cache.tasks.length;
    this.cache.tasks = this.cache.tasks.filter(t => t.id !== id);
    if (this.cache.tasks.length !== initialLen) {
      this.saveToFile(this.cache);

      if (this.supabaseClient) {
        this.deleteFromSupabase('tasks', id);
      }
      if (this.db) {
        this.db.collection('tasks').doc(id).delete()
          .catch((err: any) => console.error("Firestore write error (deleteTask):", err));
      }
      return true;
    }
    return false;
  }

  static getTaskComments(taskId?: string) {
    if (!this.cache.taskComments) {
      this.cache.taskComments = [];
    }
    let comments = [...this.cache.taskComments];
    if (taskId) {
      comments = comments.filter(c => c.taskId === taskId);
    }
    return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  static createTaskComment(comment: Omit<TaskComment, 'id' | 'createdAt'>) {
    if (!this.cache.taskComments) {
      this.cache.taskComments = [];
    }

    const newComment: TaskComment = {
      ...comment,
      id: `tcmt_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    this.cache.taskComments.push(newComment);
    this.saveToFile(this.cache);

    if (this.supabaseClient) {
      this.writeToSupabase('task_comments', newComment.id, newComment);
    }
    if (this.db) {
      this.db.collection('task_comments').doc(newComment.id).set(newComment)
        .catch((err: any) => console.error("Firestore write error (createTaskComment):", err));
    }
    return newComment;
  }

  static async runProductionInitialization() {
    console.log("Triggering PRODUCTION recruitment workspace initialization...");

    // 1. Clear database cache completely
    this.cache.candidates = [];
    this.cache.interviews = [];
    this.cache.selections = [];
    this.cache.joinings = [];
    this.cache.messages = [];
    this.cache.logs = [];
    this.cache.meetings = [];
    this.cache.pastMeetings = [];
    this.cache.tasks = [];
    this.cache.taskComments = [];

    // Ensure we preserve the Rohit Raj admin users
    const defaultUsers = [
      {
        id: "usr_rohit",
        name: "Rohit Raj",
        email: "rohitrajj2109@gmail.com",
        role: UserRole.ADMIN,
        passwordHash: hashPassword("9523103315"),
        createdAt: "2026-06-30T04:30:00Z",
        permissions: ['candidates', 'interviews', 'pipeline', 'reports', 'chat', 'meetings', 'tasks'],
        restrictedUserIds: [],
        meetingsDisabled: false
      },
      {
        id: "usr_rohit_real",
        name: "Rohit Raj",
        email: "rohitrajj0921@gmail.com",
        role: UserRole.ADMIN,
        passwordHash: hashPassword("9523103315"),
        createdAt: "2026-06-30T04:30:00Z",
        permissions: ['candidates', 'interviews', 'pipeline', 'reports', 'chat', 'meetings', 'tasks'],
        restrictedUserIds: [],
        meetingsDisabled: false
      }
    ];

    this.cache.users = [...defaultUsers];

    // 2. Add professional, elite recruiter profiles
    const recruiters = [
      {
        id: "usr_aditi",
        name: "Aditi Sharma",
        email: "aditi.sharma@recruitcore.com",
        role: UserRole.TEAM_LEADER,
        passwordHash: hashPassword("9523103315"),
        createdAt: "2026-06-30T04:31:00Z",
        permissions: ['candidates', 'interviews', 'pipeline', 'reports', 'chat', 'meetings', 'tasks'],
        restrictedUserIds: [],
        meetingsDisabled: false
      },
      {
        id: "usr_kunal",
        name: "Kunal Verma",
        email: "kunal.verma@recruitcore.com",
        role: UserRole.HR_RECRUITER,
        passwordHash: hashPassword("9523103315"),
        createdAt: "2026-06-30T04:32:00Z",
        teamLeadId: "usr_aditi",
        permissions: ['candidates', 'interviews', 'pipeline', 'chat', 'meetings', 'tasks'],
        restrictedUserIds: [],
        meetingsDisabled: false
      },
      {
        id: "usr_riya",
        name: "Riya Nair",
        email: "riya.nair@recruitcore.com",
        role: UserRole.HR_RECRUITER,
        passwordHash: hashPassword("9523103315"),
        createdAt: "2026-06-30T04:33:00Z",
        teamLeadId: "usr_aditi",
        permissions: ['candidates', 'interviews', 'pipeline', 'chat', 'meetings'],
        restrictedUserIds: [],
        meetingsDisabled: false
      }
    ];

    this.cache.users.push(...recruiters);

    // 3. Define the production candidates with realistic, professional details
    const candidatesList: Candidate[] = [
      {
        id: "cand_vikram",
        name: "Vikram Aditya",
        mobile: "9876543210",
        email: "vikram.aditya@outlook.com",
        location: "Bengaluru",
        currentCompany: "Accenture",
        currentSalary: 3200000,
        expectedSalary: 4500000,
        experience: 11,
        noticePeriod: 15,
        skills: ["AWS", "Kubernetes", "Terraform", "Go", "System Design"],
        recruiterId: "usr_kunal",
        recruiterName: "Kunal Verma",
        source: "LinkedIn Recruiter",
        callDate: "2026-06-28",
        remarks: "Highly experienced cloud architect. Exceptionally strong in distributed systems, service mesh (Istio), and Terraform automation. Serves immediate notice.",
        status: CandidateStatus.INTERESTED,
        createdAt: "2026-06-28T09:00:00Z"
      },
      {
        id: "cand_sneha",
        name: "Sneha Iyer",
        mobile: "9812345678",
        email: "sneha.iyer@gmail.com",
        location: "Mumbai",
        currentCompany: "Nykaa",
        currentSalary: 1800000,
        expectedSalary: 2400000,
        experience: 7,
        noticePeriod: 30,
        skills: ["React Native", "TypeScript", "Redux Toolkit", "iOS Native", "Fastlane"],
        recruiterId: "usr_aditi",
        recruiterName: "Aditi Sharma",
        source: "Direct Sourcing",
        callDate: "2026-06-29",
        remarks: "Mobile Team Lead candidate. Strong background optimizing mobile app startups, bundle sizes, and native bridges. Completed technical assessment rounds.",
        status: CandidateStatus.INTERESTED,
        createdAt: "2026-06-29T10:15:00Z"
      },
      {
        id: "cand_amit",
        name: "Amit Patel",
        mobile: "8887766554",
        email: "amit.patel@yahoo.com",
        location: "Hyderabad",
        currentCompany: "Microsoft",
        currentSalary: 2800000,
        expectedSalary: 3800000,
        experience: 9,
        noticePeriod: 0,
        skills: ["Azure DevOps", "Jenkins", "Helm", "Shell Scripting", "CI/CD"],
        recruiterId: "usr_riya",
        recruiterName: "Riya Nair",
        source: "Employee Referral",
        callDate: "2026-06-30",
        remarks: "Serving notice, immediate joiner. Experienced in building scalable multi-tenant CI/CD pipelines and Kubernetes-based deployments. Strong automation skills.",
        status: CandidateStatus.FOLLOW_UP,
        createdAt: "2026-06-30T08:30:00Z"
      },
      {
        id: "cand_meera",
        name: "Meera Krishnan",
        mobile: "9900112233",
        email: "meera.krishnan@outlook.com",
        location: "Bengaluru",
        currentCompany: "Ola Cabs",
        currentSalary: 2200000,
        expectedSalary: 3000000,
        experience: 6.5,
        noticePeriod: 10,
        skills: ["Python", "PyTorch", "SQL", "Pandas", "MLOps", "NLP"],
        recruiterId: "usr_kunal",
        recruiterName: "Kunal Verma",
        source: "LinkedIn",
        callDate: "2026-06-25",
        remarks: "Advanced analytics expert. Cleared Swiggy's tech round with exceptional feedback on machine learning pipeline design. Offer signed, onboarding ready.",
        status: CandidateStatus.INTERESTED,
        createdAt: "2026-06-25T11:00:00Z"
      }
    ];

    this.cache.candidates.push(...candidatesList);

    // 4. Seeding Interviews
    const interviewsList: Interview[] = [
      {
        id: "int_vikram",
        candidateId: "cand_vikram",
        candidateName: "Vikram Aditya",
        client: "Google Cloud Platform",
        position: "Staff Cloud Architect",
        date: "2026-07-02",
        time: "14:00",
        interviewMode: InterviewMode.ONLINE,
        status: InterviewStatus.SCHEDULED,
        remarks: "Architectural round with Google Tech Staff. Focus on multi-region failovers, disaster recovery, and Kubernetes multi-cluster routing.",
        scheduledBy: "usr_kunal",
        scheduledByName: "Kunal Verma",
        createdAt: "2026-06-29T10:00:00Z"
      },
      {
        id: "int_sneha",
        candidateId: "cand_sneha",
        candidateName: "Sneha Iyer",
        client: "Myntra",
        position: "Lead Frontend Engineer",
        date: "2026-06-29",
        time: "11:00",
        interviewMode: InterviewMode.ONLINE,
        status: InterviewStatus.ATTENDED,
        remarks: "Cleared both core technical rounds. Highly rated in system design and React performance tuning.",
        scheduledBy: "usr_aditi",
        scheduledByName: "Aditi Sharma",
        createdAt: "2026-06-27T09:30:00Z"
      },
      {
        id: "int_meera",
        candidateId: "cand_meera",
        candidateName: "Meera Krishnan",
        client: "Swiggy",
        position: "Senior AI Scientist",
        date: "2026-06-26",
        time: "15:30",
        interviewMode: InterviewMode.ONLINE,
        status: InterviewStatus.ATTENDED,
        remarks: "Excellent problem-solving in production model deployments and scalable vector searches.",
        scheduledBy: "usr_kunal",
        scheduledByName: "Kunal Verma",
        createdAt: "2026-06-25T14:00:00Z"
      }
    ];

    this.cache.interviews.push(...interviewsList);

    // 5. Seeding Selections
    const selectionsList: Selection[] = [
      {
        id: "sel_sneha",
        candidateId: "cand_sneha",
        candidateName: "Sneha Iyer",
        status: SelectionStatus.SELECTED,
        date: "2026-06-30",
        remarks: "Highly positive feedback from the hiring manager. Recommended for the lead mobile engineering track. Salary discussion initiated.",
        updatedBy: "usr_aditi",
        updatedByName: "Aditi Sharma",
        createdAt: "2026-06-30T04:30:00Z"
      },
      {
        id: "sel_meera",
        candidateId: "cand_meera",
        candidateName: "Meera Krishnan",
        status: SelectionStatus.SELECTED,
        date: "2026-06-27",
        remarks: "Cleared all technical and managerial assessment layers. Formally approved for recruitment offer release.",
        updatedBy: "usr_aditi",
        updatedByName: "Aditi Sharma",
        createdAt: "2026-06-27T11:00:00Z"
      }
    ];

    this.cache.selections.push(...selectionsList);

    // 6. Seeding Joinings
    const joiningsList: Joining[] = [
      {
        id: "joi_meera",
        candidateId: "cand_meera",
        candidateName: "Meera Krishnan",
        offerReleased: true,
        joiningDate: "2026-07-10",
        status: JoiningStatus.PENDING,
        remarks: "Offer letter signed. Expected onboarding date is July 10, 2026. Pre-onboarding checklist and BGV are in progress.",
        updatedBy: "usr_rohit_real",
        updatedByName: "Rohit Raj",
        createdAt: "2026-06-28T09:00:00Z"
      }
    ];

    this.cache.joinings.push(...joiningsList);

    // 7. Seeding Messages
    const messagesList: ChatMessage[] = [
      {
        id: "msg_prod_1",
        userId: "usr_rohit_real",
        userName: "Rohit Raj",
        userRole: UserRole.ADMIN,
        message: "Welcome to our RecruitCore Workspace. Let's maintain live synchronization on candidates, upcoming client loops, and tasks. Use this channel to coordinate placements.",
        timestamp: "2026-06-30T04:35:00Z"
      },
      {
        id: "msg_prod_2",
        userId: "usr_kunal",
        userName: "Kunal Verma",
        userRole: UserRole.HR_RECRUITER,
        message: "Hi team, I've added Vikram Aditya (Staff Cloud Architect, serving 15-day notice). His Google interview is scheduled for July 2nd. I'll share prep notes with him today.",
        timestamp: "2026-06-30T04:36:00Z"
      },
      {
        id: "msg_prod_3",
        userId: "usr_aditi",
        userName: "Aditi Sharma",
        userRole: UserRole.TEAM_LEADER,
        message: "Great find Kunal! Immediate joiners for staff roles are in high demand. Let's make sure the client's interview panel is fully briefed.",
        timestamp: "2026-06-30T04:38:00Z"
      }
    ];

    this.cache.messages.push(...messagesList);

    // 8. Seeding Tasks
    const tasksList: Task[] = [
      {
        id: "task_1",
        title: "Brief Vikram Aditya for Google Technical Round",
        description: "Coordinate a 15-minute briefing session before his architectural panel round. Go over Google Cloud platform system design expectations.",
        status: TaskStatus.PENDING,
        createdBy: "usr_aditi",
        createdByName: "Aditi Sharma",
        createdByRole: UserRole.TEAM_LEADER,
        assignees: ["usr_kunal"],
        createdAt: "2026-06-30T04:40:00Z"
      },
      {
        id: "task_2",
        title: "Initiate Offer Letter draft for Sneha Iyer",
        description: "Draft official offer letter with Bengaluru HR division based on standard 24L package expectations for Myntra.",
        status: TaskStatus.IN_PROGRESS,
        createdBy: "usr_rohit_real",
        createdByName: "Rohit Raj",
        createdByRole: UserRole.ADMIN,
        assignees: ["usr_aditi"],
        createdAt: "2026-06-30T04:41:00Z"
      }
    ];

    if (!this.cache.tasks) {
      this.cache.tasks = [];
    }
    this.cache.tasks.push(...tasksList);

    // 9. Seeding Activity Logs
    const logsList: ActivityLog[] = [
      {
        id: "log_p_1",
        userId: "usr_rohit_real",
        userName: "Rohit Raj",
        userEmail: "rohitrajj0921@gmail.com",
        userRole: UserRole.ADMIN,
        action: "INITIALIZE_WORKSPACE",
        details: "Cleaned dummy data and initialized enterprise recruiter workspace with real structures.",
        timestamp: "2026-06-30T04:45:00Z"
      },
      {
        id: "log_p_2",
        userId: "usr_kunal",
        userName: "Kunal Verma",
        userEmail: "kunal.verma@recruitcore.com",
        userRole: UserRole.HR_RECRUITER,
        action: "CREATE_CANDIDATE",
        details: "Created candidate profile for Vikram Aditya (Staff Cloud Architect).",
        timestamp: "2026-06-30T04:46:00Z"
      }
    ];

    this.cache.logs.push(...logsList);

    // 10. Seeding Meetings
    const meetingsList: TeamMeeting[] = [
      {
        id: "meet_1",
        title: "Daily Standup & Pipeline Review",
        description: "Review current recruitment metrics, upcoming customer interview panels, and offer releases.",
        meetingUrl: "https://meet.google.com/xyz-abc-123",
        createdBy: "usr_aditi",
        creatorName: "Aditi Sharma",
        scheduledAt: "2026-06-30T10:30:00Z",
        createdAt: new Date().toISOString(),
        isActive: true,
        invitedUserIds: ["usr_rohit_real", "usr_aditi", "usr_kunal", "usr_riya"]
      }
    ];

    if (!this.cache.meetings) {
      this.cache.meetings = [];
    }
    this.cache.meetings.push(...meetingsList);

    // Save locally
    this.saveToFile(this.cache);

    // Synchronize Firestore collections if connected!
    if (this.db) {
      console.log("Seeding production data to Firestore database...");

      // Clear all Firestore collections first
      const collectionsToWipe = [
        'users', 'candidates', 'interviews', 'selections', 'joinings', 
        'messages', 'logs', 'meetings', 'pastMeetings', 'tasks', 'taskComments'
      ];

      for (const colName of collectionsToWipe) {
        try {
          const snapshot = await this.db.collection(colName).get();
          if (!snapshot.empty) {
            const batch = this.db.batch();
            snapshot.forEach((doc: any) => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Successfully cleared Firestore collection: ${colName}`);
          }
        } catch (e: any) {
          console.error(`Error clearing ${colName}:`, e.message);
        }
      }

      // Add users
      try {
        const batch = this.db.batch();
        for (const u of this.cache.users) {
          batch.set(this.db.collection('users').doc(u.id), u);
        }
        await batch.commit();
        console.log("Firestore users seeded.");
      } catch (e: any) {
        console.error("Error seeding users:", e.message);
      }

      // Add candidates
      try {
        const batch = this.db.batch();
        for (const c of this.cache.candidates) {
          batch.set(this.db.collection('candidates').doc(c.id), c);
        }
        await batch.commit();
        console.log("Firestore candidates seeded.");
      } catch (e: any) {
        console.error("Error seeding candidates:", e.message);
      }

      // Add interviews
      try {
        const batch = this.db.batch();
        for (const i of this.cache.interviews) {
          batch.set(this.db.collection('interviews').doc(i.id), i);
        }
        await batch.commit();
        console.log("Firestore interviews seeded.");
      } catch (e: any) {
        console.error("Error seeding interviews:", e.message);
      }

      // Add selections
      try {
        const batch = this.db.batch();
        for (const s of this.cache.selections) {
          batch.set(this.db.collection('selections').doc(s.id), s);
        }
        await batch.commit();
        console.log("Firestore selections seeded.");
      } catch (e: any) {
        console.error("Error seeding selections:", e.message);
      }

      // Add joinings
      try {
        const batch = this.db.batch();
        for (const j of this.cache.joinings) {
          batch.set(this.db.collection('joinings').doc(j.id), j);
        }
        await batch.commit();
        console.log("Firestore joinings seeded.");
      } catch (e: any) {
        console.error("Error seeding joinings:", e.message);
      }

      // Add messages
      try {
        const batch = this.db.batch();
        for (const m of this.cache.messages) {
          batch.set(this.db.collection('messages').doc(m.id), m);
        }
        await batch.commit();
        console.log("Firestore messages seeded.");
      } catch (e: any) {
        console.error("Error seeding messages:", e.message);
      }

      // Add tasks
      try {
        const batch = this.db.batch();
        for (const t of this.cache.tasks) {
          batch.set(this.db.collection('tasks').doc(t.id), t);
        }
        await batch.commit();
        console.log("Firestore tasks seeded.");
      } catch (e: any) {
        console.error("Error seeding tasks:", e.message);
      }

      // Add logs
      try {
        const batch = this.db.batch();
        for (const l of this.cache.logs) {
          batch.set(this.db.collection('logs').doc(l.id), l);
        }
        await batch.commit();
        console.log("Firestore logs seeded.");
      } catch (e: any) {
        console.error("Error seeding logs:", e.message);
      }

      // Add meetings
      try {
        const batch = this.db.batch();
        for (const m of this.cache.meetings) {
          batch.set(this.db.collection('meetings').doc(m.id), m);
        }
        await batch.commit();
        console.log("Firestore meetings seeded.");
      } catch (e: any) {
        console.error("Error seeding meetings:", e.message);
      }

      // Update settings
      try {
        await this.db.collection('settings').doc('system').set({ showLoginDemoInfo: false });
        console.log("Firestore settings updated.");
      } catch (e: any) {
        console.error("Error updating settings:", e.message);
      }
    }

    console.log("PRODUCTION recruitment workspace initialized successfully.");
  }

  static getProductionDiagnostics() {
    const isUsingFirestore = this.db !== null;
    const isUsingSupabase = this.supabaseClient !== null;
    const hasConfig = fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'));
    const isGeminiApiKeySet = !!process.env.GEMINI_API_KEY;
    const isNodeEnvProduction = process.env.NODE_ENV === 'production';
    
    const hasDemoData = (this.cache.candidates || []).some(c => 
      ['cand_1', 'cand_vikram', 'cand_sneha', 'cand_amit', 'cand_meera'].includes(c.id) || 
      c.name.includes("Rohan")
    ) || (this.cache.users || []).some(u => 
      ['usr_aditi', 'usr_kunal', 'usr_riya'].includes(u.id)
    );

    const totalCandidates = this.cache.candidates?.length || 0;
    const totalUsers = this.cache.users?.length || 0;
    const totalInterviews = this.cache.interviews?.length || 0;
    const adminCount = this.cache.users?.filter(u => u.role === UserRole.ADMIN).length || 0;

    const rulesPath = path.join(process.cwd(), 'firestore.rules');
    const hasSecurityRules = fs.existsSync(rulesPath);
    let hasDefaultDenyRule = false;
    if (hasSecurityRules) {
      try {
        const rulesContent = fs.readFileSync(rulesPath, 'utf8');
        hasDefaultDenyRule = rulesContent.includes("allow read, write: if false;");
      } catch (e) {}
    }

    return {
      isUsingFirestore,
      isUsingSupabase,
      hasConfig,
      isGeminiApiKeySet,
      isNodeEnvProduction,
      hasDemoData,
      totalCandidates,
      totalUsers,
      totalInterviews,
      adminCount,
      hasSecurityRules,
      hasDefaultDenyRule
    };
  }
}

// Automatically trigger initialization when the module is imported

ATSDatabase.initialize();
