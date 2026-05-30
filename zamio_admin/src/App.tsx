import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@zamio/ui';

import router from './lib/router';
import { AuthProvider } from './lib/auth';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}