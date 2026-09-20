import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext.jsx';
import { endpoints } from '../../api/endpoints.js';

// Shared sign-out behaviour for the sidebar and the header user menu.
export default function useSignOut() {
  const navigate = useNavigate();
  const { clearSession } = useSession();

  return async () => {
    try {
      await endpoints.logout();
    } catch {
      // Clear local state and go to /login even if the request fails.
    }
    clearSession();
    navigate('/login', { replace: true });
  };
}
