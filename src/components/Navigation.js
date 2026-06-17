import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, User, BarChart3, Settings, Bot, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navigation = ({ user }) => {
  const location = useLocation();
  const { authUser, sessionTimer, signOutUrl } = useAuth();
  const { timeRemaining, showWarning, formatTimeRemaining } = sessionTimer;
  const showQuotaBadge = timeRemaining !== null;
  const quotaUnlimited = timeRemaining === Infinity;

  const navItems = [
    { path: '/', label: 'Conversation', icon: MessageCircle },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;
  const displayName =
    authUser?.name || authUser?.email || user?.profile?.name || 'Guest User';

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Agora Conversational AI
              </h1>
              <p className="text-xs text-gray-500">User Onboarding Demo</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-primary-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  
                  {isActive(item.path) && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary-50 rounded-lg -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-3">
            {showQuotaBadge && (
              <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                quotaUnlimited
                  ? 'bg-emerald-50 text-emerald-700'
                  : showWarning
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                <Clock className="w-3 h-3" />
                <span
                  title={
                    quotaUnlimited
                      ? 'Unlimited demo time for Agora accounts'
                      : 'Daily demo time remaining (UTC day)'
                  }
                >
                  {quotaUnlimited ? 'Unlimited' : formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            )}

            {authUser ? (
              <a
                href={signOutUrl}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign out</span>
              </a>
            ) : null}
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">
                {user?.onboardingCompleted ? 'Onboarding Complete' : 'Onboarding Pending'}
              </p>
            </div>
            
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
