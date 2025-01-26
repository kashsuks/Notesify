// filepath: /c:/Users/SeanN/OneDrive/Desktop/Hackathon/Notesify/lib/auth0.js
import { initAuth0 } from '@auth0/nextjs-auth0';

const auth0 = initAuth0({
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  baseURL: process.env.AUTH0_BASE_URL,
  secret: process.env.AUTH0_SECRET,
  clockTolerance: 60,
  httpTimeout: 5000,
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email',
  },
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
  session: {
    rollingDuration: 60 * 60 * 24 * 7, // 7 days
    absoluteDuration: 60 * 60 * 24 * 7 * 4, // 4 weeks
  },
});

export default auth0;