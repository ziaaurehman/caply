"use client"

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ArrowRight, AlertTriangle, Clock, DollarSign, Calendar } from 'lucide-react';
import { useProjectStore } from '@/lib/stores/projectStore';
import Button from './Button';

const ProjectOverview: React.FC = () => {
  const { projects } = useProjectStore();
  
  const sortedProjects = [...projects]
    .sort((a, b) => {
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;
      return 0;
    });
  
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
  
  const calculateTimeProgress = (project: any) => {
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
  
  const getProjectStatus = (project: any) => {
    const timeProgress = calculateTimeProgress(project);
    const workProgress = Math.round((project.actual.hours / project.budget.hours) * 100);
    const budgetProgress = Math.round((project.actual.cost / project.budget.cost) * 100);
    
    if (budgetProgress > 80) return 'at-risk';
    if (timeProgress > workProgress + 20) return 'behind';
    if (workProgress > timeProgress + 20) return 'ahead';
    return 'on-track';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Active Projects</CardTitle>
        <Link href="/projects" className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center">
          View all
          <ArrowRight size={16} className="ml-1" />
        </Link>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedProjects.map(project => {
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
                            className={`h-full rounded-full ${
                              status === 'at-risk' ? 'bg-error-500' :
                              status === 'behind' ? 'bg-warning-500' :
                              'bg-success-500'
                            }`}
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
                      <div className={`text-sm ${budgetVariance >= 0 ? 'text-success-600' : 'text-error-600'}`}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<ArrowRight size={16} />}
          >
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectOverview;
