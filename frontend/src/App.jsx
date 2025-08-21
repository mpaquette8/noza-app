import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Profile from './pages/Profile';

const Home = () => <div className="p-4">Accueil</div>;

export default function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <nav className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/profile" className="hover:underline">Profil</Link>
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded bg-gray-200 dark:bg-gray-700"
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}
