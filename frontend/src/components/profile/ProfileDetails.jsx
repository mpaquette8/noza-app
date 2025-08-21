import React from 'react';

export default function ProfileDetails({ profile }) {
  if (!profile) {
    return <div>Chargement...</div>;
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center space-x-4'>
        <img
          src={profile.avatarUrl}
          alt={`Avatar de ${profile.name}`}
          className='w-24 h-24 rounded-full object-cover'
        />
        <div>
          <h2 className='text-xl font-semibold'>{profile.name}</h2>
          <p className='text-gray-600 dark:text-gray-400'>{profile.email}</p>
        </div>
      </div>
      {profile.bio && (
        <p className='text-gray-700 dark:text-gray-300'>{profile.bio}</p>
      )}
    </div>
  );
}
