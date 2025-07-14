"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from '@/components/ui/Button';
import { useEmployeeStore } from '@/lib/stores/employeeStore';
import { projectAPI, taskAPI, type Project, type Task } from '@/utils/api';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { Plus, Filter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import TaskModal from './TaskModal';

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5'
      }
    }
  })
};

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { employees, fetchEmployees } = useEmployeeStore();
  
  const [selectedProject, setSelectedProject] = useState<string>('1');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // Minimum distance before drag starts
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Delay before touch drag starts
        tolerance: 5, // Touch movement tolerance
      }
    }),
    useSensor(KeyboardSensor)
  );
  
  // Fetch projects and tasks
  const fetchProjects = async () => {
    try {
      const data = await projectAPI.getProjects();
      setProjects(data.projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await taskAPI.getTasks();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchEmployees();
  }, [fetchEmployees]);
  
  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'completed', title: 'Done' },
  ];
  
  const filteredTasks = tasks
    .filter((task: Task) => task.project_id === selectedProject)
    .filter((task: Task) => showCompleted || task.status !== 'completed')
    .filter((task: Task) => assigneeFilter === 'all' || (task.assigned_to && task.assigned_to.includes(assigneeFilter)));
  
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = filteredTasks.filter((task: Task) => task.status === column.id);
    return acc;
  }, {} as Record<string, Task[]>);
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const task = tasks.find((t: Task) => t.id === active.id);
    if (!task) return;
    
    const oldStatus = task.status;
    const newStatus = over.id as string;
    
    if (oldStatus !== newStatus) {
      await taskAPI.updateTask(task.id, { status: newStatus as 'todo' | 'in_progress' | 'completed' });
    }
    
    setActiveId(null);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage tasks with Kanban board
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              {projects.map((project: Project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Assignees</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showCompleted"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="showCompleted" className="text-sm text-gray-600">
              Show completed tasks
            </label>
          </div>
          
          <Button
            variant="outline"
            onClick={() => {/* Export functionality */}}
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
          
          <Button
            variant="default"
            onClick={() => {
              setSelectedTask(null);
              setShowTaskModal(true);
            }}
            leftIcon={<Plus size={18} />}
          >
            Add Task
          </Button>
        </div>
      </div>
      
      <div className="h-[calc(100vh-12rem)] flex gap-6">
        <DndContext 
          sensors={sensors}
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByStatus[column.id] || []}
              onAddTask={() => {
                setSelectedTask(null);
                setShowTaskModal(true);
              }}
              onEditTask={(taskId) => {
                setSelectedTask(taskId);
                setShowTaskModal(true);
              }}
            />
          ))}
          
          <DragOverlay dropAnimation={dropAnimation}>
            {activeId ? (
              <div className="transform rotate-3 cursor-grabbing">
                <KanbanCard
                  task={tasks.find((t: Task) => t.id === activeId)!}
                  isDragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      
      {showTaskModal && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          projectId={selectedProject}
          taskId={selectedTask}
        />
      )}
    </div>
  );
}
