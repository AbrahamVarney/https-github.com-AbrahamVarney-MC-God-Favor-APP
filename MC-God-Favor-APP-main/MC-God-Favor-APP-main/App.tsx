import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Invoice, Product, Template, BusinessProfile, User } from './types';
import { InvoiceList } from './components/InvoiceList';
import { Button } from './components/common/Button';
import { InstallPWAButton } from './components/common/InstallPWAButton';
import { PWAInstallPromptModal } from './components/common/PWAInstallPromptModal';
import { CustomerStatsDashboard } from './components/CustomerStatsDashboard';
import { ReportsDashboard } from './components/ReportsDashboard';
import { SplashScreen } from './components/common/SplashScreen';
import { Loader } from './components/common/Loader';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useAppIcon } from './hooks/useAppIcon';
import { SAMPLE_PRODUCTS, DEFAULT_TEMPLATE, DEFAULT_APP_ICON } from './constants';
import { supabase } from './lib/supabaseClient';

// Lazy-load components to split the code into smaller chunks.
// This means the code for these components won't be downloaded until they are first needed.
const DatabaseSetup = lazy(() => import('./components/DatabaseSetup'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const InvoiceForm = lazy(() => import('./components/InvoiceForm'));
const InvoiceView = lazy(() => import('./components/InvoiceView'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));


/**
 * Fetches an existing user profile from the database. If one doesn't exist,
 * it creates a fallback profile. This makes the app resilient to issues like
 * a failed database trigger during sign-up.
 * @param user The authenticated user object from Supabase.
 * @returns A promise that resolves to the user's profile or null if it cannot be fetched or created.
 */
const getOrCreateUserProfile = async (user: SupabaseUser): Promise<User | null> => {
  // First, try to fetch the existing profile.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If a profile is found, return it.
  if (profile) {
    return profile as User;
  }

  // If the error is anything other than "no rows found", it's a real issue.
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  // If no profile was found (PGRST116), attempt to create one as a fallback.
  console.warn(`Profile not found for user ${user.id}. Attempting to create a fallback profile.`);
  
  // The user's metadata is not available client-side in the session.
  // We must use sensible defaults. The name can be edited later in settings.
  const fallbackName = user.email?.split('@')[0] || 'New User';

  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email!,
      name: fallbackName,
      role: 'staff' // Default to the least privileged role for security.
    })
    .select()
    .single();

  if (insertError) {
    console.error('Fallback profile creation failed:', insertError);
    return null; // Failed to create a profile.
  }

  console.log('Fallback profile created successfully.');
  return newProfile as User;
};


