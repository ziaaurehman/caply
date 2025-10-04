"use client";

import type React from "react";
import {
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  Eye,
  Download,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  utilization: number;
  hours: string;
  status: "available" | "optimal" | "overallocated";
}

interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  budget: {
    spent: number;
    total: number;
    remaining: number;
  };
  timeline: {
    daysLeft: number;
    endDate: string;
  };
  status: "on-track" | "behind" | "at-risk";
  color: string;
}

// Professional donut chart component
const DonutChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
}> = ({ data, centerValue, centerLabel }) => {
  const size = 120;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercentage = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="12"
          />
          {data.map((item, index) => {
            const percentage = item.value;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -(
              (cumulativePercentage / 100) *
              circumference
            );
            cumulativePercentage += percentage;

            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">
            {centerValue}
          </span>
          <div className="text-xs text-gray-500 text-center leading-tight">
            {centerLabel.includes(" ")
              ? centerLabel
                  .split(" ")
                  .map((word, index) => <div key={index}>{word}</div>)
              : centerLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "success" | "canceled" | null
  >(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      setPaymentStatus("success");
      setShowPaymentConfirmation(true);

      // Remove query params from URL after showing confirmation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      // Auto-hide after 8 seconds
      setTimeout(() => {
        setShowPaymentConfirmation(false);
      }, 8000);
    } else if (canceled === "true") {
      setPaymentStatus("canceled");
      setShowPaymentConfirmation(true);

      // Remove query params from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      // Auto-hide after 6 seconds
      setTimeout(() => {
        setShowPaymentConfirmation(false);
      }, 6000);
    }
  }, [searchParams]);

  const metrics = [
    {
      title: "Team Members",
      value: "4/4",
      icon: Users,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    {
      title: "Active Projects",
      value: "2",
      subtitle: "0 over budget, 2 behind",
      icon: BarChart3,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      title: "Resource Utilization",
      value: "14%",
      icon: TrendingUp,
      bgColor: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      title: "Hours Logged",
      value: "33.5",
      subtitle: "↓ 416.5 from last period",
      icon: Clock,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-500",
    },
  ];

  const projects: Project[] = [
    {
      id: "1",
      name: "Website Redesign",
      description: "Redesign the company website with modern UI/UX",
      progress: 55,
      budget: { spent: 9800, total: 20000, remaining: 10200 },
      timeline: { daysLeft: 118, endDate: "3/31/2025" },
      status: "behind",
      color: "bg-blue-500",
    },
    {
      id: "2",
      name: "Mobile App Development",
      description: "Develop a mobile app for iOS and Android",
      progress: 33,
      budget: { spent: 13500, total: 40000, remaining: 26500 },
      timeline: { daysLeft: 27, endDate: "6/30/2025" },
      status: "behind",
      color: "bg-green-500",
    },
    {
      id: "3",
      name: "CRM Integration",
      description: "Integrate with third-party CRM software",
      progress: 0,
      budget: { spent: 0, total: 12000, remaining: 12000 },
      timeline: { daysLeft: 103, endDate: "4/15/2025" },
      status: "behind",
      color: "bg-yellow-500",
    },
  ];

  const teamMembers: TeamMember[] = [
    {
      id: "1",
      name: "Jane Cooper",
      role: "Frontend Developer",
      avatar: "/placeholder.svg?height=40&width=40",
      utilization: 25,
      hours: "10h / 40h",
      status: "available",
    },
    {
      id: "2",
      name: "Cody Fisher",
      role: "UX Designer",
      avatar: "/placeholder.svg?height=40&width=40",
      utilization: 20,
      hours: "4h / 20h",
      status: "available",
    },
    {
      id: "3",
      name: "Esther Howard",
      role: "Backend Developer",
      avatar: "/placeholder.svg?height=40&width=40",
      utilization: 75,
      hours: "6h / 8h",
      status: "optimal",
    },
    {
      id: "4",
      name: "Cameron Williamson",
      role: "Project Manager",
      avatar: "/placeholder.svg?height=40&width=40",
      utilization: 0,
      hours: "0h / 40h",
      status: "available",
    },
  ];

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "bg-red-500";
    if (utilization >= 70) return "bg-blue-500";
    if (utilization >= 50) return "bg-orange-500";
    return "bg-gray-300";
  };

  const getUtilizationTextColor = (status: string) => {
    switch (status) {
      case "available":
        return "text-orange-600";
      case "optimal":
        return "text-blue-600";
      case "overallocated":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Chart data
  const projectAllocationData = [
    { label: "Website Redesign", value: 55, color: "#3b82f6" },
    { label: "Mobile App Development", value: 33, color: "#10b981" },
    { label: "CRM Integration", value: 12, color: "#f59e0b" },
  ];

  const skillDistributionData = [
    { label: "Frontend Developer", value: 25, color: "#3b82f6" },
    { label: "UX Designer", value: 25, color: "#06b6d4" },
    { label: "Backend Developer", value: 25, color: "#10b981" },
    { label: "Project Manager", value: 25, color: "#f59e0b" },
  ];

  const workloadDistributionData = [
    { label: "Overallocated", value: 0, color: "#ef4444" },
    { label: "Optimal", value: 25, color: "#f59e0b" },
    { label: "Available", value: 75, color: "#3b82f6" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {showPaymentConfirmation && (
          <div
            className={`fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 ${
              showPaymentConfirmation ? "" : "animate-out slide-out-to-top-5"
            }`}
          >
            <div
              className={`min-w-[400px] max-w-md rounded-lg shadow-lg p-6 ${
                paymentStatus === "success"
                  ? "bg-white border-l-4 border-green-500"
                  : "bg-white border-l-4 border-red-500"
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {paymentStatus === "success" ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <h3
                    className={`text-lg font-semibold ${
                      paymentStatus === "success"
                        ? "text-green-900"
                        : "text-red-900"
                    }`}
                  >
                    {paymentStatus === "success"
                      ? "Payment Successful!"
                      : "Payment Canceled"}
                  </h3>
                  <div
                    className={`mt-2 text-sm ${
                      paymentStatus === "success"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {paymentStatus === "success" ? (
                      <>
                        <p className="mb-2">
                          Thank you for subscribing! Your payment has been
                          processed successfully.
                        </p>
                        <p>
                          Your subscription is now active and you have full
                          access to all features.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mb-2">
                          Your payment was canceled and no charges were made.
                        </p>
                        <p>
                          You can try again anytime by visiting the pricing
                          page.
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentConfirmation(false)}
                  className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Overview of your resources, projects, and capacity.
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-lg ${metric.bgColor} flex items-center justify-center`}
                >
                  <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </p>
                {metric.subtitle && (
                  <p className="text-sm text-gray-500">{metric.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Projects */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[500px] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-800">
                    Active Projects
                  </h2>
                  <button className="flex items-center text-orange-500 hover:text-orange-600 text-sm font-medium">
                    <Eye className="h-4 w-4 mr-1" />
                    View all
                  </button>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 mb-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-4">PROJECT</div>
                    <div className="col-span-2">PROGRESS</div>
                    <div className="col-span-3">BUDGET</div>
                    <div className="col-span-2">TIMELINE</div>
                    <div className="col-span-1">STATUS</div>
                  </div>

                  {/* Projects */}
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="col-span-4">
                          <div className="flex items-center">
                            <div
                              className={`h-3 w-3 rounded-full ${project.color} mr-3 flex-shrink-0`}
                            ></div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {project.name}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {project.description}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full"
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-900 whitespace-nowrap">
                              {project.progress}% / 100%
                            </span>
                          </div>
                        </div>
                        <div className="col-span-3">
                          <div className="text-sm text-gray-900">
                            ${project.budget.spent.toLocaleString()} /
                          </div>
                          <div className="text-sm text-gray-900">
                            ${project.budget.total.toLocaleString()}
                          </div>
                          <div className="text-sm text-green-600">
                            +${project.budget.remaining.toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-sm text-gray-900">
                            -{project.timeline.daysLeft} days left
                          </div>
                          <div className="text-sm text-gray-500">
                            {project.timeline.endDate}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Behind
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 flex-shrink-0">
                  <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Team Capacity Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[500px] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-800">
                    Team Capacity Overview
                  </h2>
                  <span className="text-sm text-orange-600 font-medium">
                    Available
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-6">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={member.avatar || "/placeholder.svg"}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.role}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-medium ${getUtilizationTextColor(member.status)}`}
                          >
                            {member.utilization}%
                          </span>
                        </div>

                        <div className="relative">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 relative">
                            <div
                              className={`h-2 rounded-full ${getUtilizationColor(member.utilization)}`}
                              style={{ width: `${member.utilization}%` }}
                            ></div>
                            {/* Tick marks */}
                            <div className="absolute top-0 left-1/4 w-px h-2 bg-white"></div>
                            <div className="absolute top-0 left-1/2 w-px h-2 bg-white"></div>
                            <div className="absolute top-0 left-3/4 w-px h-2 bg-white"></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {member.hours}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 flex-shrink-0">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-600">
                        Overallocated ({">"}100%)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-600">High (90-100%)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Optimal (70-90%)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600">
                        Available ({"<"}70%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Resource Distribution - Separate Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">
              Project Resource Distribution
            </h2>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-6">
                  Project Allocation
                </h3>
                <DonutChart
                  data={projectAllocationData}
                  centerValue="2"
                  centerLabel="Active Projects"
                />
                <div className="mt-6 space-y-3">
                  {projectAllocationData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                      <span className="text-gray-900 font-medium">
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-6">
                  Skill Distribution
                </h3>
                <DonutChart
                  data={skillDistributionData}
                  centerValue="4"
                  centerLabel="Unique Roles"
                />
                <div className="mt-6 space-y-3">
                  {skillDistributionData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                      <span className="text-gray-900 font-medium">
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-6">
                  Workload Distribution
                </h3>
                <DonutChart
                  data={workloadDistributionData}
                  centerValue="0"
                  centerLabel="Optimally Allocated"
                />
                <div className="mt-6 space-y-3">
                  {workloadDistributionData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                      <span className="text-gray-900 font-medium">
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardSkeleton = () => {
  return (
    <div>
      <div className="animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
};

export default Dashboard;
