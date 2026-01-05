export async function authenticateWithSharePoint(username: string, password: string) {
  console.warn('[authService] Legacy RoadmapUsers list authentication is deprecated.');
  return {
    success: false,
    message:
      'Legacy authentication via RoadmapUsers list has been removed. Use current admin auth.',
  };
}
