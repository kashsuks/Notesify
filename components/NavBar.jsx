'use client';

import React from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

const NavBar = () => {
  const { user } = useUser();

  return (
    <div className="login-button-container">
      {!user ? (
        <a href="/api/auth/login" className="login-button">Login</a>
      ) : (
        <a href="/api/auth/logout" className="logout-button">Logout</a>
      )}

      <style jsx>{`
        .login-button-container {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 10;
        }

        .logout-button, .login-button {
          background-color: #007bff;
          color: white;
          padding: 10px 20px;
          text-align: center;
          border-radius: 5px;
          font-size: 16px;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};

export default NavBar;