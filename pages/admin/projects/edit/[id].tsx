// In pages/admin/projects/edit/[id].tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProjectForm from '../../../../components/ProjectForm';
import withAdminAuth from '@/components/withAdminAuth';
import { clientDataService } from '@/utils/clientDataService';
import { Project, Category, TeamMember } from '@/types';


const EditProjectPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (id && typeof id === 'string') {
        setLoading(true);
        try {
          const [projectData, categoriesData, teamMembersData] = await Promise.all([
            clientDataService.getProjectById(id),
            clientDataService.getAllCategories(),
            clientDataService.getTeamMembersForProject(id)
          ]);

          setProject(projectData);
          setCategories(categoriesData);
          setTeamMembers(teamMembersData);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [id]);

  const handleCancel = () => {
    router.push('/admin');
  };

  const handleSubmit = async (updatedProject: Project) => {
    try {
      // Create a clean object with only primitive values for SharePoint
      const projectToSave = {
        id: updatedProject.id,
        title: updatedProject.title || '',
        category: updatedProject.category || '',
        startQuarter: updatedProject.startQuarter || '',
        endQuarter: updatedProject.endQuarter || '',
        description: updatedProject.description || '',
        status: updatedProject.status || 'planned',
        projektleitung: updatedProject.projektleitung || '',
        bisher: updatedProject.bisher || '',
        zukunft: updatedProject.zukunft || '',
        fortschritt: typeof updatedProject.fortschritt === 'number' ? updatedProject.fortschritt : 0,
        geplante_umsetzung: updatedProject.geplante_umsetzung || '',
        budget: updatedProject.budget || '',
        startDate: '',
        endDate: '',
            projektphase: updatedProject.projektphase || '',
            naechster_meilenstein: updatedProject.naechster_meilenstein || '',
        // Make sure ProjectFields is an array to match the Project type
        ProjectFields: [] as string[]
      };

      // Format date fields correctly for SharePoint
      if (updatedProject.startDate) {
        try {
          const startDate = new Date(updatedProject.startDate);
          if (!isNaN(startDate.getTime())) {
            projectToSave.startDate = startDate.toISOString().split('T')[0] + 'T00:00:00Z';
          }
        } catch (e) {
          console.error('Fehler beim Formatieren des Startdatums:', e);
        }
      }

      if (updatedProject.endDate) {
        try {
          const endDate = new Date(updatedProject.endDate);
          if (!isNaN(endDate.getTime())) {
            projectToSave.endDate = endDate.toISOString().split('T')[0] + 'T00:00:00Z';
          }
        } catch (e) {
          console.error('Fehler beim Formatieren des Enddatums:', e);
        }
      }

      // Handle ProjectFields - ensure it's an array of strings
      if (updatedProject.ProjectFields) {
        if (Array.isArray(updatedProject.ProjectFields)) {
          // Keep the array as is, but ensure all elements are strings
          projectToSave.ProjectFields = updatedProject.ProjectFields.map(field => String(field));
        } else if (typeof updatedProject.ProjectFields === 'string') {
          // Split by semicolons or commas, but only if it contains those characters
          const fieldString = updatedProject.ProjectFields as string;
          if (fieldString.includes(';') || fieldString.includes(',')) {
            projectToSave.ProjectFields = fieldString
              .split(/[;,]/)
              .map(item => item.trim())
              .filter(Boolean);
          } else {
            // If it's a single value without delimiters, treat it as a single field
            projectToSave.ProjectFields = [fieldString];
          }
        } else {
          projectToSave.ProjectFields = [String(updatedProject.ProjectFields)];
        }
      }

      // Extract team members from updatedProject
      const teamMembersToSave = updatedProject.teamMembers
        ? (Array.isArray(updatedProject.teamMembers)
          ? updatedProject.teamMembers.map(member =>
            typeof member === 'string'
              ? { name: member, role: 'Teammitglied' }
              : { name: member.name, role: member.role || 'Teammitglied' }
          )
          : [])
        : [];

      console.log('Projekt vor dem Speichern:', projectToSave);
      console.log('Team members to save:', teamMembersToSave);

      // Save the basic project data
      const savedProject = await clientDataService.updateProject(projectToSave.id, projectToSave as Partial<Project>);
      console.log('Gespeichertes Projekt:', savedProject);

      // Process team members
      if (teamMembersToSave.length > 0) {
        try {
          // Delete existing team members
          await clientDataService.deleteTeamMembersForProject(savedProject.id);
          console.log('Existing team members deleted');

          // Add new team members
          for (const member of teamMembersToSave) {
            const memberName = member.name;
            const memberRole = member.role || 'Teammitglied';

            if (memberName) {
              console.log(`Creating team member: ${memberName} with role ${memberRole}`);
              await clientDataService.createTeamMember({
                name: memberName,
                role: memberRole,
                projectId: savedProject.id
              });
            }
          }
          console.log('New team members created');
        } catch (error) {
          console.error('Error updating team members:', error);
        }
      } else {
        // If no team members provided, still delete any existing ones
        try {
          await clientDataService.deleteTeamMembersForProject(savedProject.id);
          console.log('Existing team members deleted (no new members to add)');
        } catch (error) {
          console.error('Error deleting team members:', error);
        }
      }

      // Process links if they exist
      if (updatedProject.links && Array.isArray(updatedProject.links) && updatedProject.links.length > 0) {
        try {
          // Delete existing links
          await clientDataService.deleteProjectLinks(savedProject.id);
          console.log('Existing project links deleted');

          // Add new links
          for (const link of updatedProject.links) {
            if (typeof link === 'object' && link.title && link.url) {
              console.log(`Creating link: ${link.title} with URL ${link.url}`);

              // Ensure projectId is set correctly as a string
              await clientDataService.createProjectLink({
                title: link.title,
                url: link.url,
                projectId: savedProject.id
              });
            }
          }
          console.log('New project links created');
        } catch (error) {
          console.error('Error updating links:', error);
          // Continue with save process even if links fail
        }
      }

      // Navigate back to admin page
      router.push('/admin');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Fehler beim Speichern des Projekts: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 py-4 px-6 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Projekt bearbeiten</h1>
          <Link href="/admin">
            <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">
              Zurück zum Dashboard
            </button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-800 rounded-lg shadow p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-xl">Loading...</div>
            </div>
          ) : id && typeof id === 'string' && project ? (
            <ProjectForm
              initialProject={{
                ...project,
                teamMembers: teamMembers.map(member => ({
                  name: member.name,
                  role: member.role,
                  projectId: member.projectId,
                  id: member.id
                }))
              }}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          ) : (
            <div className="text-center py-8">
              <p>Projekt-ID nicht gefunden. Bitte versuchen Sie es erneut.</p>
              <button
                onClick={() => router.push('/admin')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Zurück zum Dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default withAdminAuth(EditProjectPage);