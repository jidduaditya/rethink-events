export function getRouteAuth(
  pathname: string
): "public" | "auth" | "admin" {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (
    pathname === "/organise" ||
    pathname.startsWith("/organise/") ||
    pathname === "/ticket" ||
    pathname.startsWith("/ticket/")
  )
    return "auth";
  return "public";
}
