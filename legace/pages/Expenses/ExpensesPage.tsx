import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, Filter, Download, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import ExpenseModal from './ExpenseModal';
import { FileWithPreview } from '../../components/ui/FileUpload';

interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  projectId?: string;
  description: string;
  attachments: FileWithPreview[];
  status: 'pending' | 'approved' | 'rejected';
}

const mockProjects = [
  { id: '1', name: 'Website Redesign' },
  { id: '2', name: 'Mobile App Development' },
  { id: '3', name: 'CRM Integration' },
];

const categories = [
  'Salaries',
  'Software',
  'Travel',
  'Marketing',
  'Infrastructure',
  'Other',
];

const currencies = [
  { code: 'CAD', symbol: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'USD', symbol: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '🇬🇧', name: 'British Pound' },
];

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const handleAddExpense = (expense: Omit<Expense, 'id' | 'status'>) => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString(),
      status: 'pending',
    };
    setExpenses([...expenses, newExpense]);
    setShowModal(false);
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenses(expenses.map(e => e.id === expense.id ? expense : e));
    setShowModal(false);
    setSelectedExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const filteredExpenses = expenses.filter(expense => {
    if (selectedProject && expense.projectId !== selectedProject) return false;
    if (selectedCategory && expense.category !== selectedCategory) return false;
    if (dateRange.start && expense.date < dateRange.start) return false;
    if (dateRange.end && expense.date > dateRange.end) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        expense.description.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalByCategory = categories.map(category => ({
    category,
    total: filteredExpenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage business expenses
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => {/* Export functionality */}}
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedExpense(null);
              setShowModal(true);
            }}
            leftIcon={<Plus size={18} />}
          >
            Add Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
              <Calendar className="text-gray-400" size={24} />
            </div>
          </CardContent>
        </Card>

        {totalByCategory.slice(0, 3).map(({ category, total }) => (
          <Card key={category}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{category}</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle>Expense List</CardTitle>
            <div className="flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">All Projects</option>
                {mockProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map(expense => {
                  const isExpanded = expandedRows.includes(expense.id);
                  const project = mockProjects.find(p => p.id === expense.projectId);

                  return (
                    <React.Fragment key={expense.id}>
                      <tr className={cn(isExpanded && "bg-gray-50")}>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleRowExpanded(expense.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.category}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {expense.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {formatCurrency(expense.amount, expense.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                            expense.status === 'approved' && "bg-success-100 text-success-800",
                            expense.status === 'rejected' && "bg-error-100 text-error-800",
                            expense.status === 'pending' && "bg-warning-100 text-warning-800"
                          )}>
                            {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedExpense(expense);
                              setShowModal(true);
                            }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {expense.attachments.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                                    Attachments
                                  </h4>
                                  <div className="flex flex-wrap gap-4">
                                    {expense.attachments.map((file, index) => (
                                      <div
                                        key={index}
                                        className="relative group"
                                      >
                                        {file.preview ? (
                                          <img
                                            src={file.preview}
                                            alt={file.name}
                                            className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                                          />
                                        ) : (
                                          <div className="h-20 w-20 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                                            <span className="text-sm text-gray-500">
                                              {file.name.split('.').pop()?.toUpperCase()}
                                            </span>
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                          <button
                                            onClick={() => {/* Download functionality */}}
                                            className="text-white hover:text-gray-200"
                                          >
                                            <Download size={20} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ExpenseModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedExpense(null);
        }}
        onSubmit={selectedExpense ? handleEditExpense : handleAddExpense}
        expense={selectedExpense}
        projects={mockProjects}
        categories={categories}
        currencies={currencies}
      />
    </div>
  );
};

export default ExpensesPage;