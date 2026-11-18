import React from 'react';

interface StudentAvatarProps {
  name: string;
  photo?: string;
  size?: 'sm' | 'lg';
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  name,
  photo,
  size = 'sm',
}) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const sizeClass =
    size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-9 h-9 text-xs';

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} rounded-full bg-[#0f7a3d] text-white font-semibold inline-flex items-center justify-center shrink-0 select-none`}
    >
      {initial}
    </span>
  );
};
