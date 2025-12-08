
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { JournalEvent } from '../types';

// NOTE: Replace this with your OWN Firebase Config from the Firebase Console to enable syncing across devices.
const firebaseConfig = {
  apiKey: "AIzaSyDeMl_Os6bvF1wlDin_ON_2EmpUY6kTmJ0",
  authDomain: "dayprinter.firebaseapp.com",
  projectId: "dayprinter",
  storageBucket: "dayprinter.firebasestorage.app",
  messagingSenderId: "1019501416560",
  appId: "1:1019501416560:web:bce923ef823264842524b5",
  measurementId: "G-TN1XJKP7J1"
};

let app: FirebaseApp | undefined;
let auth: any;
let db: any;
let isMock = false;

try {
  // Basic check to see if config looks vaguely valid
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    isMock = true;
    console.warn("Firebase Configuration missing or invalid. Running in LocalStorage Mock Mode.");
  }
} catch (e) {
  isMock = true;
  console.error("Firebase init failed", e);
}

// Helper to trigger UI updates without reloading the page
const triggerMockAuthUpdate = () => {
  window.dispatchEvent(new Event('mock_auth_state_changed'));
};

// --- LocalStorage Helpers (Fallback System) ---
// These ensure that if the DB fails, the user can still use the app locally.
const mockDB = {
  get: (userId: string): JournalEvent[] => {
    try {
      return JSON.parse(localStorage.getItem(`events_${userId}`) || '[]');
    } catch { return []; }
  },
  set: (userId: string, events: JournalEvent[]) => {
    localStorage.setItem(`events_${userId}`, JSON.stringify(events));
  },
  add: (userId: string, event: Omit<JournalEvent, 'id'>) => {
    const events = mockDB.get(userId);
    const newEvent = { ...event, id: 'local-' + Date.now() + Math.random().toString(36).substr(2, 9) };
    events.push(newEvent);
    mockDB.set(userId, events);
    return newEvent;
  },
  update: (userId: string, event: JournalEvent) => {
    const events = mockDB.get(userId);
    const updated = events.map(e => e.id === event.id ? event : e);
    mockDB.set(userId, updated);
  },
  delete: (userId: string, eventId: string) => {
    const events = mockDB.get(userId);
    const filtered = events.filter(e => e.id !== eventId);
    mockDB.set(userId, filtered);
  }
};


// --- Auth Services ---

export const loginWithGoogle = async () => {
  if (isMock) {
    const mockUser = { uid: 'mock-user-google', email: 'google-guest@memorite.com', displayName: 'Google Guest' };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    triggerMockAuthUpdate();
    return mockUser;
  }
  try {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google Auth Failed", error);
    // If real auth fails, fall back to guest
    return loginGuest();
  }
};

export const loginGuest = async () => {
  const mockUser = { uid: 'guest-' + Date.now(), email: null, displayName: 'Visitor' };
  localStorage.setItem('mock_user', JSON.stringify(mockUser));
  triggerMockAuthUpdate();
  return mockUser;
};

export const registerWithEmail = async (email: string, pass: string) => {
  if (isMock) {
    const mockUser = { uid: 'user-' + email, email, displayName: email.split('@')[0] };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    localStorage.setItem('mock_creds_' + email, pass);
    triggerMockAuthUpdate();
    return mockUser;
  }
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (isMock) {
    const storedPass = localStorage.getItem('mock_creds_' + email);
    const mockUser = { uid: 'user-' + email, email, displayName: email.split('@')[0] };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    triggerMockAuthUpdate();
    return mockUser;
  }
  return signInWithEmailAndPassword(auth, email, pass);
};

export const logout = async () => {
  if (isMock || localStorage.getItem('mock_user')) {
    localStorage.removeItem('mock_user');
    triggerMockAuthUpdate();
    return;
  }
  return signOut(auth);
};

export const subscribeToAuth = (callback: (user: any) => void) => {
  const getCurrentUser = () => {
    const stored = localStorage.getItem('mock_user');
    if (stored) return JSON.parse(stored);
    if (!isMock && auth && auth.currentUser) return auth.currentUser;
    return null;
  };

  callback(getCurrentUser());

  const handleMockChange = () => callback(getCurrentUser());
  window.addEventListener('mock_auth_state_changed', handleMockChange);

  let unsubscribeFirebase = () => {};
  if (!isMock && auth) {
    unsubscribeFirebase = onAuthStateChanged(auth, (user) => {
       if (user) {
         callback(user);
       } else {
         callback(getCurrentUser());
       }
    });
  }

  return () => {
    window.removeEventListener('mock_auth_state_changed', handleMockChange);
    unsubscribeFirebase();
  };
};

// --- Data Services (With Automatic Fallback) ---

export const getEventsForDay = async (userId: string, day: number): Promise<JournalEvent[]> => {
  if (isMock || localStorage.getItem('mock_user')) {
    return mockDB.get(userId).filter(e => e.day === day);
  }
  try {
    const q = query(collection(db, `users/${userId}/events`), where("day", "==", day));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEvent));
  } catch (e) {
    console.warn("Firestore Read Error (Falling back to local):", e);
    return mockDB.get(userId).filter(e => e.day === day);
  }
};

export const getEventCounts = async (userId: string): Promise<Record<number, number>> => {
  // Helper to count events
  const countEvents = (events: JournalEvent[]) => {
    const counts: Record<number, number> = {};
    events.forEach(e => counts[e.day] = (counts[e.day] || 0) + 1);
    return counts;
  };

  if (isMock || localStorage.getItem('mock_user')) {
    return countEvents(mockDB.get(userId));
  }
  
  try {
    const q = query(collection(db, `users/${userId}/events`));
    const querySnapshot = await getDocs(q);
    const counts: Record<number, number> = {};
    querySnapshot.docs.forEach(doc => {
      const d = doc.data().day;
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  } catch (e) {
    console.warn("Firestore Count Error (Falling back to local):", e);
    return countEvents(mockDB.get(userId));
  }
};

export const addEvent = async (userId: string, event: Omit<JournalEvent, 'id'>) => {
  if (isMock || localStorage.getItem('mock_user')) {
    return mockDB.add(userId, event);
  }
  try {
    const docRef = await addDoc(collection(db, `users/${userId}/events`), event);
    return { ...event, id: docRef.id };
  } catch (e) {
    console.warn("Firestore Write Error (Saved locally instead):", e);
    return mockDB.add(userId, event);
  }
};

export const updateEvent = async (userId: string, event: JournalEvent) => {
  if (isMock || localStorage.getItem('mock_user')) {
    mockDB.update(userId, event);
    return;
  }
  try {
    const eventRef = doc(db, `users/${userId}/events`, event.id);
    await updateDoc(eventRef, { ...event });
  } catch (e) {
    console.warn("Firestore Update Error (Updated locally instead):", e);
    mockDB.update(userId, event);
  }
};

export const deleteEvent = async (userId: string, eventId: string) => {
  if (isMock || localStorage.getItem('mock_user')) {
    mockDB.delete(userId, eventId);
    return;
  }
  try {
    await deleteDoc(doc(db, `users/${userId}/events`, eventId));
  } catch (e) {
    console.warn("Firestore Delete Error (Deleted locally instead):", e);
    mockDB.delete(userId, eventId);
  }
};
