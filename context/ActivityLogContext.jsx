'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ActivityLogContext = createContext();

export function ActivityLogProvider({ children }) {
  const [activities, setActivities] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // Initialize activities from localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedActivities = localStorage.getItem('activityLog');
      if (savedActivities) {
        try {
          setActivities(JSON.parse(savedActivities));
        } catch (error) {
          console.error('Error parsing activity log from localStorage:', error);
        }
      }
    }
  }, []);

  // Save activities to localStorage whenever they change
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem('activityLog', JSON.stringify(activities));
    }
  }, [activities, isClient]);

  // Log an activity
  const logActivity = (action, details = {}) => {
    const activity = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      action,
      details,
    };
    setActivities(prev => [activity, ...prev].slice(0, 1000)); // Keep last 1000 activities
  };

  // Clear activity log
  const clearActivityLog = () => {
    setActivities([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activityLog');
    }
  };

  // Get activities for a specific user (if needed for multi-user support)
  const getUserActivities = (userId) => {
    return activities.filter(activity => activity.details?.userId === userId);
  };

  const value = {
    activities,
    logActivity,
    clearActivityLog,
    getUserActivities,
  };

  return <ActivityLogContext.Provider value={value}>{children}</ActivityLogContext.Provider>;
}

export function useActivityLog() {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider');
  }
  return context;
}


