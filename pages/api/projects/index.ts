import { NextApiRequest, NextApiResponse } from 'next'
import { clientDataService } from '@/utils/clientDataService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET - Fetch all projects
  if (req.method === 'GET') {
    try {
      // Use clientDataService directly
      const projects = await clientDataService.getAllProjects();

      res.status(200).json(projects)
    } catch (error) {
      console.error('Error fetching projects:', error)
      res.status(500).json({ error: 'Failed to fetch projects' })
    }
  }
  // POST - Create a new project
  else if (req.method === 'POST') {
    try {
      // Admin-only: ensure caller is a Site Collection Admin
      const isAdmin = await clientDataService.isCurrentUserAdmin();
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const projectData = req.body;
      const newProject = await clientDataService.createProject(projectData);
      res.status(201).json(newProject)
    } catch (error) {
      console.error('Error creating project:', error)
      res.status(500).json({ error: 'Failed to create project' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}