import { create } from 'zustand';
import { Employee } from '../lib/types';
import { adjustCapacityForLeave, calculateResourceUtilization } from '../lib/utils';
import { useLeaveStore } from './leaveStore';
import { useProjectStore } from './projectStore';

type EmployeeState = {
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
  fetchEmployees: () => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<Employee>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;
};

const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Jane Cooper',
    email: 'jane.cooper@example.com',
    position: 'Frontend Developer',
    department: 'Engineering',
    hourlyRate: 45,
    availability: 'full-time',
    capacityHours: 40,
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    id: '2',
    name: 'Cody Fisher',
    email: 'cody.fisher@example.com',
    position: 'UX Designer',
    department: 'Design',
    hourlyRate: 50,
    availability: 'part-time',
    capacityHours: 20,
    avatar: 'https://images.pexels.com/photos/3771807/pexels-photo-3771807.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    id: '3',
    name: 'Esther Howard',
    email: 'esther.howard@example.com',
    position: 'Backend Developer',
    department: 'Engineering',
    hourlyRate: 55,
    availability: 'full-time',
    capacityHours: 40,
    avatar: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    id: '4',
    name: 'Cameron Williamson',
    email: 'cameron.williamson@example.com',
    position: 'Project Manager',
    department: 'Product',
    hourlyRate: 60,
    availability: 'full-time',
    capacityHours: 40,
    avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
];

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  isLoading: false,
  error: null,
  
  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ employees: mockEmployees, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch employees', isLoading: false });
    }
  },
  
  addEmployee: async (employee) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newEmployee: Employee = {
        ...employee,
        id: (get().employees.length + 1).toString(),
      };
      
      set(state => ({ 
        employees: [...state.employees, newEmployee], 
        isLoading: false 
      }));
      
      return newEmployee;
    } catch (error) {
      set({ error: 'Failed to add employee', isLoading: false });
      throw error;
    }
  },
  
  updateEmployee: async (id, employeeData) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEmployees = get().employees.map(employee => 
        employee.id === id ? { ...employee, ...employeeData } : employee
      );
      
      set({ employees: updatedEmployees, isLoading: false });
      
      const updatedEmployee = updatedEmployees.find(employee => employee.id === id);
      if (!updatedEmployee) {
        throw new Error('Employee not found');
      }
      
      return updatedEmployee;
    } catch (error) {
      set({ error: 'Failed to update employee', isLoading: false });
      throw error;
    }
  },
  
  deleteEmployee: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedEmployees = get().employees.filter(employee => employee.id !== id);
      set({ employees: updatedEmployees, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to delete employee', isLoading: false });
      throw error;
    }
  },

  updateEmployeeCapacity: async (employeeId: string) => {
    const leaves = useLeaveStore.getState().requests;
    const assignments = useProjectStore.getState().assignments;
    
    const updatedEmployees = get().employees.map(employee => {
      if (employee.id !== employeeId) return employee;
      
      const employeeLeaves = leaves.filter(leave => 
        leave.employeeId === employeeId && 
        leave.status === 'approved'
      );
      
      const leaveHours = employeeLeaves.reduce((sum, leave) => sum + 8, 0); // Assuming 8 hours per day
      const adjustedCapacity = adjustCapacityForLeave(employee.capacityHours, leaveHours);
      
      const employeeAssignments = assignments.filter(a => a.employeeId === employeeId);
      const utilization = calculateResourceUtilization(employeeAssignments, adjustedCapacity);
      
      return {
        ...employee,
        adjustedCapacityHours: adjustedCapacity,
        utilization,
      };
    });
    
    set({ employees: updatedEmployees });
  },
}));