const App: React.FC = () => {
  // Authentication & User State
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [needsDbSetup, setNeedsDbSetup] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  // App Data State (persisted in localStorage)
  const [invoices, setInvoices, invoicesLoading] = useLocalStorage<Invoice[]>('invoices', []);
  const [products, setProducts, productsLoading] = useLocalStorage<Product[]>('products', SAMPLE_PRODUCTS);
  const [templates, setTemplates, templatesLoading] = useLocalStorage<Template[]>('templates', [DEFAULT_TEMPLATE]);
  const [businessProfile, setBusinessProfile, profileLoading] = useLocalStorage<BusinessProfile>('businessProfile', {
    name: 'God Favor Business Center',
    email: 'contact@gfbc.com',
    address: '123 Business Rd.\nCity, Country 12345',
    logoUrl: '',
  });
  const [appIcon, setAppIcon, iconLoading] = useLocalStorage<string>('appIcon', DEFAULT_APP_ICON);
  const [loginBackground, setLoginBackground, backgroundLoading] = useLocalStorage<string>('loginBackground', '/default-background.jpg');

  // Combined loading state for all localStorage items
  const isLocalDataLoading = invoicesLoading || productsLoading || templatesLoading || profileLoading || iconLoading || backgroundLoading;

  // UI/View State
  const [view, setView] = useState<'list' | 'form' | 'view'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [printOnLoad, setPrintOnLoad] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPwaPromptOpen, setIsPwaPromptOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'reports'>('overview');

  // Custom Hooks
  const { canInstall, promptInstall, isIOS, isDesktop } = usePWAInstall();
  useAppIcon(appIcon);

  const fetchUsers = useCallback(async () => {
    if (currentUser?.role !== 'admin') {
      setUsers(currentUser ? [currentUser] : []);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data as User[]);
    }
  }, [currentUser]);

  useEffect(() => {
    // This effect handles all initial app loading logic in a sequential, non-racy way.
    const initializeApp = async () => {
      // First, check if the database needs to be set up. This is the most critical check.
      const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
      if (dbError && (dbError.code === '42P01' || dbError.message.includes('does not exist'))) {
        setNeedsDbSetup(true);
        setIsAuthLoading(false); // We're done loading, show the setup screen.
        return; // Stop here.
      }

      // If DB is okay, get the current session to see if a user is logged in.
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userProfile = await getOrCreateUserProfile(session.user);
        if (userProfile) {
          setSession(session);
          setCurrentUser(userProfile);
        } else {
          // Failed to get or create a profile. Sign them out.
          setLoginMessage('Your user profile could not be loaded or created. Please contact support.');
          await supabase.auth.signOut();
          setSession(null);
          setCurrentUser(null);
        }
      } else {
        // No user is logged in.
        setSession(null);
        setCurrentUser(null);
      }
      
      // All initial checks are complete, hide the splash screen.
      setIsAuthLoading(false);
    };
  
    initializeApp();
  
    // Now, set up the auth listener to react to subsequent changes (e.g., user logs in/out in another tab).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const userProfile = await getOrCreateUserProfile(session.user);
        setCurrentUser(userProfile); // This will be null if getOrCreate fails, which is correct.
      } else {
        setCurrentUser(null);
      }
    });
  
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && currentUser) {
      fetchUsers();
    }
  }, [session, currentUser, fetchUsers]);


  const handleSaveInvoice = (invoice: Invoice) => {
    const isEditing = !!invoiceToEdit;
    setInvoices(prev =>
      isEditing ? prev.map(inv => (inv.id === invoice.id ? invoice : inv)) : [...prev, invoice]
    );
    setInvoiceToEdit(null);
    setSelectedInvoice(invoice);
    if (!isEditing) {
      setPrintOnLoad(true);
    }
    setView('view');
  };

  const handleDeleteInvoice = () => {
    if (!selectedInvoice) return;
    setInvoices(prev => prev.filter(inv => inv.id !== selectedInvoice.id));
    setSelectedInvoice(null);
    setView('list');
  };

  const handleAddNewProduct = (productName: string): Product => {
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name: productName,
      description: 'Newly added item',
    };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  };

  const handleSaveSettings = async (settings: {
    templates: Template[];
    appIcon: string;
    businessProfile: BusinessProfile;
    newBackgroundFile: File | null;
  }) => {
    setTemplates(settings.templates);
    setAppIcon(settings.appIcon);
    setBusinessProfile(settings.businessProfile);

    if (settings.newBackgroundFile) {
        const file = settings.newBackgroundFile;
        const fileName = `login-background.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
            .from('app-assets')
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            throw new Error(`Background upload failed: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(fileName);
        setLoginBackground(`${publicUrl}?t=${new Date().getTime()}`);
    }
  };

  const handleLogout = async () => {
    // Reset all application state to its initial default values.
    // This clears all data from the previous user's session from both
    // React state and localStorage, preventing data leaks and performance
    // degradation from accumulating data across sessions.
    setInvoices([]);
    setProducts(SAMPLE_PRODUCTS);
    setTemplates([DEFAULT_TEMPLATE]);
    setBusinessProfile({
      name: 'God Favor Business Center',
      email: 'contact@gfbc.com',
      address: '123 Business Rd.\nCity, Country 12345',
      logoUrl: '',
    });
    setAppIcon(DEFAULT_APP_ICON);
    setLoginBackground('/default-background.jpg');
    
    // Reset UI state
    setView('list');
    setSelectedInvoice(null);
    setInvoiceToEdit(null);
    setSearchTerm('');
    setDashboardTab('overview');
    
    await supabase.auth.signOut();
  };

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    const lowercasedTerm = searchTerm.toLowerCase();
    return invoices.filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(lowercasedTerm) ||
      invoice.billTo.name.toLowerCase().includes(lowercasedTerm)
    );
  }, [invoices, searchTerm]);

  if (isAuthLoading || isLocalDataLoading) {
    return <SplashScreen />;
  }

  const renderContent = () => {
    switch (view) {
      case 'form':
        return (
          <InvoiceForm
            onSave={handleSaveInvoice}
            onCancel={() => { setInvoiceToEdit(null); setView('list'); }}
            invoiceToEdit={invoiceToEdit}
            products={products}
            templates={templates}
            invoices={invoices}
            onAddNewProduct={handleAddNewProduct}
            businessProfile={businessProfile}
            users={users}
            currentUser={currentUser!}
          />
        );
      case 'view':
        return selectedInvoice ? (
          <InvoiceView
            invoice={selectedInvoice}
            templates={templates}
            onClose={() => { setSelectedInvoice(null); setView('list'); }}
            onEdit={() => { setInvoiceToEdit(selectedInvoice); setView('form'); }}
            onDelete={handleDeleteInvoice}
            printOnLoad={printOnLoad}
            onPrintComplete={() => setPrintOnLoad(false)}
            users={users}
          />
        ) : null;
      case 'list':
      default:
        return (
          <>
            <div className="flex justify-center mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-4">
                    <button onClick={() => setDashboardTab('overview')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${dashboardTab === 'overview' ? 'bg-white dark:bg-gray-800 text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Overview</button>
                    <button onClick={() => setDashboardTab('reports')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${dashboardTab === 'reports' ? 'bg-white dark:bg-gray-800 text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Reports</button>
                </nav>
            </div>
            
            <div className="mb-8">
                {dashboardTab === 'overview' ? <CustomerStatsDashboard invoices={invoices} /> : <ReportsDashboard invoices={invoices} />}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">All Invoices</h2>
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full md:w-64 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
              />
            </div>
            <InvoiceList invoices={filteredInvoices} onSelectInvoice={(inv) => { setSelectedInvoice(inv); setView('view'); }} users={users} totalInvoiceCount={invoices.length} />
          </>
        );
    }
  };

  if (needsDbSetup) {
    return (
      <Suspense fallback={<SplashScreen />}>
        <DatabaseSetup onComplete={() => window.location.reload()} />
      </Suspense>
    );
  }

  if (!session || !currentUser) {
    return (
      <Suspense fallback={<SplashScreen />}>
        <LoginPage loginBackground={loginBackground} loginMessage={loginMessage} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
            {businessProfile.logoUrl ? 
                <img src={businessProfile.logoUrl} alt="Logo" className="h-10 object-contain" /> :
                <h1 className="text-xl font-bold text-primary">{businessProfile.name}</h1>
            }
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <InstallPWAButton onOpenInstallPrompt={() => setIsPwaPromptOpen(true)} />
          <Button variant="primary" onClick={() => { setInvoiceToEdit(null); setView('form'); }}>
            Create New Invoice
          </Button>
          <div className="relative group">
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
             <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             </button>
          </div>
        </div>
      </header>
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Suspense fallback={<Loader />}>
            {renderContent()}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {isSettingsOpen && currentUser && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            templates={templates}
            appIcon={appIcon}
            businessProfile={businessProfile}
            users={users}
            onSaveUsers={fetchUsers}
            currentUser={currentUser}
            loginBackground={loginBackground}
            onSave={handleSaveSettings}
          />
        )}
      </Suspense>
      <PWAInstallPromptModal 
        isOpen={isPwaPromptOpen} 
        onClose={() => setIsPwaPromptOpen(false)}
        onInstall={promptInstall}
        isIOS={isIOS}
        isDesktop={isDesktop}
      />
    </div>
  );
};

export default App;