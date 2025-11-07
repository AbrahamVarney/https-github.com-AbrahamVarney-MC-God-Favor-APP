import React, { useState, ChangeEvent, useMemo, useEffect } from 'react';
import { Template, BusinessProfile, User } from '../types';
import { Button } from './common/Button';
import { supabase } from '../lib/supabaseClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  appIcon: string;
  businessProfile: BusinessProfile;
  users: User[];
  onSaveUsers: () => void;
  currentUser: User;
  loginBackground: string;
  onSave: (settings: {
    templates: Template[];
    appIcon: string;
    businessProfile: BusinessProfile;
    newBackgroundFile: File | null;
  }) => Promise<void>;
}

const newTemplateFactory = (): Template => ({
    id: `template_${Date.now()}`,
    name: 'New Template',
    isDefault: false,
    accentColor: '#6b7280',
    defaultNotes: 'Thank you!',
    layout: 'modern',
});

type SettingsView = 'templates' | 'appIcon' | 'businessProfile' | 'users' | 'loginPage';

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    templates, 
    appIcon, 
    businessProfile,
    users,
    onSaveUsers,
    currentUser,
    loginBackground,
    onSave,
}) => {
  const [localTemplates, setLocalTemplates] = useState<Template[]>(templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates.find(t=>t.isDefault)?.id || templates[0]?.id || null);
  const [localAppIcon, setLocalAppIcon] = useState<string>(appIcon);
  const [localBusinessProfile, setLocalBusinessProfile] = useState<BusinessProfile>(businessProfile);
  const [localLoginBackground, setLocalLoginBackground] = useState<string>(loginBackground);
  const [currentView, setCurrentView] = useState<SettingsView>('businessProfile');
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'staff' | 'admin'>('staff');
  const [isCreatingUser, setIsCreatingUser] = useState(false);


  const [isSaving, setIsSaving] = useState(false);
  const [newBackgroundFile, setNewBackgroundFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
        setLocalTemplates(templates);
        setLocalAppIcon(appIcon);
        setLocalBusinessProfile(businessProfile);
        setLocalLoginBackground(loginBackground);
        setNewBackgroundFile(null); // Reset on open
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('staff');
    }
  }, [templates, appIcon, businessProfile, loginBackground, isOpen]);
  
  const selectedTemplate = useMemo(() => 
    localTemplates.find(t => t.id === selectedTemplateId) || null,
    [localTemplates, selectedTemplateId]
  );
  
  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await onSave({
            templates: localTemplates,
            appIcon: localAppIcon,
            businessProfile: localBusinessProfile,
            newBackgroundFile: newBackgroundFile,
        });
        onClose();
    } catch (error: any) {
        alert(`Failed to save settings: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleTemplateChange = (field: keyof Template, value: any) => {
    if (!selectedTemplateId) return;
    setLocalTemplates(prev => prev.map(t => t.id === selectedTemplateId ? {...t, [field]: value} : t));
  };

  const handleProfileChange = (field: keyof BusinessProfile, value: any) => {
    setLocalBusinessProfile(prev => ({...prev, [field]: value}));
  };
  
  const handleSetDefaultTemplate = () => {
    if (!selectedTemplateId) return;
    setLocalTemplates(prev => prev.map(t => ({...t, isDefault: t.id === selectedTemplateId})));
  };

  const handleAddNewTemplate = () => {
      const newTemp = newTemplateFactory();
      setLocalTemplates(prev => [...prev, newTemp]);
      setSelectedTemplateId(newTemp.id);
  };
  
  const handleDeleteTemplate = () => {
      if (!selectedTemplateId || localTemplates.length <= 1) {
          alert("You cannot delete the last template.");
          return;
      }
      if (confirm(`Are you sure you want to delete template "${selectedTemplate?.name}"?`)) {
          const remainingTemplates = localTemplates.filter(t => t.id !== selectedTemplateId);
          if (selectedTemplate?.isDefault) {
              remainingTemplates[0].isDefault = true;
          }
          setLocalTemplates(remainingTemplates);
          setSelectedTemplateId(remainingTemplates[0].id);
      }
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleProfileChange('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAppIconUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalAppIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
        alert("Please fill in all fields: Name, Email, and Password.");
        return;
    }
    setIsCreatingUser(true);

    // Use supabase.auth.signUp which is invokable from the client-side.
    // The user's name and role are passed in the metadata, which the
    // database trigger `handle_new_user` will use to create their profile.
    const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
            data: { 
                name: newUserName.trim(), 
                role: newUserRole 
            },
        },
    });

    if (error) {
        alert(`Error creating user: ${error.message}`);
    } else if (data.user?.identities?.length === 0) {
        // This can happen if the user already exists but is not confirmed.
        alert('A user with this email already exists but has not confirmed their account. A new confirmation link has been sent.');
    } else {
        alert('User created successfully! They will need to confirm their email address to log in.');
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('staff');
        onSaveUsers(); // Refresh the user list
    }
    setIsCreatingUser(false);
  };


 const handleUpdateUser = async (userId: string) => {
    if (!editUserName.trim()) {
        alert("User name cannot be empty.");
        return;
    }

    const { error } = await supabase
        .from('profiles')
        .update({ name: editUserName.trim() })
        .eq('id', userId);

    if (error) {
        alert('Error updating user profile: ' + error.message);
    } else {
        alert('User updated successfully.');
        setEditingUserId(null);
        onSaveUsers();
    }
 };
 
 const handleResetUserPassword = async (email: string) => {
    if (confirm(`Are you sure you want to send a password reset link to ${email}?`)) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
            alert('Error sending password reset link: ' + error.message);
        } else {
            alert('Password reset link sent successfully.');
        }
    }
  };
  
 const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser.id) {
        alert("You cannot delete your own admin account.");
        return;
    }
    if (confirm(`Are you sure you want to delete user "${userName}"? This action is irreversible.`)) {
        // Using an edge function or admin client would be needed to delete from auth.users
        // For now, we inform the admin of the limitation.
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            alert('Error deleting user profile: ' + error.message);
        } else {
            alert('User profile deleted. The authenticated user should be removed from the Supabase dashboard.');
            onSaveUsers();
        }
    }
 };

 const handleRoleChange = async (userId: string, newRole: 'admin' | 'staff') => {
    if (userId === currentUser.id) {
        alert("For security reasons, you cannot change your own role.");
        return;
    }

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
    
    if (error) {
        alert('Error updating user role: ' + error.message);
    } else {
        alert('User role updated successfully.');
        onSaveUsers();
    }
 };

  const handleBackgroundUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewBackgroundFile(file);
      // Create a temporary URL for preview
      const previewUrl = URL.createObjectURL(file);
      setLocalLoginBackground(previewUrl);
    }
  };

  const renderLoginPageCustomization = () => (
    <div>
        <h3 className="text-2xl font-bold mb-4">Login Page Background</h3>
        <div className="space-y-4">
            <p className="text-sm text-gray-500">Upload a custom background image for the login screen. This image will be visible to all users on all devices.</p>
            <div>
                <label className="block text-sm font-medium text-gray-500">Background Image</label>
                <div className="mt-2 flex items-center gap-4">
                    <input type="file" accept="image/*" onChange={handleBackgroundUpload} className="text-sm" />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-500">Preview</label>
                <div className="mt-2 w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                    <img src={localLoginBackground} alt="Background Preview" className="w-full h-full object-cover" />
                </div>
            </div>
        </div>
    </div>
  );

  const renderTemplateEditor = () => {
    if (!selectedTemplate) return <div className="text-center p-8">Please select or create a template to begin.</div>;
    return (
        <div>
            <h3 className="text-2xl font-bold mb-4">Invoice Templates</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label htmlFor="template-selector" className="sr-only">Select Template</label>
                    <select
                        id="template-selector"
                        value={selectedTemplateId || ''}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                    >
                        {localTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                         <Button onClick={handleAddNewTemplate} variant="secondary" className="text-sm">Add New</Button>
                         <Button onClick={handleDeleteTemplate} variant="danger" className="text-sm">Delete</Button>
                    </div>
                </div>
                
                <hr className="my-4 border-gray-200 dark:border-gray-700"/>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Template Name</label>
                        <input type="text" value={selectedTemplate.name} onChange={e => handleTemplateChange('name', e.target.value)} className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Accent Color</label>
                        <input type="color" value={selectedTemplate.accentColor} onChange={e => handleTemplateChange('accentColor', e.target.value)} className="w-full h-10 mt-1 p-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Layout</label>
                        <select value={selectedTemplate.layout} onChange={e => handleTemplateChange('layout', e.target.value)} className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                            <option value="modern">Modern</option>
                            <option value="classic">Classic</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">&nbsp;</label>
                        <Button onClick={handleSetDefaultTemplate} disabled={selectedTemplate.isDefault} className="w-full mt-1">
                            {selectedTemplate.isDefault ? 'Default Template' : 'Set as Default'}
                        </Button>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-500">Default Notes</label>
                    <textarea value={selectedTemplate.defaultNotes} onChange={e => handleTemplateChange('defaultNotes', e.target.value)} rows={3} className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"></textarea>
                </div>
            </div>
        </div>
    );
  };
  
  const renderAppIconEditor = () => (
    <div>
        <h3 className="text-2xl font-bold mb-4">App Icon</h3>
        <div className="space-y-4">
            <p className="text-sm text-gray-500">Set the application icon (favicon and PWA icon). For best results, use a square image.</p>
            <div>
                <label className="block text-sm font-medium text-gray-500">Icon Image</label>
                <div className="mt-2 flex items-center gap-4">
                    <img src={localAppIcon} alt="App Icon Preview" className="h-12 w-12 rounded-lg object-cover" />
                    <input type="file" accept="image/*" onChange={handleAppIconUpload} className="text-sm" />
                </div>
            </div>
        </div>
    </div>
  );
  
  const renderBusinessProfileEditor = () => (
     <div>
        <h3 className="text-2xl font-bold mb-4">Business Profile</h3>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-500">Business Name</label>
                <input type="text" value={localBusinessProfile.name} onChange={e => handleProfileChange('name', e.target.value)} className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-500">Business Email</label>
                <input type="email" value={localBusinessProfile.email} onChange={e => handleProfileChange('email', e.target.value)} className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500">Business Address</label>
                <textarea value={localBusinessProfile.address} onChange={e => handleProfileChange('address', e.target.value)} rows={3} className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"></textarea>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-500">Business Logo</label>
                <div className="mt-2 flex items-center gap-4">
                    {localBusinessProfile.logoUrl && <img src={localBusinessProfile.logoUrl} alt="Logo Preview" className="h-12 rounded-lg bg-gray-200 p-1 object-contain" />}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
                </div>
            </div>
        </div>
    </div>
  );

  const renderUserManagement = () => (
    <div>
      <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">User Management</h3>
      
      <div className="space-y-6">
        <div>
            <h4 className="font-semibold text-lg mb-2">Create New User</h4>
            <form onSubmit={handleCreateUser} className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Full Name</label>
                        <input 
                            type="text" 
                            placeholder="John Doe"
                            value={newUserName}
                            onChange={e => setNewUserName(e.target.value)}
                            className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Role</label>
                        <select
                            value={newUserRole}
                            onChange={e => setNewUserRole(e.target.value as 'staff' | 'admin')}
                            className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                        >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <input 
                        type="email" 
                        placeholder="john.doe@example.com"
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                        className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500">Password</label>
                    <input 
                        type="password" 
                        placeholder="Set an initial password"
                        value={newUserPassword}
                        onChange={e => setNewUserPassword(e.target.value)}
                        className="w-full p-2 mt-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                        required
                    />
                </div>
                <div className="flex justify-end">
                    <Button type="submit" variant="secondary" disabled={isCreatingUser}>
                        {isCreatingUser ? 'Creating...' : 'Create User'}
                    </Button>
                </div>
            </form>
        </div>
        <div>
            <h4 className="font-semibold text-lg">Existing Users</h4>
            <div className="space-y-2 mt-2">
                {users.map(user => (
                  <div key={user.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {editingUserId === user.id ? (
                        <>
                          <input type="text" value={editUserName} onChange={e => setEditUserName(e.target.value)} className="flex-grow p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600" />
                          <div className="flex gap-2">
                              <Button onClick={() => handleUpdateUser(user.id)} variant="primary" className="text-sm">Save</Button>
                              <Button onClick={() => setEditingUserId(null)} variant="ghost" className="text-sm">Cancel</Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-grow">
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label htmlFor={`role-${user.id}`} className="text-sm font-medium text-gray-500">Role:</label>
                            <select
                                id={`role-${user.id}`}
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'staff')}
                                disabled={user.id === currentUser.id}
                                className="p-1 rounded-md text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                            <Button onClick={() => { setEditingUserId(user.id); setEditUserName(user.name); }} variant="ghost" className="text-sm">Edit Name</Button>
                            <Button onClick={() => handleResetUserPassword(user.email)} variant="ghost" className="text-sm">Reset Password</Button>
                            {user.id !== currentUser.id && <Button onClick={() => handleDeleteUser(user.id, user.name)} variant="danger" className="text-sm">Delete</Button>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
      switch (currentView) {
          case 'businessProfile': return renderBusinessProfileEditor();
          case 'users': return renderUserManagement();
          case 'templates': return renderTemplateEditor();
          case 'appIcon': return renderAppIconEditor();
          case 'loginPage': return renderLoginPageCustomization();
          default: return null;
      }
  };

  const NavButton: React.FC<{ view: SettingsView; label: string }> = ({ view, label }) => (
    <button 
        onClick={() => setCurrentView(view)} 
        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${currentView === view ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
    >
        {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Settings</h2>
          <button onClick={onClose} className="text-2xl font-bold">&times;</button>
        </header>

        <main className="flex-grow flex overflow-hidden">
            <nav className="w-1/4 p-4 border-r border-gray-200 dark:border-gray-700 space-y-1 overflow-y-auto">
                <NavButton view="businessProfile" label="Business Profile" />
                <NavButton view="users" label="User Management" />
                <NavButton view="templates" label="Invoice Templates" />
                <NavButton view="appIcon" label="App Icon" />
                <NavButton view="loginPage" label="Login Page" />
            </nav>
            <div className="w-3/4 p-6 overflow-y-auto">
                {renderContent()}
            </div>
        </main>
        
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} variant="primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default SettingsModal;