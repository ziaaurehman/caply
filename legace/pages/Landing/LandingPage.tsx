import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import ChatWidget from '@/components/chat/ChatWidget';
import { 
  PieChart, 
  Users, 
  Calendar, 
  Clock, 
  BarChart, 
  CheckCircle,
  PlayCircle,
  ArrowRight,
  Star,
  Zap,
  Shield,
  LineChart,
  Building2,
  FileText,
  DollarSign,
  Lock,
  Globe2,
  Laptop
} from 'lucide-react';

const LandingPage = () => {
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
        "No team collaboration features"
      ],
      highlight: false,
      badge: "🆓 Free",
      buttonText: "Start"
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
        "Basic reporting access"
      ],
      highlight: false,
      badge: "👤 Popular"
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
        "Branding and integration management"
      ],
      highlight: true,
      badge: "🛠 Best Value"
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
        "Submit draft invoices and estimates"
      ],
      highlight: false,
      badge: "📁 Standard"
    }
  ];

  const features = [
    {
      icon: Clock,
      title: "Time Tracking & Approval",
      description: "Effortlessly track time across projects with automated approval workflows",
      image: "https://images.pexels.com/photos/3183153/pexels-photo-3183153.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
      icon: Calendar,
      title: "Capacity Planning",
      description: "Optimize resource allocation and prevent team burnout",
      image: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
      icon: Users,
      title: "Leave Management",
      description: "Streamline time-off requests and approvals",
      image: "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
      icon: BarChart,
      title: "Project Management",
      description: "Keep projects on track with Kanban boards and milestones",
      image: "https://images.pexels.com/photos/3183186/pexels-photo-3183186.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
      icon: DollarSign,
      title: "Budget vs Actual",
      description: "Real-time tracking of project costs and revenue",
      image: "https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
      icon: FileText,
      title: "Custom Reports",
      description: "Generate detailed P&L and workload reports",
      image: "https://images.pexels.com/photos/3183165/pexels-photo-3183165.jpeg?auto=compress&cs=tinysrgb&w=800"
    }
  ];

  const steps = [
    {
      icon: Building2,
      title: "Create your workspace",
      description: "Set up your company profile and customize settings"
    },
    {
      icon: Users,
      title: "Add your team",
      description: "Invite team members and set their roles and capacities"
    },
    {
      icon: LineChart,
      title: "Start tracking",
      description: "Begin logging time and managing projects efficiently"
    }
  ];

  const testimonials = [
    {
      quote: "Caply has transformed how we manage our team's capacity and project delivery.",
      author: "Sarah Johnson",
      role: "Operations Director",
      company: "TechCorp Inc.",
      image: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150"
    },
    {
      quote: "The best solution for Canadian businesses. Tax rules and compliance built-in.",
      author: "Michael Chen",
      role: "Finance Manager",
      company: "InnovateHub",
      image: "https://images.pexels.com/photos/3771807/pexels-photo-3771807.jpeg?auto=compress&cs=tinysrgb&w=150"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner */}
      <div className="bg-primary-50 py-2 text-center">
        <p className="text-sm text-primary-700">
          💡 Create and send custom invoices — just $1 each.
        </p>
      </div>

      {/* Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <PieChart className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-primary-600">
                Caply
              </span>
            </div>
            <div className="flex space-x-4">
              <Link to="/login">
                <Button variant="outline" className="text-primary-600 border-primary-600 hover:bg-primary-50">
                  Sign in
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-primary-600 hover:bg-primary-700">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-50 via-white to-white" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-6">
                <div className="inline-flex items-center rounded-full bg-primary-50 px-4 py-1 text-sm font-medium text-primary-700 mb-6">
                  <Shield className="h-4 w-4 mr-2" />
                  Canadian-built platform
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
                  <span className="block">Plan smarter.</span>
                  <span className="block text-primary-600">Track better.</span>
                  <span className="block">Deliver faster.</span>
                </h1>
                <p className="mt-6 text-xl text-gray-500">
                  Run your business with confidence on a secure, Canadian-built platform.
                </p>
                <div className="mt-8 flex space-x-4">
                  <Link to="/signup">
                    <Button size="lg" className="bg-primary-600 hover:bg-primary-700 group">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    leftIcon={<PlayCircle className="h-5 w-5" />}
                    className="text-primary-600 border-primary-600 hover:bg-primary-50"
                  >
                    Book a Demo
                  </Button>
                </div>
                <p className="mt-3 text-sm text-gray-500 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-success-500" />
                  No credit card required
                </p>
              </div>
              <div className="mt-12 lg:mt-0 lg:col-span-6">
                <div className="relative">
                  <div className="absolute -inset-4">
                    <div className="w-full h-full mx-auto opacity-30 blur-lg filter bg-gradient-to-r from-primary-600 to-secondary-500" />
                  </div>
                  <img
                    src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg"
                    alt="Team planning"
                    className="rounded-lg shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-gray-500 text-sm font-medium tracking-wide uppercase mb-8">
              Trusted by innovative companies
            </h2>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-6 lg:grid-cols-5">
              {/* Add company logos here */}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Everything you need to manage your team
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Streamline your operations with our comprehensive suite of tools
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="bg-white overflow-hidden hover:shadow-lg transition-shadow">
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

        {/* How it Works Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Get started in minutes
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Three simple steps to transform your team's productivity
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 text-primary-600 mx-auto">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-gray-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Loved by teams across Canada
              </h2>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-8">
                  <div className="flex items-start">
                    <img
                      src={testimonial.image}
                      alt={testimonial.author}
                      className="h-12 w-12 rounded-full"
                    />
                    <div className="ml-4">
                      <p className="text-lg text-gray-900">{testimonial.quote}</p>
                      <div className="mt-2">
                        <p className="font-medium text-gray-900">{testimonial.author}</p>
                        <p className="text-gray-500">{testimonial.role}, {testimonial.company}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">Simple, Transparent Pricing</h2>
              <p className="mt-4 text-lg text-gray-500">No hidden fees. Free updates. Cancel anytime.</p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-4">
              {pricingTiers.map((tier, index) => (
                <Card 
                  key={index} 
                  className={cn(
                    "bg-white p-8 hover:shadow-lg transition-shadow relative",
                    tier.highlight ? "border-primary-600 ring-2 ring-primary-600 transform scale-105" : ""
                  )}
                >
                  {tier.badge && (
                    <div className="absolute top-0 right-6 transform -translate-y-1/2">
                      <div className="inline-flex items-center rounded-full bg-primary-50 px-4 py-1 text-sm font-medium text-primary-700">
                        {tier.badge}
                      </div>
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
                  <p className="mt-4">
                    <span className="text-4xl font-extrabold text-primary-600">${tier.price}</span>
                    <span className="text-base font-medium text-gray-500">/{tier.period}</span>
                  </p>
                  <p className="mt-2 text-sm text-gray-500">{tier.description}</p>
                  <ul className="mt-8 space-y-4">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className={cn(
                          "h-5 w-5",
                          tier.name === "Basic" ? "text-success-500" : "text-primary-600"
                        )} />
                        <span className={cn(
                          "ml-3",
                          feature.includes("**") ? "font-bold text-primary-700" : "text-gray-500"
                        )}>
                          {feature.replace(/\*\*/g, '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={tier.highlight ? "primary" : "outline"}
                    className={cn(
                      "mt-8 w-full",
                      tier.highlight 
                        ? "bg-primary-600 hover:bg-primary-700 transform scale-105" 
                        : "text-primary-600 border-primary-600 hover:bg-primary-50"
                    )}
                  >
                    {tier.buttonText || "Start Free Trial"}
                  </Button>
                </Card>
              ))}
            </div>

            {/* Welcome Offer */}
            <div className="mt-12 bg-primary-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-primary-700 mb-4">🎁 Welcome Offer</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary-600 mt-1 flex-shrink-0" />
                  <p className="ml-3 text-gray-700">1 Admin license FREE for the first 30 days</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary-600 mt-1 flex-shrink-0" />
                  <p className="ml-3 text-gray-700">Try Caply with up to 3 users fully unlocked</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary-600 mt-1 flex-shrink-0" />
                  <p className="ml-3 text-gray-700">No credit card required — cancel anytime</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">Enterprise-Grade Security</h2>
              <p className="mt-4 text-lg text-gray-500">Your data is protected by industry-leading security measures</p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="text-center">
                <Lock className="h-12 w-12 text-primary-600 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">End-to-End Encryption</h3>
                <p className="mt-2 text-gray-500">Your data is encrypted in transit and at rest</p>
              </div>
              <div className="text-center">
                <Globe2 className="h-12 w-12 text-primary-600 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Compliance Ready</h3>
                <p className="mt-2 text-gray-500">GDPR, PIPEDA, and Law 25 compliant</p>
              </div>
              <div className="text-center">
                <Laptop className="h-12 w-12 text-primary-600 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Canadian Hosting</h3>
                <p className="mt-2 text-gray-500">Data stored in Canadian data centers</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary-600">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="block">Ready to optimize your team's capacity?</span>
              <span className="block text-primary-200">Start your free trial today.</span>
            </h2>
            <div className="mt-8 lg:mt-0 lg:flex-shrink-0">
              <Link to="/signup">
                <Button 
                  size="lg" 
                  className="bg-white text-primary-600 hover:bg-primary-50"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center space-x-8">
            <a href="#" className="text-gray-500 hover:text-primary-600">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-primary-600">Terms of Service</a>
            <a href="#" className="text-gray-500 hover:text-primary-600">Contact</a>
          </nav>
          <p className="mt-8 text-center text-gray-500">
            © 2025 Technologies AWS INC. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Add ChatWidget */}
      <ChatWidget showOnLanding={true} />
    </div>
  );
};

export default LandingPage;