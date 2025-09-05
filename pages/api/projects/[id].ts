import { NextApiRequest, NextApiResponse } from 'next'
import { clientDataService } from '@/utils/clientDataService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' })
  }
  
  // GET - Fetch a single project
  if (req.method === 'GET') {
    try {
      // Use clientDataService directly
      const project = await clientDataService.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' })
      }
      
      res.status(200).json(project)
    } catch (error) {
      console.error('Error fetching project:', error)
      res.status(500).json({ error: 'Failed to fetch project' })
    }
  } 
  // PUT - Update a project
  else if (req.method === 'PUT') {
    try {
      // Admin-only: ensure caller is a Site Collection Admin
      const isAdmin = await clientDataService.isCurrentUserAdmin();
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const projectData = req.body;
      await clientDataService.updateProject(id, projectData);
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error updating project:', error)
      res.status(500).json({ error: 'Failed to update project' })
    }
  }
  // DELETE - Delete a project
  else if (req.method === 'DELETE') {
    try {
      // Admin-only: ensure caller is a Site Collection Admin
      const isAdmin = await clientDataService.isCurrentUserAdmin();
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await clientDataService.deleteProject(id);
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting project:', error)
      res.status(500).json({ error: 'Failed to delete project' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}