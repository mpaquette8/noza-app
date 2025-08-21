import React, { useState } from 'react';

export default function PreferencesForm({ profile, onUpdate }) {
  const [form, setForm] = useState(profile?.preferences || {});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/profile/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate && onUpdate((p) => ({ ...p, preferences: updated }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label className='block text-sm font-medium'>Langue</label>
        <input
          name='language'
          value={form.language || ''}
          onChange={handleChange}
          className='mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded'
        />
      </div>
      <div className='flex items-center'>
        <input
          id='newsletter'
          type='checkbox'
          name='newsletter'
          checked={form.newsletter || false}
          onChange={handleChange}
          className='mr-2'
        />
        <label htmlFor='newsletter'>Recevoir la newsletter</label>
      </div>
      <button
        type='submit'
        className='px-4 py-2 bg-blue-600 text-white rounded'
      >
        Sauvegarder
      </button>
    </form>
  );
}
