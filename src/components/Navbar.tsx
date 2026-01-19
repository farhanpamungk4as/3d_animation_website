'use client';

import React, { useState } from 'react';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className = '' }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className="mx-auto px-6 py-4">
        <div className="flex items-center justify-between bg-gray-100 rounded-full px-8 py-3 shadow-sm">
          {/* Left Navigation */}
          <div className="flex items-center space-x-8">
            <a 
              href="#our-story" 
              className="text-gray-800 hover:text-red-600 transition-colors font-medium text-sm"
            >
              Our Story
            </a>
            <a 
              href="#produk" 
              className="text-gray-800 hover:text-red-600 transition-colors font-medium text-sm"
            >
              Produk
            </a>
          </div>

          {/* Center Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <a href="/" className="flex items-center">
              <svg 
                viewBox="0 0 120 40" 
                className="h-8 w-auto"
                fill="none"
              >
                <text
                  x="50%"
                  y="50%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fill="#DC2626"
                  fontSize="32"
                  fontWeight="bold"
                  fontFamily="serif"
                  fontStyle="italic"
                >
                  Lezza
                </text>
                <circle cx="110" cy="12" r="3" fill="#DC2626" />
              </svg>
            </a>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center space-x-8">
            <a 
              href="#blog" 
              className="text-gray-800 hover:text-red-600 transition-colors font-medium text-sm"
            >
              Blog
            </a>
            <a 
              href="#hubungi-kami" 
              className="text-gray-800 hover:text-red-600 transition-colors font-medium text-sm"
            >
              Hubungi Kami
            </a>
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="bg-red-400 hover:bg-red-500 text-white px-6 py-2 rounded-full transition-colors font-medium text-sm flex items-center space-x-2"
            >
              <span>Temukan Kami</span>
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Dropdown (Optional) */}
        {isSearchOpen && (
          <div className="mt-4 bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
            <input
              type="text"
              placeholder="Cari produk atau lokasi..."
              className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400"
              autoFocus
            />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;