import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserProfile } from "@/types/auth";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Simulated auth for now
  useEffect(() => {
    // Check if we have a stored session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // For demo, we'll automatically set as admin
    const mockUser: UserProfile = {
      id: '1',
      email: email,
      role: 'admin'
    };
    
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    navigate('/');
  };

  const signOut = async () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}