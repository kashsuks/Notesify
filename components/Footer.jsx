import React from 'react';

const Footer = () => (
  <footer className="bg-light p-3 text-center" data-testid="footer">
    <div className="logo" data-testid="footer-logo" />
    <p data-testid="footer-text">
      Notesify <a href="https://github.com/kashsuks/Notesify">Notesify</a>
    </p>
  </footer>
);

export default Footer;