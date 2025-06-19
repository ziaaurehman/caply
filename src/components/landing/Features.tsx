import {
  Clock,
  Calendar,
  Users,
  BarChart,
  DollarSign,
  FileText,
} from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      id: 1,
      icon: Clock,
      title: "Time Tracking & Approval",
      description:
        "Effortlessly track time across projects with automated approval workflows. Monitor productivity, set billable hours, and streamline your team's time management process.",
      bulletPoints: [
        "Automated time tracking",
        "Approval workflows",
        "Billable hours tracking",
        "Productivity monitoring",
      ],
      position: "right",
      image:
        "https://images.pexels.com/photos/3183153/pexels-photo-3183153.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      id: 2,
      icon: Calendar,
      title: "Capacity Planning",
      description:
        "Optimize resource allocation and prevent team burnout with intelligent capacity planning. Balance workloads and ensure optimal team performance.",
      bulletPoints: [
        "Resource allocation optimization",
        "Workload balancing",
        "Team burnout prevention",
        "Performance analytics",
      ],
      position: "left",
      image:
        "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      id: 3,
      icon: Users,
      title: "Leave Management",
      description:
        "Streamline time-off requests and approvals with our comprehensive leave management system. Track vacation days, sick leave, and maintain team coverage.",
      bulletPoints: [
        "Time-off request system",
        "Automated approvals",
        "Leave balance tracking",
        "Team coverage planning",
      ],
      position: "right",
      image:
        "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      id: 4,
      icon: BarChart,
      title: "Project Management",
      description:
        "Keep projects on track with Kanban boards and milestones. Visualize progress, manage tasks, and ensure timely delivery of all your projects.",
      bulletPoints: [
        "Kanban board visualization",
        "Milestone tracking",
        "Task management",
        "Progress monitoring",
      ],
      position: "left",
      image:
        "https://images.pexels.com/photos/3183186/pexels-photo-3183186.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      id: 5,
      icon: DollarSign,
      title: "Budget vs Actual",
      description:
        "Real-time tracking of project costs and revenue. Monitor budgets, track expenses, and maintain profitability across all your projects.",
      bulletPoints: [
        "Real-time cost tracking",
        "Revenue monitoring",
        "Budget management",
        "Profitability analysis",
      ],
      position: "right",
      image:
        "https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      id: 6,
      icon: FileText,
      title: "Custom Reports",
      description:
        "Generate detailed P&L and workload reports. Create custom analytics, export data, and gain insights into your business performance.",
      bulletPoints: [
        "P&L report generation",
        "Workload analytics",
        "Custom report builder",
        "Data export capabilities",
      ],
      position: "left",
      image:
        "https://www.bestassignmentwriters.co.uk/blog/wp-content/uploads/2020/01/6-main-types-of-report-writing.jpg",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-12 sm:px-6 lg:px-8  bg-gray-50 min-h-screen">
      <div className="text-center py-12">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Everything you need to manage your team
        </h2>
        <p className="mt-4 text-lg text-gray-500">
          Streamline your operations with our comprehensive suite of tools
        </p>
      </div>

      <div className="relative">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div key={feature.id} className="relative mb-16 sm:mb-24 lg:mb-32">
              {/* Feature Content */}
              <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 lg:gap-8 items-center">
                {/* Mobile Layout - Always stacked */}
                <div className="lg:hidden">
                  {/* Image */}
                  <div className="mb-6">
                    <img
                      src={feature.image || "/placeholder.svg"}
                      alt={`${feature.title} illustration`}
                      className="w-full h-48 sm:h-56 object-cover rounded-lg shadow-lg"
                    />
                  </div>

                  {/* Content */}
                  <div className="border-2 border-dashed border-primary-300 bg-primary-50/30 p-6 sm:p-8 rounded-lg">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-primary-500">
                        {feature.title}
                      </h2>
                    </div>
                    <p className="text-gray-700 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                      {feature.description}
                    </p>
                    <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                      {feature.bulletPoints.map((point, pointIndex) => (
                        <li
                          key={pointIndex}
                          className="flex items-start text-gray-700 text-sm sm:text-base"
                        >
                          <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                          {point}
                        </li>
                      ))}
                    </ul>
                   
                  </div>
                </div>

                {/* Desktop Layout - Alternating */}
                {feature.position === "right" ? (
                  <>
                    {/* Image on left side - Desktop only */}
                    <div className="hidden lg:block lg:col-span-5">
                      <div className="w-full max-w-md mx-auto">
                        <img
                          src={feature.image || "/placeholder.svg"}
                          alt={`${feature.title} illustration`}
                          className="w-full h-64 object-cover rounded-lg shadow-lg"
                        />
                      </div>
                    </div>

                    {/* Content on right - Desktop only */}
                    <div className="hidden lg:block lg:col-span-6">
                      <div className="border-2 border-dashed border-primary-300 bg-primary-50/30 p-8 rounded-lg">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <h2 className="text-4xl font-light text-primary-500">
                            {feature.title}
                          </h2>
                        </div>
                        <p className="text-gray-700 mb-6 leading-relaxed text-base">
                          {feature.description}
                        </p>
                        <ul className="space-y-3 mb-8">
                          {feature.bulletPoints.map((point, pointIndex) => (
                            <li
                              key={pointIndex}
                              className="flex items-start text-gray-700"
                            >
                              <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                              {point}
                            </li>
                          ))}
                        </ul>
                       
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Content on left - Desktop only */}
                    <div className="hidden lg:block lg:col-span-6">
                      <div className="border-2 border-dashed border-primary-300 bg-primary-50/30 p-8 rounded-lg">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <h2 className="text-4xl font-light text-primary-500">
                            {feature.title}
                          </h2>
                        </div>
                        <p className="text-gray-700 mb-6 leading-relaxed text-base">
                          {feature.description}
                        </p>
                        <ul className="space-y-3 mb-8">
                          {feature.bulletPoints.map((point, pointIndex) => (
                            <li
                              key={pointIndex}
                              className="flex items-start text-gray-700"
                            >
                              <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                              {point}
                            </li>
                          ))}
                        </ul>
                       
                      </div>
                    </div>

                    {/* Image on right side - Desktop only */}
                    <div className="hidden lg:block lg:col-span-5">
                      <div className="w-full max-w-md mx-auto">
                        <img
                          src={feature.image || "/placeholder.svg"}
                          alt={`${feature.title} illustration`}
                          className="w-full h-64 object-cover rounded-lg shadow-lg"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Connecting SVG Lines - Desktop only */}
              {index < features.length - 1 && (
                <div className="hidden lg:block absolute -bottom-16 left-0 w-full h-16 overflow-visible">
                  {feature.position === "right" ? (
                    // From right to left connection
                    <svg
                      className="absolute top-0 right-0 w-full h-32"
                      viewBox="0 0 1000 120"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ transform: "translateY(0)" }}
                    >
                      <path
                        d="M650 1V60H350V120"
                        stroke="url(#paint0_linear_right_to_left)"
                        strokeWidth="2"
                        strokeDasharray="10 10"
                      />
                      <defs>
                        <linearGradient
                          id="paint0_linear_right_to_left"
                          x1="500"
                          y1="1"
                          x2="500"
                          y2="120"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#F97316" />
                          <stop offset="1" stopColor="#FB923C" />
                        </linearGradient>
                      </defs>
                    </svg>
                  ) : (
                    // From left to right connection
                    <svg
                      className="absolute top-0 left-0 w-full h-32"
                      viewBox="0 0 1000 120"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ transform: "translateY(0)" }}
                    >
                      <path
                        d="M350 1V60H650V120"
                        stroke="url(#paint0_linear_left_to_right)"
                        strokeWidth="2"
                        strokeDasharray="10 10"
                      />
                      <defs>
                        <linearGradient
                          id="paint0_linear_left_to_right"
                          x1="500"
                          y1="1"
                          x2="500"
                          y2="120"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#FB923C" />
                          <stop offset="1" stopColor="#F97316" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
