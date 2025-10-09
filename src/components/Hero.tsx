"use client";

export default function Hero() {
  return (
    <section className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Discover, Collect & Trade
            <br />
            <span className="text-teal-500">Extraordinary NFTs</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            The world&apos;s largest digital marketplace for crypto collectibles
            and non-fungible tokens. Join millions of users worldwide.
          </p>

          <div className="flex justify-center space-x-4 mb-16">
            <button className="bg-teal-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-teal-600 transition-colors">
              Explore Now
            </button>
            <button className="bg-white text-gray-700 border border-gray-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Watch Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
