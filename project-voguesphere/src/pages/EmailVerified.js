import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmailVerifiedSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Email Verified!</h1>
      <p className="text-lg text-gray-700 mb-6">
        Your email has been successfully verified. You can now log in to your account.
      </p>

      <button
        onClick={() => navigate("/")}
        className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded hover:from-pink-600 hover:to-purple-600 transition font-semibold"
      >
        Go to Home
      </button>
    </div>
  );
}