// A full load of the Terraform case study must start locked.
// Clearing the httpOnly cookie here drops any unlock from a previous view
// before the public page is shown. The matcher stays on this one route.
export const config = {
  matcher: ["/projects/terraform", "/projects/terraform.html"],
};

export default function middleware() {
  return new Response(null, {
    headers: {
      "x-middleware-next": "1",
      "Set-Cookie":
        "terraform_case=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure",
    },
  });
}
