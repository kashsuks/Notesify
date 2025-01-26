'use client';

import React, { useState } from 'react';
import {
  Collapse,
  Container,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from 'reactstrap';
import { useUser } from '@auth0/nextjs-auth0/client';

import PageLink from './PageLink';

const NavBar = () => {
  const { user, error, isLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);

  return (
    <div>
      <Navbar color="light" light expand="md">
        <Container>
          <NavbarToggler onClick={toggle} />
          <Collapse isOpen={isOpen} navbar>
            <Nav className="ml-auto" navbar>
              {!user ? (
                <NavItem>
                </NavItem>
              ) : (
                <>
                  <NavItem>
                    <PageLink href="/profile" className="nav-link">Profile</PageLink>
                  </NavItem>
                  <NavItem>
                    <a href="/api/auth/logout" className="nav-link">Logout</a>
                  </NavItem>
                </>
              )}
            </Nav>
          </Collapse>
        </Container>
      </Navbar>
      {!user && (
        <div className="login-button-container">
          <a href="/api/auth/login" className="login-button">Login</a>
        </div>
      )}
    </div>
  );
};

export default NavBar;