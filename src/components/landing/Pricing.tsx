import PricingCard from "./PricingCard"

export default function Pricing() {
  const pricingTiers = [
    {
      name: "Basic",
      price: "0",
      period: "forever",
      description: "Perfect for freelancers and independent contributors",
      features: [
        "Access to 'My Timesheet' only",
        "Manual time entry",
        "View personal profile",
        "Add, edit, and manage unlimited expenses",
        "Create and manage up to 2 projects in Kanban view",
        "**Generate professional invoices for only $1 each**",
        "No team collaboration features",
      ],
      highlight: false,
      badge: "🆓 Free",
      buttonText: "Start",
    },
    {
      name: "Team Member",
      price: "9.99",
      period: "per user/month",
      description: "Perfect for internal or external contributors",
      features: [
        "Log timesheets by task/project/day",
        "View assigned tasks and calendar",
        "Submit leave requests",
        "View read-only PO/Invoice data",
        "Access to work history and profile",
        "Basic reporting access",
      ],
      highlight: false,
      badge: "👤 Popular",
    },
    {
      name: "Admin",
      price: "24.99",
      period: "per user/month",
      description: "For department or company administrators",
      features: [
        "All Manager features",
        "User & role management",
        "Full PO & Invoice control",
        "Tax configuration",
        "P&L and capacity reporting",
        "Branding and integration management",
      ],
      highlight: true,
      badge: "🛠 Best Value",
    },
    {
      name: "Manager",
      price: "17.99",
      period: "per user/month",
      description: "Ideal for team and project leads",
      features: [
        "All Team Member features",
        "Create & manage projects",
        "Resource allocation",
        "Approve timesheets & leave",
        "Monitor project budget vs. actual",
        "Submit draft invoices and estimates",
      ],
      highlight: false,
      badge: "📁 Standard",
    },
  ]

  return (
    <section className="py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-4 leading-tight">
          Simple, Transparent Pricing
          </h2>
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
          No hidden fees. Free updates. Cancel anytime.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-4 items-stretch">
          {pricingTiers.map((tier, index) => (
            <div key={index} className="h-full flex flex-col">
              <PricingCard {...tier} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
