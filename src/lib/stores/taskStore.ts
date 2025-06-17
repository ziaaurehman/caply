import { create } from 'zustand';
import { Task } from '../types';

type TaskState = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<Task>;
  updateTask: (id: string, task: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  getTasksByProject: (projectId: string) => Task[];
};

// Mock data for demo purposes
const mockTasks: Task[] = [
  {
    id: '1',
    projectId: '1',
    title: 'Project Planning',
    description: 'Initial project planning and requirements gathering',
    status: 'completed',
    priority: 'high',
    assignedTo: ['1', '4'],
    estimatedHours: 40,
    actualHours: 36,
    dueDate: '2025-01-22',
    progress: 100,
  },
  {
    id: '2',
    projectId: '1',
    title: 'Design Phase',
    description: 'UI/UX design and prototyping',
    status: 'completed',
    priority: 'medium',
    assignedTo: ['2'],
    estimatedHours: 80,
    actualHours: 75,
    dueDate: '2025-02-15',
    progress: 100,
  },
  {
    id: '3',
    projectId: '1',
    title: 'Design Review',
    description: 'Design review milestone',
    status: 'completed',
    priority: 'high',
    assignedTo: ['4'],
    estimatedHours: 4,
    actualHours: 4,
    dueDate: '2025-02-16',
    progress: 100,
    milestone: true,
  },
  {
    id: '4',
    projectId: '1',
    title: 'Frontend Development',
    description: 'Implement frontend components and features',
    status: 'in-progress',
    priority: 'high',
    assignedTo: ['1'],
    estimatedHours: 120,
    actualHours: 80,
    dueDate: '2025-03-15',
    progress: 65,
  },
  {
    id: '5',
    projectId: '1',
    title: 'Backend Development',
    description: 'Implement backend services and APIs',
    status: 'in-progress',
    priority: 'high',
    assignedTo: ['3'],
    estimatedHours: 100,
    actualHours: 60,
    dueDate: '2025-03-15',
    progress: 60,
  },
  {
    id: '6',
    projectId: '1',
    title: 'Integration Testing',
    description: 'Test frontend and backend integration',
    status: 'todo',
    priority: 'medium',
    assignedTo: ['1', '3'],
    estimatedHours: 40,
    actualHours: 0,
    dueDate: '2025-03-25',
    progress: 0,
  },
  {
    id: '7',
    projectId: '1',
    title: 'Beta Release',
    description: 'Beta release milestone',
    status: 'todo',
    priority: 'high',
    assignedTo: ['4'],
    estimatedHours: 4,
    actualHours: 0,
    dueDate: '2025-03-26',
    progress: 0,
    milestone: true,
  },
  {
    id: '8',
    projectId: '1',
    title: 'User Testing',
    description: 'Conduct user testing and gather feedback',
    status: 'todo',
    priority: 'medium',
    assignedTo: ['2'],
    estimatedHours: 40,
    actualHours: 0,
    dueDate: '2025-04-10',
    progress: 0,
  },
  {
    id: '9',
    projectId: '1',
    title: 'Final Release',
    description: 'Production release milestone',
    status: 'todo',
    priority: 'high',
    assignedTo: ['4'],
    estimatedHours: 4,
    actualHours: 0,
    dueDate: '2025-04-11',
    progress: 0,
    milestone: true,
  },
];

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ tasks: mockTasks, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch tasks', isLoading: false });
    }
  },
  
  addTask: async (task) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newTask: Task = {
        ...task,
        id: (get().tasks.length + 1).toString(),
      };
      
      set(state => ({ 
        tasks: [...state.tasks, newTask], 
        isLoading: false 
      }));
      
      return newTask;
    } catch (error) {
      set({ error: 'Failed to add task', isLoading: false });
      throw error;
    }
  },
  
  updateTask: async (id, taskData) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedTasks = get().tasks.map(task => 
        task.id === id ? { ...task, ...taskData } : task
      );
      
      set({ tasks: updatedTasks, isLoading: false });
      
      const updatedTask = updatedTasks.find(task => task.id === id);
      if (!updatedTask) {
        throw new Error('Task not found');
      }
      
      return updatedTask;
    } catch (error) {
      set({ error: 'Failed to update task', isLoading: false });
      throw error;
    }
  },
  
  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedTasks = get().tasks.filter(task => task.id !== id);
      set({ tasks: updatedTasks, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to delete task', isLoading: false });
      throw error;
    }
  },
  
  getTasksByProject: (projectId) => {
    return get().tasks.filter(task => task.projectId === projectId);
  },
})); 