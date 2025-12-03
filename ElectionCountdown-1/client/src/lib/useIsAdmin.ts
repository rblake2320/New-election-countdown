export function useIsAdmin(user?: { role?: string; email?: string }) {
  // env gate OR role gate. Either will show it.
  const flag = import.meta.env.VITE_ADMIN_FEATURES === "1";
  
  // Check if user is admin by role or email domain
  const isAdminRole = user?.role?.toLowerCase?.() === "admin";
  const isAdminEmail = user?.email?.endsWith?.("@admin.com");
  
  return flag || isAdminRole || isAdminEmail;
}