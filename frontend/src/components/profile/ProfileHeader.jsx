import React from 'react';
import AvatarUpload from './AvatarUpload';

export default function ProfileHeader({ profile }) {
  if (!profile) {
    return <div>Chargement...</div>;
  }

  return (
    <div className='flex items-center space-x-4'>
      <AvatarUpload avatarUrl={profile.avatarUrl} />
      <div>
        <h1 className='text-2xl font-bold'>{profile.name}</h1>
        <p className='text-gray-600 dark:text-gray-400'>{profile.email}</p>
      </div>
    </div>
  );
}
