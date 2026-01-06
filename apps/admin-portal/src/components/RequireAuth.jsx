import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { me } from '../api/authService';
import { Loader2 } from 'lucide-react';

export default function RequireAuth({ children }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Checking session...
        </div>
      </div>
    );
  }

  if (isError || !data?.id) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
