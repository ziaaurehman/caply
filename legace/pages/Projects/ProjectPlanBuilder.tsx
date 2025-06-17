import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useProjectStore } from '@/store/projectStore';
import { useTaskStore } from '@/store/taskStore';
import { useEmployeeStore } from '@/store/employeeStore';
import { Plus, Minus, ChevronRight, ChevronDown, Calendar, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Phase {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  isExpanded?: boolean;
}

interface Task {
  id: string;
  name: string;
  description: string;
  assignedTo: string[];
  estimatedHours: number;
  dependencies: string[];
  startDate: string;
  endDate: string;
  milestone: boolean;
}

const ProjectPlanBuilder: React.FC = () => {
  const { projects } = useProjectStore();
  const { addTask } = useTaskStore();
  const { employees } = useEmployeeStore();
  
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [phases, setPhases] = useState<Phase[]>([]);
  const [showForm, setShowForm] = useState<'phase' | 'task' | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  
  // Form states
  const [phaseName, setPhaseName] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  
  const handleAddPhase = () => {
    if (!phaseName) return;
    
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: phaseName,
      description: phaseDescription,
      tasks: [],
      isExpanded: true,
    };
    
    setPhases([...phases, newPhase]);
    setPhaseName('');
    setPhaseDescription('');
    setShowForm(null);
  };
  
  const handleAddTask = () => {
    if (!taskName || !selectedPhase) return;
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: taskName,
      description: taskDescription,
      assignedTo,
      estimatedHours: Number(estimatedHours),
      dependencies,
      startDate,
      endDate,
      milestone: isMilestone,
    };
    
    setPhases(phases.map(phase =>
      phase.id === selectedPhase
        ? { ...phase, tasks: [...phase.tasks, newTask] }
        : phase
    ));
    
    // Reset form
    setTaskName('');
    setTaskDescription('');
    setAssignedTo([]);
    setEstimatedHours('');
    setDependencies([]);
    setStartDate('');
    setEndDate('');
    setIsMilestone(false);
    setShowForm(null);
  };
  
  const handleGenerateGantt = async () => {
    if (!selectedProject) return;
    
    // Create tasks in the store
    for (const phase of phases) {
      for (const task of phase.tasks) {
        await addTask({
          ...task,
          projectId: selectedProject,
          status: 'todo',
          actualHours: 0,
          progress: 0,
        });
      }
    }
    
    // Navigate to project management page
    window.location.href = '/projects/management';
  };
  
  const togglePhase = (phaseId: string) => {
    setPhases(phases.map(phase =>
      phase.id === phaseId
        ? { ...phase, isExpanded: !phase.isExpanded }
        : phase
    ));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Project Plan Builder</h2>
          <p className="mt-1 text-sm text-gray-500">
            Build your project plan step by step
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">Select project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          
          <Button
            variant="primary"
            onClick={() => handleGenerateGantt()}
            disabled={!selectedProject || phases.length === 0}
          >
            Generate Gantt Chart
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Structure */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Project Structure</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm('phase')}
                leftIcon={<Plus size={16} />}
              >
                Add Phase
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {phases.map(phase => (
                <div key={phase.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center">
                      <button
                        onClick={() => togglePhase(phase.id)}
                        className="mr-2 text-gray-500 hover:text-gray-700"
                      >
                        {phase.isExpanded ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </button>
                      <div>
                        <h3 className="font-medium text-gray-900">{phase.name}</h3>
                        <p className="text-sm text-gray-500">{phase.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPhase(phase.id);
                        setShowForm('task');
                      }}
                      leftIcon={<Plus size={16} />}
                    >
                      Add Task
                    </Button>
                  </div>
                  
                  {phase.isExpanded && (
                    <div className="p-4 space-y-2">
                      {phase.tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-start p-3 bg-gray-50 rounded-md"
                        >
                          {task.milestone ? (
                            <span className="mr-2 text-primary-500">🎯</span>
                          ) : (
                            <span className="mr-2">📋</span>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{task.name}</h4>
                            <p className="text-sm text-gray-500">{task.description}</p>
                            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Users size={14} className="mr-1" />
                                {task.assignedTo.length} assigned
                              </div>
                              <div className="flex items-center">
                                <Clock size={14} className="mr-1" />
                                {task.estimatedHours}h
                              </div>
                              <div className="flex items-center">
                                <Calendar size={14} className="mr-1" />
                                {new Date(task.startDate).toLocaleDateString()} -{' '}
                                {new Date(task.endDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {phase.tasks.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No tasks added yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {phases.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No phases added yet</p>
                  <p className="text-sm mt-1">Click "Add Phase" to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Forms */}
        <div>
          {showForm === 'phase' && (
            <Card>
              <CardHeader>
                <CardTitle>Add Phase</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleAddPhase(); }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phase Name
                      </label>
                      <input
                        type="text"
                        value={phaseName}
                        onChange={(e) => setPhaseName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={phaseDescription}
                        onChange={(e) => setPhaseDescription(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary">
                        Add Phase
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {showForm === 'task' && (
            <Card>
              <CardHeader>
                <CardTitle>Add Task</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleAddTask(); }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Task Name
                      </label>
                      <input
                        type="text"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Assigned To
                      </label>
                      <select
                        multiple
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(
                          Array.from(e.target.selectedOptions, option => option.value)
                        )}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        {employees.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Dependencies
                      </label>
                      <select
                        multiple
                        value={dependencies}
                        onChange={(e) => setDependencies(
                          Array.from(e.target.selectedOptions, option => option.value)
                        )}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        {phases.map(phase =>
                          phase.tasks.map(task => (
                            <option key={task.id} value={task.id}>
                              {phase.name} - {task.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="milestone"
                        checked={isMilestone}
                        onChange={(e) => setIsMilestone(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="milestone" className="ml-2 block text-sm text-gray-900">
                        This is a milestone
                      </label>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(null);
                          setSelectedPhase(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary">
                        Add Task
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPlanBuilder;