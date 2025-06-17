import React, { useEffect, useState } from 'react';
import { X, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useTaskStore } from '@/store/taskStore';
import { useEmployeeStore } from '@/store/employeeStore';
import { cn } from '@/lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskId: string | null;
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  projectId,
  taskId,
}) => {
  const { tasks, addTask, updateTask } = useTaskStore();
  const { employees } = useEmployeeStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignedTo: [] as string[],
    estimatedHours: '',
    endDate: '',
  });
  
  useEffect(() => {
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setFormData({
          name: task.name,
          description: task.description,
          assignedTo: task.assignedTo,
          estimatedHours: task.estimatedHours.toString(),
          endDate: task.endDate,
        });
      }
    }
  }, [taskId, tasks]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      ...formData,
      projectId,
      estimatedHours: Number(formData.estimatedHours),
      status: 'todo',
      actualHours: 0,
      progress: 0,
      startDate: new Date().toISOString().split('T')[0], // Today
      dependencies: [],
      milestone: false,
    };
    
    try {
      if (taskId) {
        await updateTask(taskId, taskData);
      } else {
        await addTask(taskData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {taskId ? 'Edit Task' : 'Add Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-6">
          <div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full px-3 py-2 text-lg border-0 border-b-2 border-gray-200 focus:border-primary-500 focus:ring-0 placeholder-gray-400"
              placeholder="What needs to be done?"
              required
            />
          </div>
          
          <div>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm placeholder-gray-400"
              placeholder="Add a more detailed description..."
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Users size={18} className="mr-2" />
                Assigned to
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {employees.map(employee => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => {
                      const newAssigned = formData.assignedTo.includes(employee.id)
                        ? formData.assignedTo.filter(id => id !== employee.id)
                        : [...formData.assignedTo, employee.id];
                      setFormData({ ...formData, assignedTo: newAssigned });
                    }}
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-sm border transition-colors",
                      formData.assignedTo.includes(employee.id)
                        ? "bg-primary-50 border-primary-200 text-primary-700"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {employee.avatar ? (
                      <img
                        src={employee.avatar}
                        alt={employee.name}
                        className="w-5 h-5 rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-2 text-xs font-medium">
                        {employee.name.charAt(0)}
                      </div>
                    )}
                    {employee.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                  min="0"
                  step="0.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {taskId ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;