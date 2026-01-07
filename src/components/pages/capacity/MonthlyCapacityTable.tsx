"use client"

import React, { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, Plus, Trash, AlertTriangle, Pencil, Settings } from "lucide-react"
import EditResourceModal from "@/components/pages/capacity/EditResourceModal"
import ProjectAssignmentModal from "./ProjectAssignmentModal"
import ConfirmationModal from "@/components/ui/ConfirmationModal"
import { useOrganizationStore } from "@/lib/stores/organizationStore"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useMonthlyCapacity } from "@/lib/hooks/useCapacity"
import {
    startOfWeek,
    startOfDay,
    parseISO,
    eachDayOfInterval,
    isWeekend,
    isPast,
    isToday,
    addDays,
    getDay,
} from "date-fns"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

interface ResourceAllocation {
    id: string
    organizationMemberId: string
    weeklyCapacityHours: number
    hourlyRate?: number
    isActive: boolean
    isArchived: boolean
    createdAt: string
    updatedAt: string
    organization_members: {
        id: string
        user_id: string
        status: string
        roles?: { id: string; name: string }
        users: {
            id: string
            full_name: string
            email: string
            avatar_url?: string
            position?: string
        }
    } | null
}

interface ProjectAssignment {
    id: string
    projectId: string
    projectName: string
    resourceAllocationId: string
    hoursPerWeek: number
    defaultHoursPerDay: number
    allowWeekends: boolean
    startDate: string
    endDate?: string | null
    notes?: string | null
}

interface ProjectWeeklyPlan {
    id: string
    resourceAllocationId: string
    projectId: string
    projectAssignmentId: string
    weekStartDate: string
    hoursSunday: number | null
    hoursMonday: number | null
    hoursTuesday: number | null
    hoursWednesday: number | null
    hoursThursday: number | null
    hoursFriday: number | null
    hoursSaturday: number | null
}

interface Member {
    id: string
    fullName: string
    jobTitle: string
    avatarUrl?: string
    capacity: number // Daily capacity
    allocations: Array<{
        projectId: string
        projectName: string
        hours: number // Default weekly hours
        weeklyHours: number[] // per week allocations aligned with weeksData
        assignmentId?: string // Added to store assignmentId
        defaultHoursPerDay: number // Added to store default hours per day
        allowWeekends: boolean // Added to store weekend allowance
    }>
    hourlyRate?: number // Added hourlyRate
}

interface WeekData {
    weekNumber: string
    startDate: string
    endDate: string
    label: string
}

interface MonthlyCapacityTableProps {
    selectedMonth?: number
    selectedYear?: number
    onAddResource?: () => void
}

interface Project {
    id: string
    name: string
    description?: string
    status: string
}

interface AddProjectForm {
    projectId: string
    hours: number
    includeWeekends: boolean
    startDate: string
    endDate?: string
    notes?: string
}

const fetchResources = async (organizationId: string, userId: string): Promise<ResourceAllocation[]> => {
    if (!organizationId) throw new Error("Organization ID is required")

    const response = await fetch(
        `/api/capacity/resources?organizationId=${organizationId}&userId=${userId}&only_active=true`,
    )

    if (!response.ok) {
        throw new Error(`Failed to fetch resources: ${response.status}`)
    }

    const data = await response.json()
    return data.resources || []
}

const fetchProjectAssignments = async (organizationId: string): Promise<ProjectAssignment[]> => {
    if (!organizationId) return []

    const response = await fetch(`/api/capacity/project-assignments?organizationId=${organizationId}`)
    if (!response.ok) throw new Error("Failed to fetch project assignments")
    const data = await response.json()
    return data.assignments || []
}

const fetchWeeklyPlansForMonth = async (
    organizationId: string,
    month: number,
    year: number,
): Promise<ProjectWeeklyPlan[]> => {
    if (!organizationId) return []

    // Fetch weekly plans for the month
    const response = await fetch(
        `/api/capacity/weekly-plans?organizationId=${organizationId}&month=${month}&year=${year}`,
    )
    if (!response.ok) return []
    const data = await response.json()
    return data.weeklyPlans || []
}

const fetchProjects = async (organizationId: string): Promise<Project[]> => {
    const response = await fetch(`/api/projects?organizationId=${organizationId}`)
    if (!response.ok) throw new Error("Failed to fetch projects")
    const data = await response.json()
    return data.projects || []
}

