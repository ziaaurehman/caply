import { prisma } from "@/lib/prisma";
import { sendBudgetAlertEmail } from "@/lib/email";

/**
 * Checks if a project's budget utilization has exceeded 70% and sends an alert if so.
 * This should be called after adding or updating project assignments.
 */
export async function checkProjectBudget(projectId: string): Promise<void> {
    try {
        // 1. Fetch Project Details (Budget & Owner)
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                organization: {
                    include: {
                        owner: true,
                    },
                },
                creator: true,
            },
        });

        if (!project || !project.budgetHours || project.budgetHours <= 0) {
            return; // No budget defined, skip check
        }

        // 2. Calculate Total Assigned Hours
        // We sum up the 'hoursPerWeek' for all active assignments.
        // NOTE: This assumes 'budgetHours' is a total bucket for the project lifetime.
        // If budget is weekly, this logic might need adjustment, but usually budgetHours is total.
        // For a more accurate "used" calculation, we might want to check TimeEntries (actuals).
        // However, specifically for "Capacity Planning", we care about "Planned vs Budget".

        // Let's sum up total planned hours.
        // Since assignments are "per week" and have start/end dates, calculating "total committed hours" 
        // is complex (weeks * hours/week).
        // SIMPLIFICATION: The user request is likely about the "Total Assigned" vs "Budget".
        // Many systems treat "budget" as "total allowed hours".
        // Let's try to estimate total committed hours based on assignment duration.

        const assignments = await prisma.projectAssignment.findMany({
            where: {
                projectId: projectId,
                isActive: true,
            },
        });

        let totalPlannedHours = 0;

        for (const assignment of assignments) {
            if (assignment.startDate && assignment.endDate) {
                // Calculate weeks between start and end
                const start = new Date(assignment.startDate);
                const end = new Date(assignment.endDate);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const weeks = Math.ceil(diffDays / 7) || 1; // At least 1 week

                totalPlannedHours += (Number(assignment.hoursPerWeek) * weeks);
            } else {
                // Infinite assignment? Treat as significant usage or ignore duration?
                // Fallback: assume 4 weeks (1 month) if no end date, or just user current weekly hours (which is wrong for total budget).
                // Let's stick to a safe bet: if no end date, we can't easily calculate "total committed".
                // BUT, maybe the user just wants to know if the *planned* hours *so far* (actuals + future plan) > budget?
                // For this iteration, let's use a robust estimate:
                // If no end date, assume 12 weeks (quarterly).
                totalPlannedHours += (Number(assignment.hoursPerWeek) * 12);
            }
        }

        const usagePercentage = (totalPlannedHours / project.budgetHours) * 100;

        console.log(`[BudgetCheck] Project: ${project.name}, Budget: ${project.budgetHours}, Planned: ${totalPlannedHours}, Usage: ${usagePercentage}%`);

        if (usagePercentage > 70) {
            const adminUser = project.organization.owner; // Send to Org Owner

            if (adminUser && adminUser.email) {
                console.log(`[BudgetAlert] Triggering email to ${adminUser.email}`);

                await sendBudgetAlertEmail({
                    email: adminUser.email,
                    name: adminUser.fullName || "Admin",
                    projectName: project.name,
                    budgetHours: project.budgetHours,
                    currentUsageHours: totalPlannedHours,
                    utilizationPercentage: usagePercentage
                });
            }
        }

    } catch (error) {
        console.error("Error checking project budget:", error);
    }
}
