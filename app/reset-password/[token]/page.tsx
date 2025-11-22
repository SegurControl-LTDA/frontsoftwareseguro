'use client';

import { useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();

    if (response.ok) {
      setMessage(data.message);
      // Redirect to login after a delay
      setTimeout(() => router.push('/'), 3000);
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Establecer Nueva Contraseña</h1>
        {message ? (
          <p className="text-center text-green-600">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="newPassword">Nueva Contraseña</label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>
            <button type="submit" className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md">Restablecer Contraseña</button>
            {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