export default function MonthlyCapacityTable({
    selectedMonth = new Date().getMonth(),
    selectedYear = new Date().getFullYear(),
    onAddResource,
}: MonthlyCapacityTableProps) {
    const queryClient = useQueryClient()
    const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
    const { data: session } = useSession()

    const { currentOrganization } = useOrganizationStore()
    const [deletingTarget, setDeletingTarget] = useState<{
        memberId: string
        projectId: string
        assignmentId?: string // Add this to store assignment ID
        projectName?: string // Add this for better confirmation message
    } | null>(null)
    const [editAssignmentTarget, setEditAssignmentTarget] = useState<ProjectAssignment | null>(null);
    const [addModalTarget, setAddModalTarget] = useState<string | null>(null) // memberId
    const [addForm, setAddForm] = useState<AddProjectForm>({
        projectId: "",
        hours: 8,
        includeWeekends: false,
        startDate: new Date().toISOString().split("T")[0],
    })
    const [editResourceModalOpen, setEditResourceModalOpen] = useState(false)
    const [selectedResourceForEdit, setSelectedResourceForEdit] = useState<any | null>(null)

    const { data: projects = [], isLoading: projectsLoading } = useQuery({
        queryKey: ["projects", currentOrganization?.id],
        queryFn: () => fetchProjects(currentOrganization?.id || ""),
        enabled: !!currentOrganization?.id,
    })

    const formatDateForDisplay = (date: Date): string => {
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
        return `${String(date.getDate()).padStart(2, "0")} ${monthNames[date.getMonth()]}`
    }

    const formatDateRange = (startDate: Date, endDate: Date): string => {
        const startStr = formatDateForDisplay(startDate)
        const endStr = formatDateForDisplay(endDate)
        return `${startStr} - ${endStr}`
    }

    // Use the monthly capacity API instead of separate queries
    const monthStr = `${String(selectedYear)}-${String(selectedMonth + 1).padStart(2, "0")}`
    const {
        data: monthlyCapacityData,
        isLoading: monthlyLoading,
        error: monthlyError,
    } = useMonthlyCapacity(currentOrganization?.id || "", session?.user.id || "", monthStr, {
        only_active: true,
    })

    // Generate weeks for the selected month instead of days
    const weeksData: WeekData[] = useMemo(() => {
        const weeks: WeekData[] = []

        // Get month boundaries
        const monthStart = new Date(selectedYear, selectedMonth, 1)
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0)

        // Find the first Monday on or before month start
        const firstMonday = new Date(monthStart)
        const dayOfWeek = monthStart.getDay()
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        firstMonday.setDate(monthStart.getDate() - daysToSubtract)

        let weekNumber = 1
        let currentWeekStart = new Date(firstMonday)

        // Generate weeks until we've covered the entire month
        while (currentWeekStart <= monthEnd) {
            const weekEnd = new Date(currentWeekStart)
            weekEnd.setDate(currentWeekStart.getDate() + 6) // Sunday

            // Format date range for label
            const startDay = currentWeekStart.getDate()
            const endDay = weekEnd.getDate()
            const dateRangeLabel = `${startDay} -${endDay} `

            weeks.push({
                weekNumber: `Week ${weekNumber} `,
                startDate: currentWeekStart.toISOString(),
                endDate: weekEnd.toISOString(),
                label: dateRangeLabel,
            })

            // Move to next week (next Monday)
            currentWeekStart = new Date(weekEnd)
            currentWeekStart.setDate(weekEnd.getDate() + 1)
            weekNumber++

            // Stop if we've gone past the month end
            if (currentWeekStart > monthEnd && weekNumber > 1) {
                break
            }
        }

        return weeks
    }, [selectedMonth, selectedYear, monthlyCapacityData])

    const addProjectMutation = useMutation({
        mutationFn: async (projectData: any) => {
            const response = await fetch("/api/capacity/project-assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(projectData),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to add project assignment")
            }

            return response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["capacity"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["project-assignments"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["resources"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["overview"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["allocations"], exact: false })
            toast.success("Project assignment added successfully!")
            setAddForm({
                projectId: "",
                hours: 8,
                includeWeekends: false,
                startDate: new Date().toISOString().split("T")[0],
            })
            setAddModalTarget(null)
        },
        onError: (error: Error) => {
            console.error("Project assignment error:", error)
            toast.error(error.message || "Failed to add project assignment")
        },
    })

    const updateProjectAssignmentMutation = useMutation({
        mutationFn: async (data: {
            assignmentId: string;
            hoursPerWeek: number;
            defaultHoursPerDay: number;
            startDate: string;
            endDate: string | null;
            allowWeekends: boolean;
            notes: string | null;
        }) => {
            const response = await fetch("/api/capacity/project-assignments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update project assignment");
            }

            return response.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["capacity"], exact: false });
            await queryClient.invalidateQueries({ queryKey: ["project-assignments"], exact: false });
            await queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
            await queryClient.invalidateQueries({ queryKey: ["overview"], exact: false });
            await queryClient.invalidateQueries({ queryKey: ["allocations"], exact: false });
            toast.success("Project assignment updated successfully!");
            setEditAssignmentTarget(null);
        },
        onError: (error: Error) => {
            console.error("Update project assignment error:", error);
            toast.error(error.message || "Failed to update project assignment");
        },
    });

    const updateWeeklyPlanMutation = useMutation({
        mutationFn: async (data: {
            weeklyPlanId: string
            hoursSunday: number
            hoursMonday: number
            hoursTuesday: number
            hoursWednesday: number
            hoursThursday: number
            hoursFriday: number
            hoursSaturday: number
            isLinked: boolean
        }) => {
            const response = await fetch("/api/capacity/weekly-plans", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to update weekly plan")
            }

            return response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["capacity"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["project-assignments"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["resources"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["overview"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["allocations"], exact: false })
        },
        onError: (error: Error) => {
            console.error("Update weekly plan error:", error)
            toast.error(error.message || "Failed to update weekly plan")
        },
    })

    const {
        data: projectAssignments = [],
        isLoading: assignmentsLoading,
        refetch: refetchAssignments,
    } = useQuery({
        queryKey: ["project-assignments", currentOrganization?.id],
        queryFn: () => fetchProjectAssignments(currentOrganization?.id || ""),
        enabled: !!currentOrganization?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: 'always', // Always refetch when component mounts
    })

    const deleteProjectAssignmentMutation = useMutation({
        mutationFn: async (assignmentId: string) => {
            const response = await fetch(`/api/capacity/project-assignments?assignmentId=${assignmentId} `, {
                method: "DELETE",
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to delete project assignment")
            }

            return response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["capacity"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["project-assignments"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["resources"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["overview"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["allocations"], exact: false })
            toast.success("Project assignment deleted successfully!")
            setDeletingTarget(null)
        },
        onError: (error: Error) => {
            console.error("Delete project assignment error:", error)
            toast.error(error.message || "Failed to delete project assignment")
        },
    })

    // Add delete resource mutation
    const deleteResourceMutation = useMutation({
        mutationFn: async (resourceId: string) => {
            const response = await fetch(`/api/capacity/resources?resourceId=${resourceId} `, {
                method: "DELETE",
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to delete resource")
            }

            return response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["capacity"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["resources"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["project-assignments"], exact: false })
            toast.success("Resource deleted successfully!")
            setDeletingTarget(null)
        },
        onError: (error: Error) => {
            console.error("Delete resource error:", error)
            toast.error(error.message || "Failed to delete resource")
        },
    })

    const createWeeklyPlanMutation = useMutation({
        mutationFn: async (data: {
            organizationId: string
            resourceAllocationId: string
            projectId: string
            projectAssignmentId: string
            weekStartDate: string
            defaultHoursPerDay: number
            allowWeekends: boolean
            hoursSunday: number
            hoursMonday: number
            hoursTuesday: number
            hoursWednesday: number
            hoursThursday: number
            hoursFriday: number
            hoursSaturday: number
        }) => {
            const response = await fetch("/api/capacity/weekly-plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to create weekly plan")
            }

            return response.json()
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["capacity"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["project-assignments"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["resources"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["overview"], exact: false })
            await queryClient.invalidateQueries({ queryKey: ["allocations"], exact: false })
        },
        onError: (error: Error) => {
            console.error("Create weekly plan error:", error)
            toast.error(error.message || "Failed to create weekly plan")
        },
    })

    const handleAddProject = async () => {
        if (!addModalTarget || !addForm.projectId) {
            setAddModalTarget(null)
            return
        }

        try {
            // Step 1: Create the project assignment first
            const daysPerWeek = addForm.includeWeekends ? 7 : 5
            const projectData = {
                organizationId: currentOrganization?.id,
                resourceAllocationId: addModalTarget,
                projectId: addForm.projectId,
                hoursPerWeek: addForm.hours * daysPerWeek, // Convert daily to weekly (7 days if weekends, 5 if not)
                defaultHoursPerDay: addForm.hours,
                allowWeekends: addForm.includeWeekends,
                startDate: new Date().toISOString(),
                // Don't pass weekStartDate here - we'll create all weekly plans separately
            }

            const assignmentResponse = await addProjectMutation.mutateAsync(projectData)
            const projectAssignmentId = assignmentResponse.projectAssignment?.id

            if (!projectAssignmentId) {
                throw new Error("Failed to create project assignment")
            }

            // Step 2: Create weekly plans for ALL weeks in the current month
            const today = startOfDay(new Date())
            const dailyHours = addForm.hours
            const weekdayHours = dailyHours
            const weekendHours = addForm.includeWeekends ? dailyHours : 0

            // Create weekly plans for each week in the month
            const weeklyPlanPromises = weeksData.map(async (week) => {
                const weekStart = startOfDay(parseISO(week.startDate))
                const weekEnd = startOfDay(parseISO(week.endDate))

                const weekMonday = startOfWeek(weekStart, { weekStartsOn: 1 })

                // Calculate the Sunday of this week (6 days after Monday)
                const weekSunday = addDays(weekMonday, 6)

                // Calculate hours for each day of the week
                let hoursSunday = 0
                let hoursMonday = 0
                let hoursTuesday = 0
                let hoursWednesday = 0
                let hoursThursday = 0
                let hoursFriday = 0
                let hoursSaturday = 0

                // Get all days in this week
                const weekDays = eachDayOfInterval({
                    start: weekMonday,
                    end: weekSunday,
                })

                weekDays.forEach((day) => {
                    const dayOfWeek = getDay(day) // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                    const isDayPast = isPast(day) && !isToday(day)

                    // If day is in the past, set hours to 0
                    if (isDayPast) {
                        return // Hours already initialized to 0
                    }

                    // If day is today or in the future, set hours based on day type
                    if (dayOfWeek === 0) {
                        // Sunday
                        hoursSunday = weekendHours
                    } else if (dayOfWeek === 1) {
                        // Monday
                        hoursMonday = weekdayHours
                    } else if (dayOfWeek === 2) {
                        // Tuesday
                        hoursTuesday = weekdayHours
                    } else if (dayOfWeek === 3) {
                        // Wednesday
                        hoursWednesday = weekdayHours
                    } else if (dayOfWeek === 4) {
                        // Thursday
                        hoursThursday = weekdayHours
                    } else if (dayOfWeek === 5) {
                        // Friday
                        hoursFriday = weekdayHours
                    } else if (dayOfWeek === 6) {
                        // Saturday
                        hoursSaturday = weekendHours
                    }
                })

                console.log("weekStartDate", weekMonday.toISOString())

                // Create weekly plan via API
                const weeklyPlanResponse = await fetch("/api/capacity/weekly-plans", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        organizationId: currentOrganization?.id,
                        resourceAllocationId: addModalTarget,
                        projectId: addForm.projectId,
                        projectAssignmentId: projectAssignmentId,
                        weekStartDate: weekMonday.toISOString(),
                        defaultHoursPerDay: dailyHours,
                        allowWeekends: addForm.includeWeekends,
                        // Override daily hours based on past/current/future logic
                        hoursSunday,
                        hoursMonday,
                        hoursTuesday,
                        hoursWednesday,
                        hoursThursday,
                        hoursFriday,
                        hoursSaturday,
                    }),
                })

                if (!weeklyPlanResponse.ok) {
                    const errorData = await weeklyPlanResponse.json()
                    throw new Error(errorData.error || "Failed to create weekly plan")
                }

                return weeklyPlanResponse.json()
            })

            // Wait for all weekly plans to be created
            await Promise.all(weeklyPlanPromises)

            // Refresh the monthly capacity query
            queryClient.invalidateQueries({ queryKey: ["capacity", "monthly"] })

            toast.success("Project assignment and weekly plans created successfully!")
            setAddForm({
                projectId: "",
                hours: 8,
                includeWeekends: false,
                startDate: new Date().toISOString().split("T")[0],
            })
            setAddModalTarget(null)
        } catch (error: any) {
            console.error("Add project error:", error)
            toast.error(error.message || "Failed to add project assignment")
        }
    }

    const {
        data: resources,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["resources", currentOrganization?.id],
        queryFn: () => fetchResources(currentOrganization?.id || "", session?.user.id || ""),
        enabled: !!currentOrganization?.id, // Only fetch when organization ID is available
        staleTime: 5 * 60 * 1000, // 5 minutes
    })

    // Weekly plans are now included in monthlyCapacityData



    const getUtilizationColor = (allocated: number, capacity: number) => {
        const percentage = (allocated / capacity) * 100
        if (percentage > 100) return "bg-red-500"
        if (percentage >= 80) return "bg-yellow-500"
        if (percentage >= 60) return "bg-green-500"
        return "bg-yellow-500"
    }

    const getUtilizationTextColor = (allocated: number, capacity: number) => {
        const percentage = (allocated / capacity) * 100
        if (percentage > 100) return "text-red-700"
        if (percentage >= 80) return "text-yellow-700"
        if (percentage >= 60) return "text-green-700"
        return "text-yellow-700"
    }

    const getStatusLabel = (allocated: number, capacity: number) => {
        const percentage = (allocated / capacity) * 100
        if (percentage > 100) return `(${Math.round(percentage - 100)} % over)`
        return ""
    }

    const toggleMemberExpansion = (memberId: string) => {
        setExpandedMembers((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(memberId)) {
                newSet.delete(memberId)
            } else {
                newSet.add(memberId)
            }
            return newSet
        })
    }



    const members: Member[] = useMemo(() => {
        if (!monthlyCapacityData?.resources) return []

        return monthlyCapacityData.resources.map((resource: any) => {
            const userInfo = resource.user
            const resourceId = resource.resource_allocation_id

            // 1. Get all assignments for this resource
            const assignmentsForResource = projectAssignments.filter((pa: any) => pa.resourceAllocationId === resourceId)

            // 2. Map assignments to allocations
            const allocations = assignmentsForResource.map((assignment: any) => {
                const projectId = assignment.projectId
                const projectName = assignment.projectName || "Unknown Project"

                // Initialize weekly hours for all weeks in weeksData
                const weeklyHours = new Array(weeksData.length).fill(0)

                // 3. Fill in hours from monthlyCapacityData.resources[].weeks
                resource.weeks.forEach((week: any, weekIndex: number) => {
                    // Look for this project in the API's week data
                    const projectData = week.projects?.find((p: any) => p.project?.id === projectId)

                    if (projectData) {
                        weeklyHours[weekIndex] = projectData.weekly_hours || 0
                    }
                })

                const avgHours = weeklyHours.reduce((sum, h) => sum + h, 0) / weeklyHours.length || 0

                return {
                    projectId,
                    projectName,
                    hours: avgHours,
                    weeklyHours,
                    assignmentId: assignment.id,
                    defaultHoursPerDay: assignment.defaultHoursPerDay || 0,
                    allowWeekends: assignment.allowWeekends || false,
                }
            })


            // Get role name and format it properly
            const roleName = resource.role_name || resource.role;
            let formattedRole = 'Team Member';

            if (roleName) {
                // Special case: if role is just "member", make it "Team Member"
                if (roleName.toLowerCase() === 'member') {
                    formattedRole = 'Team Member';
                } else {
                    formattedRole = roleName.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }
            }

            return {
                id: resourceId,
                fullName: userInfo?.full_name || "Unknown User",
                jobTitle: userInfo?.position || formattedRole,
                avatarUrl: userInfo?.avatar_url,
                capacity: resource.weekly_capacity_hours / 5,
                hourlyRate: resource.hourly_rate,
                allocations,
            }
        })
    }, [monthlyCapacityData, weeksData, projectAssignments])

    console.log("[v0] Monthly Table Members mapped:", members)

    // Calculate total monthly capacity
    const totalMonthlyCapacity = useMemo(() => {
        const monthStart = new Date(selectedYear, selectedMonth, 1)
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0)
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
        const workingDays = allDays.filter((day) => !isWeekend(day)).length

        return members.reduce((sum, member) => {
            // Monthly capacity = daily capacity × working days in month
            return sum + member.capacity * workingDays
        }, 0)
    }, [members, selectedMonth, selectedYear])

    const totalMonthlyAllocated = useMemo(() => {
        if (monthlyCapacityData?.resources) {
            // Use API data - sum all used hours across all resources and weeks
            return monthlyCapacityData.resources.reduce((sum: number, resource: any) => {
                const resourceTotal = resource.weeks.reduce((weekSum: number, week: any) => {
                    return weekSum + (week.used || 0)
                }, 0)
                return sum + resourceTotal
            }, 0)
        }

        // Fallback to members calculation
        return members.reduce((sum, member) => {
            const memberAllocated = member.allocations.reduce((allocSum, allocation) => {
                // Sum all weekly hours
                const weeklyTotal = allocation.weeklyHours.reduce((weekSum, hours) => {
                    return weekSum + Number(hours)
                }, 0)
                return allocSum + weeklyTotal
            }, 0)
            return sum + memberAllocated
        }, 0)
    }, [members, monthlyCapacityData])

    const totalMonthlyAvailable = totalMonthlyCapacity - totalMonthlyAllocated

    if (monthlyLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Loading capacity data...</div>
            </div>
        )
    }

    if (monthlyError) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-red-600">
                    Error: {monthlyError instanceof Error ? monthlyError.message : "Failed to load capacity data"}
                </div>
            </div>
        )
    }

    if (members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="text-lg text-gray-600">No resources allocated yet</div>
                <button onClick={onAddResource} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Add First Resource
                </button>
            </div>
        )
    }

    return (
        <>
            {/* Capacity Overview */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Monthly Capacity Overview</h2>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Total Monthly Capacity:</span>
                        <span className="text-sm font-medium text-gray-900">{totalMonthlyCapacity}h</span>
                        <span className="text-sm text-gray-500">|</span>
                        <span className="text-sm text-gray-500">Monthly Allocated:</span>
                        <span className="text-sm font-medium text-gray-900">{totalMonthlyAllocated}h</span>
                        <span className="text-sm text-gray-500">|</span>
                        <span className="text-sm text-gray-500">Available:</span>
                        <span className="text-sm font-medium text-green-600">{totalMonthlyAvailable}h</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <ConfirmationModal
                    isOpen={Boolean(deletingTarget)}
                    onClose={() => setDeletingTarget(null)}
                    onConfirm={async () => {
                        if (!deletingTarget) return

                        try {
                            if (deletingTarget.assignmentId) {
                                // Delete project assignment
                                await deleteProjectAssignmentMutation.mutateAsync(deletingTarget.assignmentId)
                            } else if (deletingTarget.memberId && !deletingTarget.projectId) {
                                // Delete resource (member)
                                // When deleting a resource, we use the resourceId (which is mapped to memberId in our loop)
                                await deleteResourceMutation.mutateAsync(deletingTarget.memberId)
                            }
                        } catch (error) {
                            // Error is handled by mutation
                        }
                    }}
                    title={deletingTarget?.projectId ? "Delete Project Assignment" : "Delete Resource"}
                    message={
                        deletingTarget?.projectId
                            ? `Are you sure you want to delete the project assignment "${deletingTarget.projectName}" ? This will permanently delete the assignment and all related weekly plans.This action cannot be undone.`
                            : `Are you sure you want to remove ${deletingTarget?.projectName || "this resource"}? This will delete all project assignments and capacity data for this user.This action cannot be undone.`
                    }
                    isLoading={deleteProjectAssignmentMutation.isPending || deleteResourceMutation.isPending}
                />
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                RESOURCE
                            </th>
                            <th className="text-left px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                MONTHLY CAPACITY
                            </th>
                            {weeksData.map((week) => {
                                const weekStartDate = new Date(week.startDate)
                                const weekEndDate = new Date(week.endDate)
                                const dateRangeTooltip = formatDateRange(weekStartDate, weekEndDate)

                                return (
                                    <th
                                        key={week.weekNumber}
                                        className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help"
                                        title={dateRangeTooltip}
                                    >
                                        <div>{week.weekNumber}</div>
                                        <div className="text-xs text-gray-400">{week.label}</div>
                                    </th>
                                )
                            })}
                            <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {members.map((member, idx) => {
                            const memberId = member.id
                            const isExpanded = expandedMembers.has(memberId)

                            // Calculate monthly capacity: count working days in the month
                            const monthStart = new Date(selectedYear, selectedMonth, 1)
                            const monthEnd = new Date(selectedYear, selectedMonth + 1, 0)
                            const allDays = eachDayOfInterval({
                                start: monthStart,
                                end: monthEnd,
                            })
                            const workingDays = allDays.filter((day) => !isWeekend(day)).length
                            const monthlyCapacity = member.capacity * workingDays

                            const totalAllocated = member.allocations.reduce((sum, allocation) => {
                                // Sum all weekly hours for this allocation across all weeks
                                const allocationTotal = (allocation.weeklyHours || []).reduce(
                                    (weekSum, hours) => weekSum + (Number(hours) || 0),
                                    0,
                                )
                                return sum + allocationTotal
                            }, 0)

                            const utilizationPercentage = monthlyCapacity > 0 ? (totalAllocated / monthlyCapacity) * 100 : 0
                            const statusLabel = getStatusLabel(totalAllocated, monthlyCapacity)

                            return (
                                <React.Fragment key={memberId}>
                                    {/* Member Header Row */}
                                    <tr className="bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => toggleMemberExpansion(memberId)}
                                                    className="mr-2 p-1 hover:bg-gray-200 rounded"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4 text-gray-500" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-gray-500" />
                                                    )}
                                                </button>
                                                <div>
                                                    <div className="font-medium text-gray-900">{member.fullName}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {member.jobTitle}
                                                        {member.hourlyRate && (
                                                            <span className="ml-2 text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                                                ${Number(member.hourlyRate).toFixed(2)}/hr
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-xs font-semibold text-gray-500">
                                                {totalAllocated.toFixed(1)}/{monthlyCapacity.toFixed(1)} h
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 relative">
                                                    <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${getUtilizationColor(totalAllocated, member.capacity)} `}
                                                            style={{
                                                                width: `${Math.min(utilizationPercentage, 100)}%`,
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 min-w-[100px]">
                                                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                        {Math.round(utilizationPercentage)}%
                                                    </span>
                                                    {statusLabel && (
                                                        <span
                                                            className={`text - xs font - medium whitespace-nowrap ${getUtilizationTextColor(totalAllocated, member.capacity)} `}
                                                        >
                                                            {statusLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {weeksData.map((week, weekIndex) => {
                                            // In monthly view with weekly columns, calculate total weekly hours for all projects
                                            const totalWeeklyAllocated = member.allocations.reduce((sum, allocation) => {
                                                // Calculate weekly hours based on whether weekends are allowed
                                                const daysPerWeek = allocation.allowWeekends ? 7 : 5
                                                const weeklyHours = (allocation.defaultHoursPerDay || 0) * daysPerWeek
                                                return sum + weeklyHours
                                            }, 0);

                                            const hasWeekendAllocation = member.allocations.some((a) => a.allowWeekends)
                                            const weekCapacity = member.capacity * (hasWeekendAllocation ? 7 : 5)
                                            const weekUtilization = weekCapacity > 0 ? (totalWeeklyAllocated / weekCapacity) * 100 : 0

                                            return (
                                                <td key={week.weekNumber} className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div
                                                            className={`inline-block px-3 py-1 rounded text-white text-sm font - medium ${getUtilizationColor(
                                                                totalWeeklyAllocated,
                                                                weekCapacity,
                                                            )
                                                                } `}
                                                        >
                                                            {totalWeeklyAllocated.toFixed(1)}h
                                                        </div>
                                                        <div className="text-xs text-gray-500">{weekUtilization.toFixed(0)}%</div>
                                                    </div>
                                                </td>
                                            )
                                        })}
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                                                    title="Edit Resource"
                                                    onClick={() => {
                                                        // Find the raw resource object from monthlyCapacityData to pass to modal
                                                        const rawResource = monthlyCapacityData?.resources?.find(
                                                            (r: any) => r.resource_allocation_id === member.id
                                                        ) as any
                                                        if (rawResource) {
                                                            setSelectedResourceForEdit({
                                                                id: member.id,
                                                                fullName: member.fullName,
                                                                email: rawResource.user?.email,
                                                                role: member.jobTitle,
                                                                weeklyCapacityHours: rawResource.weekly_capacity_hours,
                                                                hourlyRate: rawResource.hourly_rate,
                                                                isActive: rawResource.is_active,
                                                            })
                                                            setEditResourceModalOpen(true)
                                                        }
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                                                    title="Remove Resource"
                                                    onClick={() => {
                                                        setDeletingTarget({
                                                            memberId: member.id,
                                                            projectId: "", // Empty string means regular resource deletion
                                                            projectName: member.fullName,
                                                        })
                                                    }}
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Project Rows */}
                                    {isExpanded &&
                                        member.allocations.map((allocation) => (
                                            <tr key={allocation.projectId} className="bg-gray-25">
                                                <td className="px-6 py-3 pl-12">
                                                    <div className="flex flex-col">
                                                        <div className="font-medium text-gray-700">{allocation.projectName}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {(allocation.defaultHoursPerDay * (allocation.allowWeekends ? 7 : 5)).toFixed(1)}h/week
                                                            {allocation.allowWeekends ? " (includes weekends)" : " (weekdays only)"}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3"></td>
                                                {weeksData.map((week, weekIdx) => {
                                                    // In monthly view with weekly columns, always show hours (no weekend detection needed)
                                                    const displayHours = (allocation.defaultHoursPerDay * (allocation.allowWeekends ? 7 : 5)) || 0;

                                                    return (
                                                        <td
                                                            key={week.weekNumber}
                                                            className="px-4 py-3 text-center"
                                                        >
                                                            {displayHours > 0 ? (
                                                                <div className="flex justify-center">
                                                                    <div className="min-w-[40px] h-10 px-2 flex items-center justify-center bg-orange-400 text-white font-bold rounded text-sm shadow-sm">
                                                                        {displayHours.toFixed(1)}h
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-300 text-sm">-</div>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                                <td className="px-4 py-3 text-center">
                                                    <div className="inline-flex items-center gap-3">
                                                        <button
                                                            onClick={() => {
                                                                const assignment = projectAssignments.find(
                                                                    (pa: ProjectAssignment) =>
                                                                        pa.resourceAllocationId === memberId &&
                                                                        pa.projectId === allocation.projectId
                                                                );
                                                                if (assignment) {
                                                                    setEditAssignmentTarget(assignment);
                                                                } else {
                                                                    toast.error("Project assignment not found");
                                                                }
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Edit project assignment settings"
                                                        >
                                                            <Settings className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDeletingTarget({
                                                                    memberId: member.id,
                                                                    projectId: allocation.projectId,
                                                                    projectName: allocation.projectName,
                                                                    assignmentId: allocation.assignmentId,
                                                                })
                                                            }}
                                                            className="text-red-600 hover:text-red-800"
                                                            title="Delete project assignment"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                    {/* Add Project Row */}
                                    {isExpanded && (
                                        <tr>
                                            <td className="px-6 py-3 pl-12" colSpan={weeksData.length + 3}>
                                                <button
                                                    onClick={() => {
                                                        setAddModalTarget(memberId)
                                                        setAddForm({
                                                            hours: 1,
                                                            projectId: "",
                                                            includeWeekends: false,
                                                            startDate: new Date().toISOString().split("T")[0],
                                                        })
                                                    }}
                                                    className="flex items-center text-orange-600 hover:text-orange-800 text-sm font-medium"
                                                >
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Add Project
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {addModalTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Add Project</h3>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                                <select
                                    value={addForm.projectId}
                                    onChange={(e) => setAddForm({ ...addForm, projectId: e.target.value })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="">Select a project</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hours per workday</label>
                                <input
                                    type="number"
                                    className="w-32 border border-gray-300 rounded px-3 py-2 text-sm"
                                    min={0}
                                    max={24}
                                    step={0.5}
                                    value={addForm.hours}
                                    onChange={(e) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            hours: Math.max(0, Number(e.target.value)),
                                        }))
                                    }
                                />
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={addForm.includeWeekends}
                                    onChange={(e) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            includeWeekends: e.target.checked,
                                        }))
                                    }
                                />
                                Enable weekends
                            </label>
                        </div>
                        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                                onClick={() => {
                                    setAddModalTarget(null)
                                    setAddForm({
                                        projectId: "",
                                        hours: 8,
                                        includeWeekends: false,
                                        startDate: new Date().toISOString().split("T")[0],
                                    })
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                onClick={handleAddProject}
                                disabled={addProjectMutation.isPending || !addForm.projectId}
                            >
                                {addProjectMutation.isPending ? "Adding..." : "Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Edit Resource Modal */}
            {selectedResourceForEdit && (
                <EditResourceModal
                    isOpen={editResourceModalOpen}
                    onClose={() => {
                        setEditResourceModalOpen(false)
                        setSelectedResourceForEdit(null)
                    }}
                    resource={selectedResourceForEdit}
                />
            )}

            {editAssignmentTarget && (
                <ProjectAssignmentModal
                    isOpen={true}
                    onClose={() => setEditAssignmentTarget(null)}
                    onSubmit={async (data) => {
                        await updateProjectAssignmentMutation.mutateAsync({
                            assignmentId: editAssignmentTarget.id,
                            hoursPerWeek: data.hours * (data.includeWeekends ? 7 : 5),
                            defaultHoursPerDay: data.hours,
                            startDate: data.startDate,
                            endDate: data.endDate || null,
                            allowWeekends: data.includeWeekends,
                            notes: data.notes,
                        });
                    }}
                    title="Edit Project Assignment"
                    initialData={{
                        projectId: editAssignmentTarget.projectId,
                        hours: editAssignmentTarget.defaultHoursPerDay,
                        includeWeekends: editAssignmentTarget.allowWeekends,
                        startDate: editAssignmentTarget.startDate.split('T')[0],
                        endDate: editAssignmentTarget.endDate ? editAssignmentTarget.endDate.split('T')[0] : "",
                        notes: editAssignmentTarget.notes || "",
                    }}
                    projects={projects}
                    isSubmitting={updateProjectAssignmentMutation.isPending}
                />
            )}
        </>
    )
}
