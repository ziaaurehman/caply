// Export all API modules
export * from './client';
export * from './project';
export * from './team';
export * from './task';
export * from './kanban';

// Re-export specific APIs for convenience
export { clientAPI } from './client';
export { projectAPI } from './project';
export { teamAPI } from './team';
export { taskAPI } from './task';
export { kanbanAPI } from './kanban'; 