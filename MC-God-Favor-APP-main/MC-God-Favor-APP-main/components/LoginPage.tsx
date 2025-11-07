import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './common/Button';

interface LoginPageProps {
    loginBackground: string;
    loginMessage: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ loginBackground, loginMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  const handleResendConfirmation = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
    });
    setLoading(false);
    if (resendError) {
        setError(resendError.message);
    } else {
        setMessage('A new confirmation link has been sent to your email address.');
        setShowResendConfirmation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setShowResendConfirmation(false); // Reset on new submission

    const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    
    if (authError) {
        if (authError.message.toLowerCase().includes('email not confirmed')) {
            setError('Your email address has not been confirmed yet.');
            setShowResendConfirmation(true);
        } else {
            setError(authError.message);
        }
    }
    // On successful login, the onAuthStateChange listener in App.tsx will handle everything else.
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-light dark:bg-dark flex flex-col justify-center items-center p-4 relative">
        <div className="absolute inset-0 z-0">
            <img src={loginBackground} alt="Login Background" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>
      
      <div className="w-full max-w-md z-10">
        <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>God Favor Business Center</h1>
            <p className="text-gray-200 mt-2" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>Invoice Management System</p>
        </header>

        <main className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl">
             <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Login</h2>
                <p className="text-gray-500 dark:text-gray-400">
                    Please enter your credentials to continue.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="email-input" className="sr-only">Email</label>
                    <input
                        id="email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full p-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password-input" className="sr-only">Password</label>
                    <input
                        id="password-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full p-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    />
                </div>
                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                {message && <p className="text-sm text-center text-green-600 dark:text-green-400">{message}</p>}
                {loginMessage && !error && !message && <p className="text-sm text-center text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-900/50 rounded-md">{loginMessage}</p>}
                {showResendConfirmation && (
                    <div className="text-center text-sm">
                        <p className="text-gray-600 dark:text-gray-400">Didn't receive an email?</p>
                        <Button type="button" variant="ghost" onClick={handleResendConfirmation} disabled={loading} className="text-sm !px-2 !py-1 mt-1 border-none hover:bg-gray-200 dark:hover:bg-gray-700">
                            {loading ? 'Sending...' : 'Resend Confirmation Link'}
                        </Button>
                    </div>
                )}
                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Logging In...' : 'Login'}
                </Button>
            </form>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;