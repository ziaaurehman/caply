import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const ChatWidget: React.FC<{ showOnLanding?: boolean }> = ({ showOnLanding = false }) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Add initial greeting for landing page
    if (showOnLanding && messages.length === 0) {
      setMessages([
        {
          id: Date.now().toString(),
          type: 'bot',
          content: "👋 Hi there! I'm Caply Assistant. I can help you with:\n\n" +
                  "• Learning about our features\n" +
                  "• Understanding pricing plans\n" +
                  "• Getting started with resource planning\n" +
                  "• Technical questions\n\n" +
                  "What would you like to know?",
          timestamp: new Date()
        }
      ]);
    }
  }, [showOnLanding]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    const botResponse = await generateBotResponse(message, user?.role, showOnLanding);
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: botResponse,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, botMessage]);
  };

  const generateBotResponse = async (
    userMessage: string, 
    userRole?: string,
    isLandingPage = false
  ): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const normalizedMessage = userMessage.toLowerCase();

    // Landing page specific responses
    if (isLandingPage) {
      if (normalizedMessage.includes('price') || normalizedMessage.includes('cost')) {
        return "Our pricing is simple and flexible:\n\n" +
               "🆓 Basic: Free forever\n" +
               "👤 Team Member: $9.99/mo\n" +
               "📁 Manager: $17.99/mo\n" +
               "🛠 Admin: $24.99/mo\n\n" +
               "Would you like to know what features are included in each plan?";
      }

      if (normalizedMessage.includes('feature') || normalizedMessage.includes('what') || normalizedMessage.includes('can')) {
        return "Caply offers powerful features for resource management:\n\n" +
               "📊 Resource capacity planning\n" +
               "⏱ Time tracking & timesheets\n" +
               "📋 Project management\n" +
               "💰 Budget tracking\n" +
               "📈 Real-time analytics\n\n" +
               "Which feature would you like to learn more about?";
      }

      if (normalizedMessage.includes('start') || normalizedMessage.includes('trial') || normalizedMessage.includes('sign')) {
        return "Getting started is easy!\n\n" +
               "1. Click 'Start Free Trial' at the top\n" +
               "2. Create your account\n" +
               "3. Add your team members\n" +
               "4. Start managing projects\n\n" +
               "No credit card required for the trial. Would you like me to explain any specific step?";
      }
    }

    // Role-specific responses
    const roleSpecificResponse = getRoleSpecificResponse(normalizedMessage, userRole);
    if (roleSpecificResponse) return roleSpecificResponse;

    // General responses
    if (normalizedMessage.includes('timesheet')) {
      return "To submit a timesheet:\n1. Go to the Timesheets page\n2. Select the week\n3. Add your hours for each project\n4. Click 'Submit' when done\n\nNeed more help with timesheets?";
    }

    if (normalizedMessage.includes('invoice')) {
      return "To create an invoice:\n1. Go to Invoices\n2. Click 'Create Invoice'\n3. Fill in client details and line items\n4. Add applicable taxes\n5. Preview and send\n\nWould you like to know more about invoice features?";
    }

    if (normalizedMessage.includes('estimate')) {
      return "Creating an estimate is simple:\n1. Go to Estimates\n2. Enter client details\n3. Add line items\n4. Set optional discount\n5. Preview and send\n\nWould you like me to explain any specific part?";
    }

    if (normalizedMessage.includes('tax') || normalizedMessage.includes('gst') || normalizedMessage.includes('hst')) {
      return "Tax rates vary by province:\n- GST only (5%): AB, NT, NU, YT\n- GST+PST: BC (12%), SK (11%), MB (12%)\n- HST: ON (13%), NB/NS/PE/NL (15%)\n- QC: GST (5%) + QST (9.975%)\n\nNeed help with specific tax calculations?";
    }

    return "I can help you with:\n- Resource Planning\n- Timesheets & Capacity\n- Estimates & Invoices\n- Tax Rules\n- Project Management\n\nWhat would you like to know more about?";
  };

  const getRoleSpecificResponse = (message: string, role?: string): string | null => {
    if (!role) return null;

    switch (role) {
      case 'admin':
        if (message.includes('permission') || message.includes('access')) {
          return "As an admin, you can:\n- Manage all user permissions\n- Configure system settings\n- Access all features\n- View and edit all data\n\nNeed help with a specific permission?";
        }
        break;
      case 'manager':
        if (message.includes('approve') || message.includes('review')) {
          return "As a manager, you can:\n- Approve timesheets\n- Review capacity planning\n- Manage team assignments\n- Access project reports\n\nWhat would you like to manage?";
        }
        break;
      case 'employee':
        if (message.includes('submit') || message.includes('request')) {
          return "As an employee, you can:\n- Submit timesheets\n- Request time off\n- View your assignments\n- Update task status\n\nWhat would you like to do?";
        }
        break;
    }
    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn(
      "fixed z-50",
      showOnLanding ? "bottom-8 right-8" : "bottom-4 right-4"
    )}>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors",
            showOnLanding && "animate-bounce"
          )}
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "bg-white rounded-lg shadow-xl transition-all duration-200 overflow-hidden",
          isMinimized ? "w-72 h-14" : "w-96 h-[32rem]"
        )}>
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageSquare size={20} />
              <span className="font-medium">Caply Assistant</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-primary-700 rounded"
              >
                {isMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-primary-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 h-[calc(32rem-8rem)]">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      "mb-4 max-w-[80%] rounded-lg p-3",
                      msg.type === 'user' ? "ml-auto bg-primary-100 text-primary-900" : "bg-gray-100"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="border-t p-4">
                <div className="flex items-end space-x-2">
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1 resize-none rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWidget;