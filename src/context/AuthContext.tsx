import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/lib/types';
import { DEMO_STAFF } from '@/lib/mockData';
import { getSupabaseClient } from '@/lib/supabase';

interface AuthContextType {
  currentUser: UserProfile;
  switchRole: (role: UserRole) => void;
  setUser: (user: UserProfile) => void;
  availableStaff: UserProfile[];
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pos_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    // Default to billing staff on desktop or inventory staff
    return DEMO_STAFF[1]; // Priya - Billing Staff
  });

  useEffect(() => {
    localStorage.setItem('pos_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const switchRole = (role: UserRole) => {
    const found = DEMO_STAFF.find((s) => s.role === role) || {
      id: `staff-${role}`,
      name: `${role.replace('_', ' ').toUpperCase()}`,
      role,
      counterId: 'Counter 1',
    };
    setCurrentUser(found);
  };

  const logout = () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setCurrentUser(DEMO_STAFF[0]);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        switchRole,
        setUser: setCurrentUser,
        availableStaff: DEMO_STAFF,
        isAuthenticated: true,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

