import { useQuery } from "@tanstack/react-query";
import type { User, Team } from "@shared/schema";

interface AuthUser extends User {
  teams: (Team & { role: string })[];
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
