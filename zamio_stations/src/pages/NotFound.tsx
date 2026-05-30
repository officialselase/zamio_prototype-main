import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Music } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-black" />
      <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-2xl" />

      <div className="relative z-10 w-full max-w-md mx-4 text-center">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center space-x-3 mb-8">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
            <Music className="h-6 w-6" />
          </span>
          <span className="text-2xl font-semibold tracking-tight">Zamio Stations</span>
        </Link>

        {/* 404 Content */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <span className="text-8xl font-bold text-indigo-400">404</span>
          </div>

          <h1 className="text-2xl font-semibold mb-4">Page not found</h1>

          <p className="text-slate-400 mb-8">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you entered the wrong URL.
          </p>

          <div className="space-y-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full rounded-lg bg-indigo-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-400"
            >
              <Home className="mr-2 h-5 w-5" />
              Back to home
            </Link>

            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center w-full rounded-lg border border-white/20 px-4 py-3 text-base font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go back
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Need help?{' '}
            <Link to="/contact" className="text-indigo-400 hover:text-indigo-300">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
