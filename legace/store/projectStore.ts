import { create } from 'zustand';
import { Project, Assignment } from '../lib/types';
import { synchronizeProjectData } from '../lib/utils';
import { useTaskStore } from './taskStore';
import { useTimesheetStore } from './timesheetStore';

type ProjectState = {
  projects: Project[];
  assignments: Assignment[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  updateProject: (id: string, project: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addAssignment: (assignment: Omit<Assignment, 'id'>) => Promise<Assignment>;
  updateAssignment: (id: string, assignment: Partial<Assignment>) => Promise<Assignment>;
  deleteAssignment: (id: string) => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
  getAssignmentsByProject: (projectId: string) => Assignment[];
  getAssignmentsByEmployee: (employeeId: string) => Assignment[];
  synchronizeWithTasks: () => Promise<void>;
  updateProjectProgress: (projectId: string, progress: number) => Promise<void>;
};

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Website Redesign',
    description: 'Redesign the company website with modern UI/UX',
    startDate: '2025-01-15',
    endDate: '2025-03-31',
    status: 'in-progress',
    budget: {
      hours: 320,
      cost: 20000,
    },
    actual: {
      hours: 175,
      cost: 9800,
    },
  },
  {
    id: '2',
    name: 'Mobile App Development',
    description: 'Develop a mobile app for iOS and Android',
    startDate: '2025-02-01',
    endDate: '2025-06-30',
    status: 'in-progress',
    budget: {
      hours: 640,
      cost: 40000,
    },
    actual: {
      hours: 210,
      cost: 13500,
    },
  },
  {
    id: '3',
    name: 'CRM Integration',
    description: 'Integrate with third-party CRM software',
    startDate: '2025-03-01',
    endDate: '2025-04-15',
    status: 'planned',
    budget: {
      hours: 160,
      cost: 12000,
    },
    actual: {
      hours: 0,
      cost: 0,
    },
  },
];

const mockAssignments: Assignment[] = [
  {
    id: '1',
    projectId: '1',
    employeeId: '1',
    role: 'Frontend Developer',
    startDate: '2025-01-15',
    endDate: '2025-03-31',
    hoursPerDay: 6,
    totalHours: 120,
  },
  {
    id: '2',
    projectId: '1',
    employeeId: '2',
    role: 'UX Designer',
    startDate: '2025-01-15',
    endDate: '2025-02-15',
    hoursPerDay: 4,
    totalHours: 80,
  },
  {
    id: '3',
    projectId: '2',
    employeeId: '1',
    role: 'Frontend Developer',
    startDate: '2025-02-01',
    endDate: '2025-06-30',
    hoursPerDay: 4,
    totalHours: 160,
  },
  {
    id: '4',
    projectId: '2',
    employeeId: '3',
    role: 'Backend Developer',
    startDate: '2025-02-01',
    endDate: '2025-06-30',
    hoursPerDay: 6,
    totalHours: 240,
  },
];

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  assignments: [],
  isLoading: false,
  error: null,
  
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ projects: mockProjects, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch projects', isLoading: false });
    }
  },
  
  fetchAssignments: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ assignments: mockAssignments, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch assignments', isLoading: false });
    }
  },
  
  addProject: async (project) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newProject: Project = {
        ...project,
        id: (get().projects.length + 1).toString(),
      };
      
      set(state => ({ 
        projects: [...state.projects, newProject], 
        isLoading: false 
      }));
      
      return newProject;
    } catch (error) {
      set({ error: 'Failed to add project', isLoading: false });
      throw error;
    }
  },
  
  updateProject: async (id, projectData) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedProjects = get().projects.map(project => 
        project.id === id ? { ...project, ...projectData } : project
      );
      
      set({ projects: updatedProjects, isLoading: false });
      
      const updatedProject = updatedProjects.find(project => project.id === id);
      if (!updatedProject) {
        throw new Error('Project not found');
      }
      
      return updatedProject;
    } catch (error) {
      set({ error: 'Failed to update project', isLoading: false });
      throw error;
    }
  },
  
  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedProjects = get().projects.filter(project => project.id !== id);
      const updatedAssignments = get().assignments.filter(assignment => assignment.projectId !== id);
      
      set({ 
        projects: updatedProjects, 
        assignments: updatedAssignments,
        isLoading: false 
      });
    } catch (error) {
      set({ error: 'Failed to delete project', isLoading: false });
      throw error;
    }
  },
  
  addAssignment: async (assignment) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newAssignment: Assignment = {
        ...assignment,
        id: (get().assignments.length + 1).toString(),
      };
      
      set(state => ({ 
        assignments: [...state.assignments, newAssignment], 
        isLoading: false 
      }));
      
      return newAssignment;
    } catch (error) {
      set({ error: 'Failed to add assignment', isLoading: false });
      throw error;
    }
  },
  
  updateAssignment: async (id, assignmentData) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedAssignments = get().assignments.map(assignment => 
        assignment.id === id ? { ...assignment, ...assignmentData } : assignment
      );
      
      set({ assignments: updatedAssignments, isLoading: false });
      
      const updatedAssignment = updatedAssignments.find(assignment => assignment.id === id);
      if (!updatedAssignment) {
        throw new Error('Assignment not found');
      }
      
      return updatedAssignment;
    } catch (error) {
      set({ error: 'Failed to update assignment', isLoading: false });
      throw error;
    }
  },
  
  deleteAssignment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedAssignments = get().assignments.filter(assignment => assignment.id !== id);
      set({ assignments: updatedAssignments, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to delete assignment', isLoading: false });
      throw error;
    }
  },
  
  getProjectById: (id) => {
    return get().projects.find(project => project.id === id);
  },
  
  getAssignmentsByProject: (projectId) => {
    return get().assignments.filter(assignment => assignment.projectId === projectId);
  },
  
  getAssignmentsByEmployee: (employeeId) => {
    return get().assignments.filter(assignment => assignment.employeeId === employeeId);
  },

  synchronizeWithTasks: async () => {
    const tasks = useTaskStore.getState().tasks;
    const timeEntries = useTimesheetStore.getState().entries;
    
    const updatedProjects = get().projects.map(project => 
      synchronizeProjectData(project, tasks, timeEntries)
    );
    
    set({ projects: updatedProjects });
  },
  
  updateProjectProgress: async (projectId: string, progress: number) => {
    const updatedProjects = get().projects.map(project =>
      project.id === projectId
        ? { ...project, progress }
        : project
    );
    
    set({ projects: updatedProjects });
  },
}));