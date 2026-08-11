import React, { useState } from 'react';
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { loginUser, registerUser } from '../lib/auth';

export const AccountGate: React.FC = () => {
  const [mode, setMode] = useState<'login'|'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (mode === 'signup' && password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must contain at least 6 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') await registerUser(name, email, password);
      else await loginUser(email, password);
    } catch (err: any) {
      const code = err?.code || '';
      const messages: Record<string,string> = {
        'auth/email-already-in-use':'An account already exists with this email.',
        'auth/invalid-credential':'Incorrect email or password.',
        'auth/invalid-email':'Enter a valid email address.',
        'auth/weak-password':'Choose a stronger password.',
        'auth/operation-not-allowed':'Email/password sign-in is not enabled in Firebase yet.',
      };
      setError(messages[code] || err?.message || 'Unable to complete the request.');
    } finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
    <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-2xl">
      <div className="hidden md:flex bg-slate-900 text-white p-10 flex-col justify-between">
        <div><div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-6"><Building2/></div><h1 className="text-3xl font-black">Examio</h1><p className="text-slate-400 mt-2">Examination management for institutions and campuses.</p></div>
        <div className="space-y-4 text-sm text-slate-300"><p>✓ One account can manage multiple campuses.</p><p>✓ Permanent academic data is stored per campus.</p><p>✓ Each campus can have multiple examinations.</p></div>
      </div>
      <div className="p-7 md:p-10"><div className="flex items-center gap-2 text-slate-900 font-black"><ShieldCheck className="w-5 h-5 text-blue-600"/> Examio</div>
        <div className="mt-8"><h2 className="text-2xl font-black text-slate-900">{mode==='signup'?'Create your account':'Welcome back'}</h2><p className="text-sm text-slate-500 mt-1">{mode==='signup'?'Your account can contain one or more campuses.':'Sign in to continue to your campuses.'}</p></div>
        {error && <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode==='signup' && <div><label className="text-xs font-bold text-slate-700">Full name</label><div className="relative mt-1"><User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input required value={name} onChange={e=>setName(e.target.value)} className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200" placeholder="Your name"/></div></div>}
          <div><label className="text-xs font-bold text-slate-700">Email</label><div className="relative mt-1"><Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200" placeholder="you@example.com"/></div></div>
          <div><label className="text-xs font-bold text-slate-700">Password</label><div className="relative mt-1"><Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input required type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-9 pr-10 py-3 rounded-xl border border-slate-200" placeholder="At least 6 characters"/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-3 text-slate-400">{show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div></div>
          {mode==='signup' && <div><label className="text-xs font-bold text-slate-700">Confirm password</label><input required type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full mt-1 px-3 py-3 rounded-xl border border-slate-200"/></div>}
          <button disabled={busy} className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy?'Please wait…':mode==='signup'?'Create account':'Sign in'} {!busy&&<ArrowRight className="w-4 h-4"/>}</button>
        </form>
        <button onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('')}} className="w-full mt-5 text-sm font-semibold text-blue-600">{mode==='signup'?'Already have an account? Sign in':'New to Examio? Create an account'}</button>
      </div>
    </div>
  </div>;
};
