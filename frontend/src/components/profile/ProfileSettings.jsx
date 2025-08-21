import React from 'react';

export default function ProfileSettings({ profile }) {
  const handleDelete = async () => {
    await fetch('/api/profile', { method: 'DELETE' });
    // Additional handling like redirecting could be here
  };

  const handleSave = async () => {
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
  };

  return (
    <div className='space-y-4'>
      <button
        onClick={handleSave}
        className='px-4 py-2 bg-green-600 text-white rounded'
      >
        Enregistrer
      </button>
      <button
        onClick={handleDelete}
        className='px-4 py-2 bg-red-600 text-white rounded'
      >
        Supprimer le compte
      </button>
    </div>
  );
}
