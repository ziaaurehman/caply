import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authConfig);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("query");
        const organizationId = searchParams.get("organizationId");

        if (!query || query.length < 2) {
            return NextResponse.json({ results: { projects: [], members: [], clients: [] } });
        }

        if (!organizationId) {
            return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
        }

        // Parallelize search queries
        const [projects, members, clients] = await Promise.all([
            // Search Projects
            prisma.project.findMany({
                where: {
                    organizationId,
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { code: { contains: query, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                },
                take: 5,
            }),

            // Search Team Members (via OrganizationMember -> User)
            prisma.organizationMember.findMany({
                where: {
                    organizationId,
                    user: {
                        OR: [
                            { fullName: { contains: query, mode: "insensitive" } },
                            { email: { contains: query, mode: "insensitive" } },
                        ],
                    },
                },
                select: {
                    id: true,
                    user: {
                        select: {
                            id: true, // User ID needed for profile links usually, or we link to member management? 
                            // Usually profile links are /team/[id] or similar. Let's return useful bits.
                            fullName: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    role: true,
                },
                take: 5,
            }),

            // Search Clients
            prisma.client.findMany({
                where: {
                    organizationId,
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { email: { contains: query, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
                take: 5,
            }),
        ]);

        return NextResponse.json({
            results: {
                projects,
                members: members.map(m => ({
                    id: m.id,
                    userId: m.user.id,
                    name: m.user.fullName,
                    email: m.user.email,
                    email: m.user.email,
                    avatarUrl: m.user.avatarUrl,
                    role: m.role?.displayName || m.role?.name || "Member",
                })),
                clients,
            },
        });

    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
