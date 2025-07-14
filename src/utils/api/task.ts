interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours: number;
  due_date?: string;
  position: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface CreateTaskData {
  project_id: string;
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  due_date?: string;
  created_by?: string;
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  position?: number;
}

interface TasksResponse {
  tasks: Task[];
}

interface TaskResponse {
  task: Task;
}

// Tasks API
export const taskAPI = {
  // Get all tasks
  getTasks: async (): Promise<TasksResponse> => {
    const response = await fetch('/api/tasks');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch tasks');
    }
    const data = await response.json();
    return { tasks: data.tasks || [] };
  },

  // Get tasks by project
  getTasksByProject: async (projectId: string): Promise<TasksResponse> => {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch project tasks');
    }
    const data = await response.json();
    return { tasks: data.tasks || [] };
  },

  // Get single task by ID
  getTask: async (id: string): Promise<TaskResponse> => {
    const response = await fetch(`/api/tasks/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch task');
    }
    const data = await response.json();
    return { task: data.task };
  },

  // Create new task
  createTask: async (data: CreateTaskData): Promise<TaskResponse> => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create task');
    }
    
    const result = await response.json();
    return { task: result.task };
  },

  // Update existing task
  updateTask: async (id: string, data: UpdateTaskData): Promise<TaskResponse> => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update task');
    }
    
    const result = await response.json();
    return { task: result.task };
  },

  // Delete task
  deleteTask: async (id: string): Promise<void> => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete task');
    }
  }
};

export type {
  Task,
  CreateTaskData,
  UpdateTaskData,
  TasksResponse,
  TaskResponse
}; 