import { useAuth } from '@/context/AuthContext';
import { Navigate, Route } from 'react-router-dom';
import { protectedRoutes } from './resources';

const ProtectedRoutes = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return [<Route key="redirect" path="*" element={<Navigate to="/login" replace />} />];
  }

  return protectedRoutes.map((route) => (
    <Route
      key={route.path}
      path={route.path}
      element={route.element}
    />
  ));
};

export default ProtectedRoutes;
