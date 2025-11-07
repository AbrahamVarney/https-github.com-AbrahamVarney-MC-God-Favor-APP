import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './common/Button';

// NOTE: This setup requires a PostgreSQL function in your Supabase project.
// Go to Database -> Functions -> Create a new function and paste the following:
/*
  CREATE OR REPLACE FUNCTION execute_sql(sql_statement TEXT)
  RETURNS void
  LANGUAGE plpgsql
  AS $$
  BEGIN
    EXECUTE sql_statement;
  END;
  $$;
*/
const SETUP_SQL = `
-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone NULL,
  name character varying NULL,
  email character varying NOT NULL,
  role text NULL DEFAULT 'staff'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
-- Clean up all potential old policies to ensure a clean slate.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile." ON public.profiles;
-- Drop consolidated policies if they exist from a previous run
DROP POLICY IF EXISTS "Users can view profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles." ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles." ON public.profiles;


-- RLS Policy: SELECT
-- Users can view their own profile. Admins can view all profiles.
CREATE POLICY "Users can view profiles." ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policy: INSERT
-- An authenticated user can insert their own profile.
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policy: UPDATE
-- Users can update their own profile. Admins can update any profile.
CREATE POLICY "Users can update profiles." ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policy: DELETE
-- Only admins can delete profiles.
CREATE POLICY "Admins can delete profiles." ON public.profiles
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );


-- Function to create a profile for a new user and make the first user an admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count integer;
  new_user_role text;
BEGIN
  -- Check if any other users exist in the system yet.
  SELECT count(*) INTO user_count FROM auth.users WHERE id != NEW.id;

  -- Determine the role for the new user.
  IF user_count = 0 THEN
    -- If this is the first user, assign them the 'admin' role.
    new_user_role := 'admin';
  ELSE
    -- For all subsequent users, assign the role from the sign-up metadata,
    -- defaulting to 'staff' if not provided. This allows admins to create other users.
    new_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  END IF;

  -- Insert a new profile for the user with the determined role.
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    new_user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create a profile when a new user signs up in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;

interface DatabaseSetupProps {
    onComplete: () => void;
}

const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onComplete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState('');

    const handleSetup = async () => {
        setIsLoading(true);
        setError(null);
        setProgress('Starting database setup...');

        try {
            setProgress('Updating database functions and policies...');
            // The `execute_sql` function must be created in your Supabase SQL editor.
            const { error: rpcError } = await supabase.rpc('execute_sql', { sql_statement: SETUP_SQL });
            if (rpcError) throw rpcError;
            
            setProgress('Verifying storage bucket for app assets...');
            // Try to create storage bucket. This might fail if user does not have permission.
            // In a real app, this should be done from the Supabase dashboard.
            const { error: bucketError } = await supabase.storage.createBucket('app-assets', { public: true });
            if (bucketError && bucketError.message !== 'The resource already exists') {
                console.warn(`Could not create storage bucket 'app-assets': ${bucketError.message}. Please create it manually in your Supabase dashboard and set it to public.`);
            }

            setProgress('Setup complete! The application will now reload.');
            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (e: any) {
            setError(`An error occurred: ${e.message}. Please ensure you have created the 'execute_sql' function in your Supabase SQL Editor as per the instructions in the code.`);
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-light dark:bg-dark flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center">
                <h1 className="text-3xl font-bold text-primary mb-4">First-Time Setup</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Welcome! It looks like this is the first time you're running the application, or an update is required.
                    We need to set up your database tables and storage.
                </p>
                
                <div className="bg-green-50 dark:bg-green-900/50 p-4 rounded-lg mb-6 text-left text-sm text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    <h4 className="font-bold">Important: First User is Admin</h4>
                    <p className="mt-1">
                        The database is configured to automatically make the <strong>very first person</strong> who signs up an <strong>administrator</strong>.
                    </p>
                    <p className="mt-2">
                        After running the setup, simply sign up in the application with your desired admin credentials.
                        You will then have full access to manage other users and settings.
                    </p>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                    <strong>Note:</strong> This setup requires a helper function in your Supabase project. Please see the comments in <code>DatabaseSetup.tsx</code> for instructions if this fails.
                </p>
                <Button onClick={handleSetup} disabled={isLoading} variant="primary" className="w-full">
                    {isLoading ? 'Setting Up...' : 'Run Database Setup'}
                </Button>
                {progress && !error && <p className="mt-4 text-sm text-gray-500">{progress}</p>}
                {error && <p className="mt-4 text-sm text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}
            </div>
        </div>
    );
};

export default DatabaseSetup;
