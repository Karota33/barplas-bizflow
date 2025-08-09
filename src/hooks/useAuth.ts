import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserWithRole extends User {
  role?: string;
  nombre?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserRole = async (userId: string) => {
    console.log('🔍 Fetching user role for ID:', userId);
    try {
      const { data: comercial, error } = await supabase
        .from('comerciales')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('📋 Comercial data:', comercial);
      console.log('❌ Fetch error:', error);

      if (comercial) {
        console.log('✅ Setting user role:', comercial.role);
        setUser(prevUser => prevUser ? {
          ...prevUser,
          role: comercial.role,
          nombre: comercial.nombre
        } : null);
        const isAdminUser = comercial.role === 'admin';
        console.log('🔐 Is admin?', isAdminUser);
        setIsAdmin(isAdminUser);
      } else {
        console.log('❌ No comercial data found');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('💥 Error fetching user role:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserRole(session.user.id);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading, isAdmin };
};