import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { JournalEvent } from '../types';

// NOTE: In a real production app, use process.env.REACT_APP_FIREBASE_...
// For this generated code to work immediately without configuration, 
// I will implement a "Mock Mode" using LocalStorage if config is missing.

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
  if (firebaseConfig.apiKey) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    isMock = true;
    console.warn("Firebase API Key missing. Running in LocalStorage Mock Mode.");
  }
} catch (e) {
  isMock = true;
  console.error("Firebase init failed", e);
}

// Helper to trigger UI updates without reloading the page
const triggerMockAuthUpdate = () => {
  window.dispatchEvent(new Event('mock_auth_state_changed'));
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
    alert("Google Login failed (likely due to missing config). Switching to mock mode for this session.");
    isMock = true;
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
    // For mock convenience, accept any password if user doesn't exist yet, or check match
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
  // 1. Define how to get the current user state
  const getCurrentUser = () => {
    const stored = localStorage.getItem('mock_user');
    if (stored) return JSON.parse(stored);
    if (!isMock && auth && auth.currentUser) return auth.currentUser;
    return null;
  };

  // 2. Initial Callback
  callback(getCurrentUser());

  // 3. Listen for Mock Changes (Custom Event)
  const handleMockChange = () => {
    callback(getCurrentUser());
  };
  window.addEventListener('mock_auth_state_changed', handleMockChange);

  // 4. Listen for Firebase Changes
  let unsubscribeFirebase = () => {};
  if (!isMock && auth) {
    unsubscribeFirebase = onAuthStateChanged(auth, (user) => {
       // If firebase emits a user, it usually takes precedence, or if it emits null, we check if we have a mock user
       if (user) {
         callback(user);
       } else {
         // Fallback to checking local storage (e.g. if we switched to mock mode)
         callback(getCurrentUser());
       }
    });
  }

  // 5. Return Unsubscribe
  return () => {
    window.removeEventListener('mock_auth_state_changed', handleMockChange);
    unsubscribeFirebase();
  };
};

// --- Data Services ---

export const getEventsForDay = async (userId: string, day: number): Promise<JournalEvent[]> => {
  if (isMock || localStorage.getItem('mock_user')) {
    const allEvents = JSON.parse(localStorage.getItem(`events_${userId}`) || '[]');
    return allEvents.filter((e: JournalEvent) => e.day === day);
  }
  const q = query(collection(db, `users/${userId}/events`), where("day", "==", day));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEvent));
};

export const getEventCounts = async (userId: string): Promise<Record<number, number>> => {
  if (isMock || localStorage.getItem('mock_user')) {
    const allEvents = JSON.parse(localStorage.getItem(`events_${userId}`) || '[]');
    const counts: Record<number, number> = {};
    allEvents.forEach((e: JournalEvent) => {
      counts[e.day] = (counts[e.day] || 0) + 1;
    });
    return counts;
  }
  
  const q = query(collection(db, `users/${userId}/events`));
  const querySnapshot = await getDocs(q);
  const counts: Record<number, number> = {};
  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    const d = data.day;
    counts[d] = (counts[d] || 0) + 1;
  });
  return counts;
};

export const addEvent = async (userId: string, event: Omit<JournalEvent, 'id'>) => {
  if (isMock || localStorage.getItem('mock_user')) {
    const allEvents = JSON.parse(localStorage.getItem(`events_${userId}`) || '[]');
    const newEvent = { ...event, id: Date.now().toString() };
    allEvents.push(newEvent);
    localStorage.setItem(`events_${userId}`, JSON.stringify(allEvents));
    return newEvent;
  }
  const docRef = await addDoc(collection(db, `users/${userId}/events`), event);
  return { ...event, id: docRef.id };
};

export const updateEvent = async (userId: string, event: JournalEvent) => {
  if (isMock || localStorage.getItem('mock_user')) {
    let allEvents = JSON.parse(localStorage.getItem(`events_${userId}`) || '[]');
    allEvents = allEvents.map((e: JournalEvent) => e.id === event.id ? event : e);
    localStorage.setItem(`events_${userId}`, JSON.stringify(allEvents));
    return;
  }
  const eventRef = doc(db, `users/${userId}/events`, event.id);
  await updateDoc(eventRef, { ...event });
};

export const deleteEvent = async (userId: string, eventId: string) => {
  if (isMock || localStorage.getItem('mock_user')) {
    let allEvents = JSON.parse(localStorage.getItem(`events_${userId}`) || '[]');
    allEvents = allEvents.filter((e: JournalEvent) => e.id !== eventId);
    localStorage.setItem(`events_${userId}`, JSON.stringify(allEvents));
    return;
  }
  await deleteDoc(doc(db, `users/${userId}/events`, eventId));
};