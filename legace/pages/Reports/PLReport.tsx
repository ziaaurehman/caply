import React, { useState, useEffect } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { usePLStore } from '../../store/plStore';
import { formatCurrency } from '../../lib/utils';

const PLReport: React.FC = () => {
  const { categories, fetchData, getMonthlyPL } = usePLStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  useEffect(() => {
    const startDate = subMonths(selectedDate, 6);
    const endDate = addMonths(selectedDate, 6);
    fetchData(startDate, endDate);
  }, [selectedDate, fetchData]);
  
  const monthlyData = getMonthlyPL(selectedDate);
  const profitMargin = monthlyData.totalRevenue > 0 
    ? (monthlyData.netIncome / monthlyData.totalRevenue) * 100 
    : 0;
  
  const handlePreviousMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };
  
  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monthly financial performance overview
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white rounded-md shadow-sm border border-gray-300 p-2">
            <button
              onClick={handlePreviousMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            
            <span className="text-sm font-medium">
              {format(selectedDate, 'MMMM yyyy')}
            </span>
            
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <Button
            variant="outline"
            onClick={() => {/* Export functionality */}}
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {formatCurrency(monthlyData.totalRevenue)}
                </p>
              </div>
              <div className="p-2 bg-success-50 rounded-lg">
                <TrendingUp className="text-success-500" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                <p className="mt-2 text-3xl font-semibold text-error-600">
                  {formatCurrency(monthlyData.totalExpenses)}
                </p>
              </div>
              <div className="p-2 bg-error-50 rounded-lg">
                <TrendingDown className="text-error-500" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Net Income</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {formatCurrency(monthlyData.netIncome)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {profitMargin.toFixed(1)}% margin
                </p>
              </div>
              <div className={`p-2 rounded-lg ${
                monthlyData.netIncome >= 0 ? 'bg-success-50' : 'bg-error-50'
              }`}>
                {monthlyData.netIncome >= 0 ? (
                  <TrendingUp className="text-success-500\" size={24} />
                ) : (
                  <TrendingDown className="text-error-500" size={24} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Report */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Revenue Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue</h3>
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  {categories
                    .filter(cat => cat.type === 'revenue')
                    .map(category => (
                      <tr key={category.id}>
                        <td className="py-3 text-sm text-gray-500">{category.name}</td>
                        <td className="py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(monthlyData.revenue[category.code] || 0)}
                        </td>
                      </tr>
                    ))}
                  <tr className="font-medium">
                    <td className="py-3 text-gray-900">Total Revenue</td>
                    <td className="py-3 text-right text-gray-900">
                      {formatCurrency(monthlyData.totalRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Expenses Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses</h3>
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  {categories
                    .filter(cat => cat.type === 'expense')
                    .map(category => (
                      <tr key={category.id}>
                        <td className="py-3 text-sm text-gray-500">{category.name}</td>
                        <td className="py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(monthlyData.expenses[category.code] || 0)}
                        </td>
                      </tr>
                    ))}
                  <tr className="font-medium">
                    <td className="py-3 text-gray-900">Total Expenses</td>
                    <td className="py-3 text-right text-error-600">
                      {formatCurrency(monthlyData.totalExpenses)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Net Income */}
            <div className="pt-4 border-t-2 border-gray-200">
              <table className="w-full">
                <tbody>
                  <tr className="text-lg font-semibold">
                    <td className="py-3">Net Income</td>
                    <td className={`py-3 text-right ${
                      monthlyData.netIncome >= 0 ? 'text-success-600' : 'text-error-600'
                    }`}>
                      {formatCurrency(monthlyData.netIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PLReport;