import { useEffect, useState } from 'react';
import { checkCurrentUserIsAdmin, getCurrentUser } from '@/utils/adminCheck';

/**
 * Test component to verify client-side admin check functionality.
 * This component demonstrates how to use the browser-based admin check
 * which uses the actual logged-in user's credentials (NTLM/Kerberos).
 */
interface UserInfo {
    id: number;
    loginName: string;
    title: string;
    email: string;
    isSiteAdmin: boolean;
}

export default function AdminTestPage() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkAdminStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAdminStatus = async () => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('=== Starting Admin Check Test ===');
            
            // Get current user info
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            
            if (!currentUser) {
                setError('Failed to get current user. Make sure you are authenticated.');
                setLoading(false);
                return;
            }
            
            console.log('Current user:', currentUser);
            
            // Check admin status
            const adminStatus = await checkCurrentUserIsAdmin();
            setIsAdmin(adminStatus);
            
            console.log('Admin status:', adminStatus);
            console.log('=== Admin Check Test Complete ===');
            
        } catch (err) {
            console.error('Error during admin check:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            padding: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                padding: '3rem',
                maxWidth: '800px',
                width: '100%'
            }}>
                <h1 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '2rem' }}>
                    Admin Check Test
                </h1>
                <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
                    This page tests the client-side admin check which uses your browser credentials
                    to verify admin status in SharePoint.
                </p>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                        <div style={{
                            border: '4px solid #f3f3f3',
                            borderTop: '4px solid #667eea',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1rem'
                        }}></div>
                        <p>Checking admin status...</p>
                        <style jsx>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>
                )}

                {error && (
                    <div style={{
                        background: '#fee',
                        border: '2px solid #fcc',
                        borderRadius: '8px',
                        padding: '1.5rem',
                        margin: '2rem 0'
                    }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#c33' }}>Error</h3>
                        <p style={{ margin: '0', color: '#c33' }}>{error}</p>
                    </div>
                )}

                {!loading && !error && user && (
                    <>
                        <div style={{
                            margin: '2rem 0',
                            padding: '1.5rem',
                            background: '#f9f9f9',
                            borderRadius: '8px'
                        }}>
                            <h2 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.5rem' }}>
                                Current User
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #e0e0e0' }}>
                                    <strong style={{ color: '#555' }}>Name:</strong> {user.title}
                                </div>
                                <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #e0e0e0' }}>
                                    <strong style={{ color: '#555' }}>Login:</strong> {user.loginName}
                                </div>
                                <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #e0e0e0' }}>
                                    <strong style={{ color: '#555' }}>Email:</strong> {user.email}
                                </div>
                                <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #e0e0e0' }}>
                                    <strong style={{ color: '#555' }}>User ID:</strong> {user.id}
                                </div>
                                <div style={{ padding: '0.5rem 0' }}>
                                    <strong style={{ color: '#555' }}>Site Admin:</strong>{' '}
                                    <span style={{ 
                                        color: user.isSiteAdmin ? '#28a745' : '#dc3545', 
                                        fontWeight: 'bold' 
                                    }}>
                                        {user.isSiteAdmin ? '✓ Yes' : '✗ No'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            margin: '2rem 0',
                            padding: '1.5rem',
                            background: '#f9f9f9',
                            borderRadius: '8px'
                        }}>
                            <h2 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.5rem' }}>
                                Admin Status
                            </h2>
                            <div style={{
                                padding: '2rem',
                                borderRadius: '8px',
                                textAlign: 'center',
                                background: isAdmin ? '#d4edda' : '#f8d7da',
                                border: `2px solid ${isAdmin ? '#28a745' : '#dc3545'}`
                            }}>
                                {isAdmin ? (
                                    <>
                                        <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#28a745' }}>✓</div>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#155724' }}>
                                            You are an Admin
                                        </h3>
                                        <p style={{ margin: '0', fontSize: '1rem', color: '#155724' }}>
                                            You have administrative access to the roadmap application.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#dc3545' }}>✗</div>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#721c24' }}>
                                            You are not an Admin
                                        </h3>
                                        <p style={{ margin: '0', fontSize: '1rem', color: '#721c24' }}>
                                            You do not have administrative access to the roadmap application.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ margin: '2rem 0', textAlign: 'center' }}>
                            <button 
                                onClick={checkAdminStatus} 
                                style={{
                                    background: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 2rem',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#5568d3'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#667eea'}
                            >
                                Re-check Admin Status
                            </button>
                        </div>

                        <div style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '6px',
                            color: '#856404',
                            fontSize: '0.9rem'
                        }}>
                            <strong>Note:</strong> Check the browser console for detailed logs of the admin check process.
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
