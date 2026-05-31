import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Company, CompanyMember } from '../types';
import { User } from '@supabase/supabase-js';

interface CompanyContextType {
  activeCompany: Company | null;
  activeMembership: CompanyMember | null;
  memberships: CompanyMember[];
  loading: boolean;
  setActiveCompany: (company: Company) => void;
  refreshMemberships: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode, user: User | null }> = ({ children, user }) => {
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [memberships, setMemberships] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const activeMembership = activeCompany 
    ? memberships.find(m => m.company_id === activeCompany.id) || null 
    : null;

  const refreshMemberships = async () => {
    if (!user) {
      setMemberships([]);
      setActiveCompanyState(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('company_members')
      .select('*, company:companies(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching memberships:', error);
    } else {
      const formattedMemberships = (data || []).map((m: any) => ({
        ...m,
        company: m.company as Company
      }));
      setMemberships(formattedMemberships);
      
      // Auto-select first company if none selected
      if (formattedMemberships.length > 0 && !activeCompany) {
        const savedCompanyId = localStorage.getItem('resger_active_company_id');
        const savedCompany = formattedMemberships.find(m => m.company_id === savedCompanyId)?.company;
        setActiveCompanyState(savedCompany || formattedMemberships[0].company!);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshMemberships();
  }, [user]);

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company);
    localStorage.setItem('resger_active_company_id', company.id);
  };

  return (
    <CompanyContext.Provider value={{ 
      activeCompany, 
      activeMembership,
      memberships, 
      loading, 
      setActiveCompany, 
      refreshMemberships 
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
