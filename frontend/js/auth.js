/**
 * Authentication Helper Script
 * Handles Registration, Login, Logout, and Route Guards
 */

// Helper to get cookies by name
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Check if user is authenticated (using local storage token fallback or cookie check)
const isAuthenticated = () => {
  const token = localStorage.getItem('token') || getCookie('token');
  return token && token !== 'none';
};

// Guard route: If already logged in, redirect to dashboard
const guardGuestRoute = () => {
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
  }
};

// Guard route: If not logged in, redirect to login
const guardAuthRoute = () => {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
  }
};

// Handle logout
const logoutUser = async () => {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Clear client-side cache
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to landing
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout failed:', error);
    // Force redirect on error
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
};

// Setup theme switcher state on page load
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  const body = document.body;
  
  if (savedTheme === 'light') {
    body.classList.add('light-mode');
  }
  
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      body.classList.toggle('light-mode');
      const currentTheme = body.classList.contains('light-mode') ? 'light' : 'dark';
      localStorage.setItem('theme', currentTheme);
      // Toggle button text/icon
      themeBtn.innerText = currentTheme === 'light' ? '🌙' : '☀️';
    });
    themeBtn.innerText = body.classList.contains('light-mode') ? '🌙' : '☀️';
  }
};

document.addEventListener('DOMContentLoaded', initTheme);
