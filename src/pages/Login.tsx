import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Lock, Mail, Loader2, Eye, EyeOff, AlertCircle, Terminal, Copy, Check, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { user, profile, profileError, signOut } = useAuth();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isStripeKey = supabaseAnonKey?.startsWith('sb_publishable_');
  const [forceDemo, setForceDemo] = useState(false);
  const isInvalidKey = !forceDemo && (!supabaseAnonKey || !supabaseUrl || profileError?.message === 'Invalid API key' || profileError?.code === 'PGRST111' || isStripeKey);

  useEffect(() => {
    if (user && profile) {
      navigate(`/${profile.role}`);
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid API key') {
          throw new Error('Supabase API Key is invalid. Please check your AI Studio settings.');
        }
        throw error;
      }

      if (data.user) {
        // Fetch profile to determine role and redirect
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // Profile missing - this is handled in the UI below via useAuth
            return;
          }
          throw profileError;
        }

        if (profile) {
          navigate(`/${profile.role}`);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const sqlFix = `-- Run this in your Supabase SQL Editor to fix the PGRST116 error:
INSERT INTO public.profiles (id, name, email, role)
VALUES ('${user?.id || 'YOUR_USER_ID'}', '${user?.email?.split('@')[0] || 'Admin'}', '${user?.email || 'hardik.mca1996@gmail.com'}', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlFix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('SQL copied to clipboard!');
  };

  if (isInvalidKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-orange-500">
            <div className="flex items-center space-x-3 mb-6">
              <Lock className="h-8 w-8 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">Invalid API Key</h2>
            </div>
            
            <div className="prose prose-sm text-gray-600 mb-6">
              {isStripeKey ? (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
                  <p className="text-orange-800 font-bold mb-1">Stripe Key Detected!</p>
                  <p className="text-orange-700 text-xs">
                    The key you provided starts with <code>sb_publishable_</code>. This is a <strong>Stripe</strong> key, but this application needs a <strong>Supabase</strong> key.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                  <p className="text-red-800 font-bold mb-1">Configuration Missing</p>
                  <ul className="text-red-700 text-xs list-disc pl-4 space-y-1">
                    {!supabaseUrl && <li><code>VITE_SUPABASE_URL</code> is missing</li>}
                    {!supabaseAnonKey && <li><code>VITE_SUPABASE_ANON_KEY</code> is missing</li>}
                    {supabaseUrl && !supabaseUrl.startsWith('https://') && <li><code>VITE_SUPABASE_URL</code> must start with https://</li>}
                  </ul>
                </div>
              )}
              <p className="font-medium text-gray-800">
                To fix this on Vercel:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Go to your <strong>Vercel Dashboard</strong>.</li>
                <li>Navigate to <strong>Settings &gt; Environment Variables</strong>.</li>
                <li>Add <code>VITE_SUPABASE_URL</code> (Project URL).</li>
                <li>Add <code>VITE_SUPABASE_ANON_KEY</code> (anon public key).</li>
                <li className="text-indigo-600 font-bold">Important: You must REDEPLOY your project on Vercel after adding these.</li>
              </ol>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                I've updated the key, refresh
              </button>
              
              {import.meta.env.DEV && (
                <button
                  onClick={() => setForceDemo(true)}
                  className="w-full px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Terminal className="h-4 w-4" />
                  <span>Try Demo Mode (Mock Data)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user && !profile && profileError?.code === 'PGRST116') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-red-500">
            <div className="flex items-center space-x-3 mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900">Profile Missing (PGRST116)</h2>
            </div>
            
            <div className="prose prose-sm text-gray-600 mb-6">
              <p>
                You are successfully authenticated as <strong>{user.email}</strong>, but your account is not yet linked to the application's permission system.
              </p>
              <p className="font-medium text-gray-800">
                To fix this, please follow these steps:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Open your <strong>Supabase Dashboard</strong>.</li>
                <li>Go to the <strong>SQL Editor</strong> tab.</li>
                <li>Click <strong>New Query</strong>.</li>
                <li>Paste the code below and click <strong>Run</strong>.</li>
              </ol>
            </div>

            <div className="relative group">
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2 text-xs"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>
              <div className="bg-gray-900 rounded-lg p-6 font-mono text-sm text-green-400 overflow-x-auto border border-gray-800 shadow-inner pt-12">
                <div className="flex items-center space-x-2 mb-4 opacity-50">
                  <Terminal className="h-4 w-4" />
                  <span>SQL Editor</span>
                </div>
                <pre className="whitespace-pre-wrap">{sqlFix}</pre>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                I've run the SQL, try again
              </button>
              <button
                onClick={() => signOut()}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <BookOpen className="w-12 h-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to KLEVELUP
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your credentials to access your portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex justify-center">
              <Link 
                to="/privacy-policy" 
                className="flex items-center space-x-2 text-xs text-gray-400 hover:text-indigo-600 transition-colors group"
              >
                <Shield className="h-3 w-3 group-hover:animate-pulse" />
                <span>Privacy Policy</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
