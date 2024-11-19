// researchDashboard.js

document.addEventListener('DOMContentLoaded', function() {
  const iframe = document.getElementById('content-frame');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');

  // Function to apply user interface settings
  function applySettings(settings) {
    settings = settings || JSON.parse(sessionStorage.getItem('appSettings')) || {};
    if (settings.mode === "day") {
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#000000";
    } else {
      document.body.style.backgroundColor = "#2c2f33";
      document.body.style.color = "#ffffff";
    }
    document.body.style.fontFamily = settings.font || 'Arial';
    // Apply other settings as needed
  }

  // Function to navigate to a specified URL within the iframe
  function navigateTo(url) {
    iframe.src = url;
  }

  // Function to open the sidebar navigation
  function openNav() {
    document.getElementById("sidebar").style.width = "250px";
  }

  // Function to close the sidebar navigation
  function closeNav() {
    document.getElementById("sidebar").style.width = "0";
  }

  // Function to log out the user
  function logout() {
    sessionStorage.clear();
    window.location.href = "index.html";
  }

  // Function to exit the application and clear all data
  function exitApplication() {
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (let name of names) caches.delete(name);
      });
    }
    window.location.href = "index.html";
    setTimeout(function() {
      window.close();
    }, 1000);
  }

  // Function to set up protection for the iframe to handle navigation safely
  function setupIframeProtection() {
    iframe.onload = function() {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const script = iframeDoc.createElement('script');
        script.textContent = `
          document.body.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
              e.preventDefault();
              const href = e.target.getAttribute('href');
              if (href && !href.startsWith('javascript:')) {
                window.parent.postMessage({type: 'navigation', url: href}, '*');
              }
              return false;
            }
          });
        `;
        iframeDoc.appendChild(script);
      } catch (e) {
        console.error("Cannot access iframe content. It might be cross-origin.");
      }
    };
  }

  // Handle sidebar navigation
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const url = this.getAttribute('data-content');
      if (url) {
        navigateTo(url);
        closeNav();
      }
    });
  });

  // Listen for messages from the iframe
  window.addEventListener('message', function(event) {
    if (event.source !== iframe.contentWindow) return;
    if (event.data.type === 'applySettings') {
      applySettings(event.data.settings);
    } else if (event.data.type === 'navigation') {
      navigateTo(event.data.url);
    } else if (event.data.type === 'logout') {
      logout();
    } else if (event.data.type === 'deleteAccount') {
      // Handle account deletion (if applicable for researchers)
    }
  });

  // Check user role - Fixed to match the role name from index.js
  const userSession = JSON.parse(sessionStorage.getItem('userSession'));
  if (!userSession || !userSession.isAuthenticated || userSession.role !== 'Research') {
    alert('You do not have permission to access this page.');
    window.location.href = 'index.html';
    return;
  }

  // Expose necessary functions to global scope
  window.openNav = openNav;
  window.closeNav = closeNav;
  window.logout = logout;
  window.exitApplication = exitApplication;

  // Apply settings and setup when the page loads
  applySettings();
  setupIframeProtection();
});
