import { NextApiRequest, NextApiResponse } from 'next'
import { clientDataService } from '@/utils/clientDataService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid category ID' })
  }

  // GET - Fetch a single category
  if (req.method === 'GET') {
    try {
      // Use clientDataService directly
      const category = await clientDataService.getCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' })
      }
      
      res.status(200).json(category)
    } catch (error) {
      console.error('Error fetching category:', error)
      res.status(500).json({ error: 'Failed to fetch category' })
    }
  }
  // PUT - Update a category
  else if (req.method === 'PUT') {
    try {
      // Admin-only: ensure caller is a Site Collection Admin
      const isAdmin = await clientDataService.isCurrentUserAdmin();
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { name, color, icon } = req.body

      if (!name || !color || !icon) {
        return res.status(400).json({ error: 'Name, color, and icon are required' })
      }

      // Use clientDataService directly
      await clientDataService.updateCategory(id, { name, color, icon });
      
      // Fetch the updated category to return
      const updatedCategory = await clientDataService.getCategoryById(id);
      
      res.status(200).json(updatedCategory)
    } catch (error) {
      console.error('Error updating category:', error)
      res.status(500).json({ error: 'Failed to update category' })
    }
  }
  // DELETE - Delete a category
  else if (req.method === 'DELETE') {
    try {
      // Admin-only: ensure caller is a Site Collection Admin
      const isAdmin = await clientDataService.isCurrentUserAdmin();
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await clientDataService.deleteCategory(id);
      
      res.status(204).end()
    } catch (error) {
      console.error('Error deleting category:', error)
      res.status(500).json({ error: 'Failed to delete category' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}