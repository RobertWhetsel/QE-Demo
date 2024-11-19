// volunteerDashboard.js

document.addEventListener('DOMContentLoaded', function() {
  const iframe = document.getElementById('content-frame');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');

  function navigateTo(url) {
      iframe.src = url;
  }

  function openNav() {
      document.getElementById("sidebar").style.width = "250px";
  }

  function closeNav() {
      document.getElementById("sidebar").style.width = "0";
  }

  function logout() {
      sessionStorage.clear();
      window.location.href = "index.html";
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

  // Setup iframe protection
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
              iframeDoc.body.appendChild(script);
          } catch (e) {
              console.error("Cannot access iframe content. It might be cross-origin.");
          }
      };
  }

  // Listen for messages from the iframe
  window.addEventListener('message', function(event) {
      if (event.source !== iframe.contentWindow) return;
      if (event.data.type === 'navigation') {
          navigateTo(event.data.url);
      } else if (event.data.type === 'loadSurvey') {
          navigateTo(`survey.html?id=${event.data.surveyId}`);
      } else if (event.data.type === 'surveyCompleted') {
          alert(`Survey ${event.data.surveyId} completed!`);
          navigateTo('availableSurveys.html');
      }
  });

  // Expose necessary functions to global scope
  window.openNav = openNav;
  window.closeNav = closeNav;
  window.logout = logout;

  // Setup when the page loads
  setupIframeProtection();
});
