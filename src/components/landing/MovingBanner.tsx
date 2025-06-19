"use client"

const MovingBanner = () => {
  return (
    <section className="bg-primary-50 py-6 border-y-2 border-dashed border-primary-300 overflow-hidden">
      <div className="flex animate-slow-scroll">
        <div className="flex items-center space-x-12 text-black font-semibold text-lg whitespace-nowrap">
          <span>⭐ Time Tracking</span>
          <span>📊 Capacity Planning</span>
          <span>📅 Leave Management</span>
          <span>📋 Project Management</span>
          <span>💰 Invoice Management</span>
          <span>📈 Business Analytics</span>
          <span>👥 Team Collaboration</span>
          <span>🔒 Canadian Compliance</span>
          <span>⭐ Time Tracking</span>
          <span>📊 Capacity Planning</span>
          <span>📅 Leave Management</span>
          <span>📋 Project Management</span>
          <span>💰 Invoice Management</span>
          <span>📈 Business Analytics</span>
          <span>👥 Team Collaboration</span>
          <span>🔒 Canadian Compliance</span>
        </div>
      </div>
    </section>
  );
};

export default MovingBanner;