document.addEventListener('DOMContentLoaded', () => {
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');

  forgotPasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;

      // In a real application, you would send a request to your server to handle the password reset
      // For this example, we'll just show a message
      document.getElementById('message').textContent = `Password reset link sent to ${email}`;
  });
});
