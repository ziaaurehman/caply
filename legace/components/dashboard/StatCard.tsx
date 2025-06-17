import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: string | number;
    positive?: boolean;
  };
  alert?: {
    type: 'warning' | 'error' | 'success';
    message: string;
  };
  className?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  alert,
  className,
  onClick,
}) => {
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200", 
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
            
            {change && (
              <p className="mt-2 text-sm">
                <span className={cn(
                  "font-medium",
                  change.positive ? "text-success-600" : "text-error-600"
                )}>
                  {change.positive ? '↑' : '↓'} {change.value}
                </span>
                <span className="text-gray-500 ml-1">from last period</span>
              </p>
            )}
            
            {alert && (
              <p className={cn(
                "mt-2 text-sm font-medium flex items-center",
                alert.type === 'warning' && "text-warning-600",
                alert.type === 'error' && "text-error-600",
                alert.type === 'success' && "text-success-600"
              )}>
                {alert.type === 'warning' && '⚠️'}
                {alert.type === 'error' && '🚨'}
                {alert.type === 'success' && '✅'}
                <span className="ml-1">{alert.message}</span>
              </p>
            )}
          </div>
          
          <div className={cn(
            "p-2 rounded-lg",
            alert?.type === 'warning' && "bg-warning-50",
            alert?.type === 'error' && "bg-error-50",
            alert?.type === 'success' && "bg-success-50",
            !alert && "bg-primary-50"
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;