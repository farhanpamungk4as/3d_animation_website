'use client';

import React from 'react';

interface HeroSectionProps {
  className?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ className = '' }) => {
  return (
    <section className={`relative min-h-screen bg-gradient-to-br from-red-900 to-red-700 overflow-hidden ${className}`}>
      {/* Decorative floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating food items - will be replaced with your images */}
        <div className="absolute top-1/4 left-10 w-24 h-24 bg-orange-400/30 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-1/3 left-20 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-orange-500/25 rounded-full blur-2xl animate-float-slow"></div>
      </div>

      <div className="container mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white space-y-6 z-10 relative">
            {/* Tag */}
            <div className="inline-block">
              <span className="px-6 py-2 border-2 border-white/30 rounded-full text-sm font-medium backdrop-blur-sm">
                Ciptakan Keluarga sehat
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Frozen Food Berkualitas,{' '}
              <span className="block mt-2">Kelezatan Tanpa</span>
              <span className="block mt-2">Kompromi</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg text-white/90 max-w-xl leading-relaxed">
              Solusi praktis untuk hidangan lezat keluarga Indonesia dari bahan pilihan, 
              diproses dengan teknologi modern.
            </p>

            {/* Carousel Indicators */}
            <div className="flex items-center space-x-3 pt-4">
              <button className="w-3 h-3 rounded-full bg-white"></button>
              <button className="w-3 h-3 rounded-full bg-white/40 hover:bg-white/60 transition-colors"></button>
              <button className="w-3 h-3 rounded-full bg-white/40 hover:bg-white/60 transition-colors"></button>
              <div className="flex-1 h-1 bg-white/30 rounded-full ml-2">
                <div className="h-full w-1/3 bg-white rounded-full animate-progress"></div>
              </div>
            </div>
          </div>

          {/* Right Content - Image */}
          <div className="relative z-10">
            {/* Main Image Container */}
            <div className="relative">
              {/* Decorative circle background */}
              <div className="absolute -top-10 -right-10 w-96 h-96 bg-red-800/30 rounded-full blur-3xl"></div>
              
              {/* Placeholder for person eating - replace with your image */}
              <div className="relative rounded-3xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1529958030586-3aae4ca485ff?w=600&h=800&fit=crop"
                  alt="Happy person enjoying Lezza frozen food"
                  className="w-full h-[600px] object-cover rounded-3xl"
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent"></div>
              </div>

              {/* Floating food elements - placeholders */}
              <div className="absolute -left-20 top-1/4 w-32 h-32 animate-float">
                <img
                  src="https://images.unsplash.com/photo-1562967914-608f82629710?w=200&h=200&fit=crop"
                  alt="Fried food"
                  className="w-full h-full object-cover rounded-2xl shadow-2xl"
                />
              </div>

              <div className="absolute -left-10 bottom-1/4 w-40 h-40 animate-float-delayed">
                <img
                  src="https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&h=200&fit=crop"
                  alt="Crispy fried food"
                  className="w-full h-full object-cover rounded-2xl shadow-2xl"
                />
              </div>

              {/* Small decorative dots */}
              <div className="absolute top-10 right-10 flex space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-red-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 80C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;