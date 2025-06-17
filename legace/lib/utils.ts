import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function calculateBudgetVariance(budgeted: number, actual: number): number {
  return budgeted - actual;
}

export function calculateBudgetVariancePercentage(budgeted: number, actual: number): string {
  if (budgeted === 0) return '0%';
  const percentage = ((budgeted - actual) / budgeted) * 100;
  return `${percentage.toFixed(2)}%`;
}

export function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

// New utility functions for data synchronization
export function updateProjectProgress(tasks: any[], projectId: string): number {
  const projectTasks = tasks.filter(task => task.projectId === projectId);
  if (projectTasks.length === 0) return 0;
  
  const totalProgress = projectTasks.reduce((sum, task) => sum + task.progress, 0);
  return Math.round(totalProgress / projectTasks.length);
}

export function calculateResourceUtilization(assignments: any[], capacityHours: number): number {
  const totalHours = assignments.reduce((sum, assignment) => sum + assignment.hoursPerDay, 0);
  return Math.round((totalHours / capacityHours) * 100);
}

export function adjustCapacityForLeave(capacityHours: number, leaveHours: number): number {
  return Math.max(0, capacityHours - leaveHours);
}

export function synchronizeProjectData(project: any, tasks: any[], timeEntries: any[]) {
  const projectTasks = tasks.filter(task => task.projectId === project.id);
  const projectTimeEntries = timeEntries.filter(entry => entry.projectId === project.id);
  
  const actualHours = projectTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const progress = updateProjectProgress(projectTasks, project.id);
  
  return {
    ...project,
    actual: {
      ...project.actual,
      hours: actualHours,
    },
    progress,
  };
}