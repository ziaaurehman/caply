"use client"

import React, { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Task, Employee } from '@/lib/types';
import KanbanCard from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (taskId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = memo(({
  id,
  title,
  tasks,
  onAddTask,
  onEditTask,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div className="flex-1 min-w-[320px] max-w-md flex flex-col bg-gray-50 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium text-gray-900">{title}</h3>
            <span className="ml-2 text-sm text-gray-500">{tasks.length}</span>
          </div>
          <button
            onClick={onAddTask}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Plus size={20} className="text-gray-500" />
          </button>
        </div>
      </div>
      
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-4 space-y-4 overflow-y-auto transition-colors",
          isOver && "bg-gray-100"
        )}
      >
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onEditTask(task.id)}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn; 