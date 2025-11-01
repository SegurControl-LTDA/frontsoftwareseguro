'use client';

export default function ProfilePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 text-center bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido!</h1>
        <p className="text-gray-700">Has iniciado sesión correctamente.</p>
        <p className="text-gray-600">Este es tu perfil.</p>
      </div>
    </div>
  );
}
