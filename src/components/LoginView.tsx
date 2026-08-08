import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { AdminCredentials } from '../types';

interface LoginViewProps {
  adminCredentials: AdminCredentials;
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  adminCredentials,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const cleanInputUser = username.trim();
      const targetUser = adminCredentials.username.trim();
      const targetPass = adminCredentials.password;

      if (cleanInputUser === targetUser && password === targetPass) {
        onLoginSuccess();
      } else {
        setError('Invalid username or password. Please try again.');
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white text-center border-b border-slate-800">
          <div className="w-14 h-14 bg-indigo-600/30 border border-indigo-400/40 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Noorul Huda</h1>
          <p className="text-xs text-indigo-200/80 uppercase font-semibold tracking-widest mt-0.5">
            Examination Management Board
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sign In to Admin Portal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access the examination seating portal.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center transition disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                'Verifying Credentials...'
              ) : (
                <>
                  Login to Portal
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Secure Exam Management Portal &bull; Noorul Huda
          </div>
        </div>
      </div>
    </div>
  );
};
