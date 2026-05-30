import React from 'react';
import { ThemeProvider } from '@zamio/ui';
import Router from './lib/router';
import { AuthProvider } from './lib/auth';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ThemeProvider>
  );
}