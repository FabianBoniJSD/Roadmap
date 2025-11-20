import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { hasAdminAccess } from '@/utils/auth';

// Define a generic type parameter for the component props
export default function withAdminAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  // Use the same generic type for the returned component
  return function WithAdminAuth(props: P) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const dbg = () => (typeof window !== 'undefined' && ((window.localStorage && localStorage.getItem('debugAuth')) || /([?&])debug=auth(?![\w-])/i.test(window.location.search)));
    
    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Check service account admin access directly
          const hasAccess = await hasAdminAccess();
          if (dbg()) console.log('[withAdminAuth] Service account admin check =', hasAccess);
          
          if (!hasAccess) {
            if (dbg()) console.log('[withAdminAuth] Service account has no admin access');
            // Show error page instead of redirect (no user login possible)
            setIsLoading(false);
            // Could redirect to an error page or show inline error
            router.push('/admin/login?returnUrl=' + encodeURIComponent(router.asPath));
            return;
          }
          
          setIsLoading(false);
        } catch (error) {
          console.error('Auth check error:', error);
          if (dbg()) console.log('[withAdminAuth] exception during auth check');
          setIsLoading(false);
        }
      };
      
      checkAuth();
    }, [router]);
    
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}