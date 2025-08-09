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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Fetch comercial data including role
          const { data: comercial } = await supabase
            .from('comerciales')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (comercial) {
            const userWithRole = {
              ...session.user,
              role: comercial.role,
              nombre: comercial.nombre
            };
            setUser(userWithRole);
            setIsAdmin(comercial.role === 'admin');
          } else {
            setUser(session.user);
            setIsAdmin(false);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: comercial } = await supabase
          .from('comerciales')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (comercial) {
          const userWithRole = {
            ...session.user,
            role: comercial.role,
            nombre: comercial.nombre
          };
          setUser(userWithRole);
          setIsAdmin(comercial.role === 'admin');
        } else {
          setUser(session.user);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading, isAdmin };
};