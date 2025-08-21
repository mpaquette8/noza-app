import React, { useState, useEffect } from 'react';
import ProfileHeader from '../components/profile/ProfileHeader';
import PreferencesForm from '../components/profile/PreferencesForm';
import ActivityStats from '../components/profile/ActivityStats';
import ProfileSettings from '../components/profile/ProfileSettings';

const tabs = [
  { id: 'profil', label: 'Mon profil' },
  { id: 'preferences', label: 'Mes préférences' },
  { id: 'activite', label: 'Mon activité' },
  { id: 'parametres', label: 'Paramètres' },
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profil');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {});
  }, []);

  return (
    <div className='p-4 max-w-4xl mx-auto space-y-4'>
      <ProfileHeader profile={profile} />
      <div>
        <nav className='flex border-b border-gray-200 dark:border-gray-700'>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`px-4 py-2 -mb-px border-b-2 ${activeTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className='mt-4'>
          {activeTab === 'profil' && <div>Bienvenue sur votre profil.</div>}
          {activeTab === 'preferences' && (
            <PreferencesForm profile={profile} onUpdate={setProfile} />
          )}
          {activeTab === 'activite' && <ActivityStats />}
          {activeTab === 'parametres' && (
            <ProfileSettings profile={profile} />
          )}
        </div>
      </div>
    </div>
  );
}
