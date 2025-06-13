import { Card } from "../ui/Card"
import { Clock, Calendar, Users, BarChart, DollarSign, FileText } from "lucide-react"

export default function Features() {
  const features = [
    {
      icon: Clock,
      title: "Time Tracking & Approval",
      description: "Effortlessly track time across projects with automated approval workflows",
      image: "https://images.pexels.com/photos/3183153/pexels-photo-3183153.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      icon: Calendar,
      title: "Capacity Planning",
      description: "Optimize resource allocation and prevent team burnout",
      image: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      icon: Users,
      title: "Leave Management",
      description: "Streamline time-off requests and approvals",
      image: "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      icon: BarChart,
      title: "Project Management",
      description: "Keep projects on track with Kanban boards and milestones",
      image: "https://images.pexels.com/photos/3183186/pexels-photo-3183186.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      icon: DollarSign,
      title: "Budget vs Actual",
      description: "Real-time tracking of project costs and revenue",
      image: "https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      icon: FileText,
      title: "Custom Reports",
      description: "Generate detailed P&L and workload reports",
      image: "https://images.pexels.com/photos/3183165/pexels-photo-3183165.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Everything you need to manage your team</h2>
          <p className="mt-4 text-lg text-gray-500">Streamline your operations with our comprehensive suite of tools</p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="bg-white overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 rounded-lg"
            >
              <div className="aspect-w-16 aspect-h-9 relative">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary-100 text-primary-600">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="ml-4 text-lg font-medium text-gray-900">{feature.title}</h3>
                </div>
                <p className="mt-4 text-gray-500">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
