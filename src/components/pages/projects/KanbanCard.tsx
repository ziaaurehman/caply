"use client"

import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Clock } from 'lucide-react';
import { Task } from '@/lib/types';
import { useEmployeeStore } from '@/lib/stores/employeeStore';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

const KanbanCard: React.FC<KanbanCardProps> = memo(({
  task,
  onClick,
  isDragging = false,
}) => {
  const { employees } = useEmployeeStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: task.id,
    data: task
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };
  
  const assignedEmployees = employees.filter(e => task.assignedTo.includes(e.id));
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
        task.milestone && "border-l-4 border-l-primary-500"
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{task.title}</h4>
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          </div>
          {task.milestone && (
            <span className="text-primary-500">🎯</span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <Clock size={14} className="mr-1" />
            {task.estimatedHours}h
          </div>
          
          {task.dueDate && (
            <div className="flex items-center">
              <Calendar size={14} className="mr-1" />
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {assignedEmployees.map(employee => (
              <div
                key={employee.id}
                className="relative"
                title={employee.name}
              >
                {employee.avatar ? (
                  <img
                    src={employee.avatar}
                    alt={employee.name}
                    className="h-6 w-6 rounded-full border-2 border-white"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center">
                    <span className="text-primary-700 text-xs font-medium">
                      {employee.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {task.progress !== undefined && (
            <div className="flex items-center">
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    task.progress >= 100 ? 'bg-success-500' :
                    task.progress >= 50 ? 'bg-primary-500' :
                    'bg-warning-500'
                  )}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="ml-2 text-xs text-gray-500">
                {task.progress}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

KanbanCard.displayName = 'KanbanCard';

export default KanbanCard; 