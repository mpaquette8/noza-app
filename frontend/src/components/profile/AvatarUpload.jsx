import React, { useRef, useState } from 'react';

export default function AvatarUpload({ avatarUrl }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(avatarUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);
    setPreview(URL.createObjectURL(file));

    await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    });
  };

  return (
    <div className='relative'>
      <img
        src={preview || 'https://placehold.co/80'}
        alt='avatar'
        className='w-20 h-20 rounded-full object-cover'
      />
      <button
        className='absolute bottom-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded'
        onClick={() => inputRef.current.click()}
      >
        Changer
      </button>
      <input
        type='file'
        ref={inputRef}
        className='hidden'
        onChange={handleFileChange}
        accept='image/*'
      />
    </div>
  );
}
