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
import Link from "next/link";
import { useOrganizationStore } from "@/lib/stores/organizationStore";
import {
  useProjects,
  useProjectsProgress,
} from "@/lib/hooks/useProjects";
import { useCapacityOverview } from "@/lib/hooks/useCapacity";
import type { Project } from "@/utils/api/project";
import { useMemo } from "react";

// Local interfaces removed in favor of imported types
interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  utilization: number;
  hours: string;
  status: "available" | "optimal" | "overallocated";
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

  const {
    currentOrganization,
    loading: organizationLoading,
    fetchUserOrganizations,
    userOrganizations,
  } = useOrganizationStore();

  // Initialize organization store if needed
  useEffect(() => {
    if (!organizationLoading && userOrganizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [organizationLoading, userOrganizations.length, fetchUserOrganizations]);

  // Fetch projects using React Query
  // Limit to 5 projects for dashboard view, active status
  const filters = useMemo(
    () => ({
      page: 1,
      limit: 5,
      status: "active",
    }),
    []
  );

  const {
    data: projectsData,
    isLoading: projectsLoading,
  } = useProjects(currentOrganization?.id || "", filters);

  const projects = useMemo(() => projectsData?.projects || [], [projectsData]);

  // Fetch progress data for projects
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const { data: progressData } = useProjectsProgress(projectIds);

  // Merge progress data with projects
  const projectsWithProgress = useMemo(() => {
    if (!progressData?.progress) return projects;

    return projects.map((project) => {
      const progressInfo = progressData.progress.find(
        (p) => p.projectId === project.id
      );
      if (progressInfo) {
        return {
          ...project,
          progress: progressInfo.progress,
        };
      }
      return project;
    });
  }, [projects, progressData]);

  const calculateTimeProgress = (project: Project) => {
    if (!project.start_date || !project.end_date) return 0;

    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const today = new Date();

    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();

    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  };

  const getRemainingDays = (endDate: string | undefined) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    const days = Math.ceil(
      (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getBudgetUtilization = (project: Project) => {
    const timeProgress = calculateTimeProgress(project);
    return Math.min(100, timeProgress);
  };

  const getProjectBudget = (project: Project) => {
    if (project.project_type === "fixed_fee" && project.budget_amount) {
      const budgetUtilization = getBudgetUtilization(project);
      const spent = Math.round(
        (budgetUtilization / 100) * project.budget_amount
      );
      return {
        total: project.budget_amount,
        spent: spent,
        remaining: project.budget_amount - spent,
      };
    } else if (
      project.project_type === "time_materials" &&
      project.billing_rate
    ) {
      const estimatedHours = project.budget_hours || 40;
      const totalBudget = estimatedHours * project.billing_rate;
      const budgetUtilization = getBudgetUtilization(project);
      const spent = Math.round((budgetUtilization / 100) * totalBudget);
      return {
        total: totalBudget,
        spent: spent,
        remaining: totalBudget - spent,
      };
    }
    return null;
  };

  // Helper to get random color for project icon (since it's not in DB yet)
  const getProjectColor = (id: string) => {
    const colors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"];
    const index = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // --- Capacity Data Fetching ---
  const currentMonthDateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month

    return {
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    };
  }, []);

  const {
    data: capacityData,
    isLoading: capacityLoading
  } = useCapacityOverview(currentOrganization?.id || "", {
    start_date: currentMonthDateRange.start_date,
    end_date: currentMonthDateRange.end_date,
    only_active: true
  });

  const capacityOverview = capacityData?.capacityOverview;

  const teamMembers: TeamMember[] = useMemo(() => {
    if (!capacityOverview) return [];

    return capacityOverview.map((item: any) => {
      const utilization = item.capacity > 0 ? Math.round((item.totalAllocatedHours / item.capacity) * 100) : 0;

      let status: "available" | "optimal" | "overallocated" = "available";
      if (utilization >= 90) status = "overallocated";
      else if (utilization >= 70) status = "optimal";

      return {
        id: item.member.id,
        name: item.member.user.full_name,
        role: item.member.role || "Team Member",
        avatar: item.member.user.avatar_url || "/placeholder.svg?height=40&width=40",
        utilization: utilization,
        hours: `${item.totalAllocatedHours}h / ${item.capacity}h`,
        status: status
      };
    }).slice(0, 5); // Limit to 5 members
  }, [capacityOverview]);


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
            className={`fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 ${showPaymentConfirmation ? "" : "animate-out slide-out-to-top-5"
              }`}
          >
            <div
              className={`min-w-[400px] max-w-md rounded-lg shadow-lg p-6 ${paymentStatus === "success"
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
                    className={`text-lg font-semibold ${paymentStatus === "success"
                      ? "text-green-900"
                      : "text-red-900"
                      }`}
                  >
                    {paymentStatus === "success"
                      ? "Payment Successful!"
                      : "Payment Canceled"}
                  </h3>
                  <div
                    className={`mt-2 text-sm ${paymentStatus === "success"
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
                  <Link href="/projects">
                    <button className="flex items-center text-orange-500 hover:text-orange-600 text-sm font-medium">
                      <Eye className="h-4 w-4 mr-1" />
                      View all
                    </button>
                  </Link>
                </div>
              </div>
              <div className="p-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[40%]"
                        >
                          Project
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]"
                        >
                          Progress
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]"
                        >
                          Budget
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]"
                        >
                          Timeline
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {projectsLoading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                            Loading projects...
                          </td>
                        </tr>
                      ) : projectsWithProgress.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                            No active projects found. <Link href="/projects/new" className="text-orange-500 hover:underline">Create one?</Link>
                          </td>
                        </tr>
                      ) : (
                        projectsWithProgress.map((project) => {
                          const budget = getProjectBudget(project);
                          const remainingDays = getRemainingDays(project.end_date);
                          const progress = project.progress || 0;

                          return (
                            <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div
                                    className={`h-2.5 w-2.5 rounded-full ${getProjectColor(project.id)} mr-3 flex-shrink-0 ring-2 ring-white`}
                                  ></div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                      {project.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate mt-0.5">
                                      {project.description || "No description"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap align-middle">
                                <div className="w-full max-w-[140px]">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-700">{progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-primary-600 h-1.5 rounded-full transition-all duration-500"
                                      style={{ width: `${progress}%`, backgroundColor: progress < 30 ? '#ef4444' : progress < 70 ? '#f59e0b' : '#10b981' }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  {budget ? (
                                    <>
                                      <span className="text-sm font-medium text-gray-900">
                                        ${budget.spent.toLocaleString()}
                                        <span className="text-gray-400 font-normal ml-1">
                                          / ${budget.total.toLocaleString()}
                                        </span>
                                      </span>
                                      <span className={`text-xs mt-0.5 font-medium ${budget.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {budget.remaining >= 0 ? '+' : ''}${budget.remaining.toLocaleString()} left
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-500 italic">No budget set</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <div className="flex items-center text-sm text-gray-900">
                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${remainingDays < 30 ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                    {remainingDays > 0 ? `${remainingDays} days` : Math.abs(remainingDays) + " days overdue"}
                                  </div>
                                  <span className="text-xs text-gray-500 pl-3.5 mt-0.5">
                                    {project.end_date ? `Due ${new Date(project.end_date).toLocaleDateString()}` : "No due date"}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Showing {projectsWithProgress.length} active projects
                  </div>
                  <button className="flex items-center px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Export Report
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
                  <Link href="/capacity">
                    <span className="text-sm text-orange-600 font-medium hover:text-orange-700 cursor-pointer">
                      Available
                    </span>
                  </Link>
                </div>
              </div>
              <div className="p-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-6">
                    {capacityLoading ? (
                      <div className="text-center py-10 text-gray-500">Loading capacity...</div>
                    ) : teamMembers.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        No active team members found. <Link href="/teams" className="text-orange-500 hover:underline">Manage Team</Link>
                      </div>
                    ) : (
                      teamMembers.map((member) => (
                        <div key={member.id} className="group cursor-pointer" onClick={() => router.push("/capacity")}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img
                                  src={member.avatar || "/placeholder.svg"}
                                  alt={member.name}
                                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                                />
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${member.status === 'available' ? 'bg-green-500' : member.status === 'optimal' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 leading-none">
                                  {member.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {member.role}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-sm font-bold ${getUtilizationTextColor(member.status)}`}
                              >
                                {member.utilization}%
                              </span>
                            </div>
                          </div>

                          <div className="relative pt-1">
                            <div className="w-full bg-gray-100 rounded-full h-2 relative overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${getUtilizationColor(member.utilization)}`}
                                style={{ width: `${member.utilization}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center mt-1.5">
                              <p className="text-xs text-gray-400 font-medium">
                                {member.hours}
                              </p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                                {member.status === 'available' ? 'Available' : member.status === 'optimal' ? 'Optimal' : 'Overloaded'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )))}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex flex-wrap gap-4 text-xs justify-center">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 bg-red-500 rounded-full ring-2 ring-red-100"></div>
                      <span className="text-gray-600 font-medium">{">"}100%</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 bg-red-500 rounded-full opacity-80 ring-2 ring-red-50"></div>
                      <span className="text-gray-600 font-medium">90-100%</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full ring-2 ring-blue-100"></div>
                      <span className="text-gray-600 font-medium">70-90%</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full ring-2 ring-green-100"></div>
                      <span className="text-gray-600 font-medium">{"<"}70%</span>
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
