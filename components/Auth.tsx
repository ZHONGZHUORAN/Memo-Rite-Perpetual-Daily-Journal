
import React, { useState } from 'react';
import { loginWithGoogle, loginGuest, loginWithEmail, registerWithEmail } from '../services/firebase';
import { Mail, User as UserIcon } from 'lucide-react';

export const Auth: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (error) {
      alert("Authentication failed: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center border dark:border-gray-700">
        <div className="w-20 h-20 bg-red-500 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-3xl font-pixel shadow-lg">
          M
        </div>
        <h1 className="text-3xl font-bold mb-2 font-pixel tracking-wider text-gray-800 dark:text-white">MEMO-RITE</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Record your daily moments, forever.</p>
        
        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6 text-left">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
              placeholder="hello@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
             {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-6 px-1">
           <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="hover:underline hover:text-red-500">
             {mode === 'login' ? 'Need an account?' : 'Have an account?'}
           </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => loginWithGoogle()}
            className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
            <span className="text-sm font-medium">Google</span>
          </button>
          
          <button
            onClick={() => loginGuest()}
            className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
          >
            <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-medium">Visitor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
