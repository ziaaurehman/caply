"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import { Shield, UserPlus, Settings as SettingsIcon, Users, Key, Mail } from "lucide-react"
import Link from "next/link"
import { AdminOnly, ManagerOrAbove } from "@/components/ui/rbac/ProtectedComponent"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure your application and manage access control</p>
      </div>

      {/* RBAC Management Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AdminOnly>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Shield className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Role Management</CardTitle>
                  <p className="text-sm text-gray-500">Manage roles and permissions</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Create and configure roles with specific permissions for your organization.
              </p>
              <Link href="/settings/roles">
                <Button variant="outline" className="w-full">
                  Manage Roles
                </Button>
              </Link>
            </CardContent>
          </Card>
        </AdminOnly>

        <ManagerOrAbove>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">User Invitations</CardTitle>
                  <p className="text-sm text-gray-500">Invite team members</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Send invitations to new team members and manage pending invitations.
              </p>
              <Link href="/settings/invitations">
                <Button variant="outline" className="w-full">
                  Manage Invitations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </ManagerOrAbove>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Team Members</CardTitle>
                <p className="text-sm text-gray-500">View team members</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View and manage your organization's team members and their roles.
            </p>
            <Link href="/employees">
              <Button variant="outline" className="w-full">
                View Team
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* General Settings Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <SettingsIcon className="h-5 w-5 text-gray-600" />
                <CardTitle>Application Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Time Zone</p>
                    <p className="text-sm text-gray-500">Configure your organization's timezone</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Currency</p>
                    <p className="text-sm text-gray-500">Set default currency for estimates and invoices</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Working Hours</p>
                    <p className="text-sm text-gray-500">Set default working hours for capacity planning</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-600" />
                <CardTitle>Notification Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Configure email notification preferences</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Slack Integration</p>
                    <p className="text-sm text-gray-500">Connect with Slack for notifications</p>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Microsoft Teams</p>
                    <p className="text-sm text-gray-500">Connect with Teams for notifications</p>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Security Settings */}
      <AdminOnly>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security & Compliance</h2>
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Key className="h-5 w-5 text-gray-600" />
                <CardTitle>Security Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Require 2FA for all users</p>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Enabled</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Session Timeout</p>
                      <p className="text-sm text-gray-500">Automatic logout after inactivity</p>
                    </div>
                    <select className="text-sm border rounded px-2 py-1">
                      <option>30 minutes</option>
                      <option>1 hour</option>
                      <option>4 hours</option>
                      <option>8 hours</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Password Policy</p>
                      <p className="text-sm text-gray-500">Enforce strong password requirements</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Audit Logs</p>
                      <p className="text-sm text-gray-500">View security and access logs</p>
                    </div>
                    <Button variant="outline" size="sm">View Logs</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminOnly>
    </div>
  )
}
