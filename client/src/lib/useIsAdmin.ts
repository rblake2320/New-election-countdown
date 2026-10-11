// UI hint only: decides whether to SHOW admin tools. The server is the
// authority (requireAdmin loads users.role). The VITE_ADMIN_FEATURES flag and
// the "@admin.com" email rule made every signed-in user look like an admin and
// are removed here in step with the server fix (lane A, A2).
export function useIsAdmin(user?: { role?: string | null }) {
  return user?.role?.toLowerCase?.() === "admin";
}
