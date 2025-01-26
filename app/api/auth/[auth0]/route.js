// filepath: /c:/Users/SeanN/OneDrive/Desktop/Hackathon/Notesify/app/api/auth/[auth0]/route.js
import auth0 from '../../../../lib/auth0';

export const GET = auth0.handleAuth();
export const POST = auth0.handleAuth();
export const PUT = auth0.handleAuth();
export const DELETE = auth0.handleAuth();