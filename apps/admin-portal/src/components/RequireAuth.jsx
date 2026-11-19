import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { me } from '../api/authService';

export default function RequireAuth({ children }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: false,
  });

  if (isLoading) return null;

  if (isError || !data?.id) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
