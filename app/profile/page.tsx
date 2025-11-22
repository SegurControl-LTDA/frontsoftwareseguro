'use client';

import { useState, FormEvent, useEffect } from 'react';

interface UserProfile {
  name: string;
  email: string;
}

export default function ProfilePage() {
  // State for user profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State for messages
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    // Fetch user profile on component mount
    const fetchProfile = async () => {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
      } else {
        // Handle error, e.g., redirect to login
        window.location.href = '/';
      }
    };
    fetchProfile();
  }, []);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    const response = await fetch('/api/profile/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const data = await response.json();
    setProfileMessage(response.ok ? data.message : data.error);
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Las contraseñas nuevas no coinciden.');
      return;
    }
    const response = await fetch('/api/profile/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json();
    setPasswordMessage(response.ok ? data.message : data.error);
    if (response.ok) {
      // Optionally clear fields or redirect
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 py-10">
      <div className="w-full max-w-xl p-8 space-y-8 bg-white rounded-lg shadow-md">
        
        {/* Profile Update Form */}
        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900">Actualizar Perfil</h2>
          <form onSubmit={handleProfileUpdate} className="mt-6 space-y-6">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">Nombre</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded-md" />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo electrónico</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded-md" />
            </div>
            <button type="submit" className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md">Actualizar Perfil</button>
            {profileMessage && <p className="mt-2 text-sm text-center text-green-600">{profileMessage}</p>}
          </form>
        </div>

        <hr />

        {/* Password Change Form */}
        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900">Cambiar Contraseña</h2>
          <form onSubmit={handlePasswordChange} className="mt-6 space-y-6">
            <div>
              <label htmlFor="currentPassword">Contraseña Actual</label>
              <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded-md" required />
            </div>
            <div>
              <label htmlFor="newPassword">Nueva Contraseña</label>
              <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded-md" required />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded-md" required />
            </div>
            <button type="submit" className="w-full px-4 py-2 font-medium text-white bg-red-600 rounded-md">Cambiar Contraseña</button>
            {passwordMessage && <p className="mt-2 text-sm text-center text-red-600">{passwordMessage}</p>}
          </form>
        </div>

      </div>
    </div>
  );
}
