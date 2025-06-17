import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Filter, ChevronRight, AlertTriangle, Clock, DollarSign, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import ProjectModal from './ProjectModal';
import { Project } from '../../lib/types';
import { formatCurrency, cn } from '../../lib/utils';

const ProjectsPage: React.FC = () => {
  const { projects, deleteProject } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
    }
  };
  
  const handleAddNew = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-progress':
        return '🔵';
      case 'planned':
        return '🟡';
      case 'completed':
        return '🟢';
      case 'on-hold':
        return '⚪';
      default:
        return '⚫';
    }
  };
  
  const calculateTimeProgress = (project: Project) => {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();
    
    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  };
  
  const getRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const getProjectStatus = (project: Project) => {
    const timeProgress = calculateTimeProgress(project);
    const workProgress = Math.round((project.actual.hours / project.budget.hours) * 100);
    const budgetProgress = Math.round((project.actual.cost / project.budget.cost) * 100);
    
    if (budgetProgress > 80) return 'at-risk';
    if (timeProgress > workProgress + 20) return 'behind';
    if (workProgress > timeProgress + 20) return 'ahead';
    return 'on-track';
  };
  
  const filteredProjects = projects.filter(project => 
    statusFilter === 'all' ? true : project.status === statusFilter
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your projects and track their progress
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
          
          <Link to="/projects/new">
            <Button
              variant="primary"
              leftIcon={<Plus size={18} />}
            >
              New Project
            </Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Projects Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-xs font-medium text-gray-500 border-b">
                  <th className="text-left py-2">Project</th>
                  <th className="text-center py-2">Progress</th>
                  <th className="text-right py-2">Budget</th>
                  <th className="text-right py-2">Timeline</th>
                  <th className="text-center py-2">Status</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map(project => {
                  const timeProgress = calculateTimeProgress(project);
                  const workProgress = Math.round((project.actual.hours / project.budget.hours) * 100);
                  const budgetVariance = project.budget.cost - project.actual.cost;
                  const remainingDays = getRemainingDays(project.endDate);
                  const status = getProjectStatus(project);
                  
                  return (
                    <tr key={project.id} className="group hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-start">
                          <span className="mr-2 text-lg">
                            {getStatusIcon(project.status)}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{project.name}</div>
                            <div className="text-sm text-gray-500">{project.description}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3">
                        <div className="flex flex-col items-center">
                          <div className="text-sm mb-1">
                            <span className="font-medium">{workProgress}%</span>
                            <span className="text-gray-500"> / </span>
                            <span className="text-gray-500">{timeProgress}%</span>
                          </div>
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                status === 'at-risk' ? 'bg-error-500' :
                                status === 'behind' ? 'bg-warning-500' :
                                'bg-success-500'
                              )}
                              style={{ width: `${workProgress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3 text-right">
                        <div className="font-medium">
                          {formatCurrency(project.actual.cost)}
                          <span className="text-gray-500"> / </span>
                          {formatCurrency(project.budget.cost)}
                        </div>
                        <div className={cn(
                          "text-sm",
                          budgetVariance >= 0 ? 'text-success-600' : 'text-error-600'
                        )}>
                          {budgetVariance >= 0 ? '+' : ''}{formatCurrency(budgetVariance)}
                        </div>
                      </td>
                      
                      <td className="py-3 text-right">
                        <div className="font-medium">
                          {remainingDays} days left
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(project.endDate).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="py-3">
                        <div className="flex justify-center space-x-2">
                          {status === 'at-risk' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-800">
                              <AlertTriangle size={12} className="mr-1" />
                              At Risk
                            </span>
                          )}
                          {status === 'behind' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                              <Clock size={12} className="mr-1" />
                              Behind
                            </span>
                          )}
                          {status === 'ahead' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                              <Calendar size={12} className="mr-1" />
                              Ahead
                            </span>
                          )}
                          {status === 'on-track' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              <DollarSign size={12} className="mr-1" />
                              On Track
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-3 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(project)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(project.id)}
                            className="text-error-600 hover:text-error-900"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
      />
    </div>
  );
};

export default ProjectsPage;