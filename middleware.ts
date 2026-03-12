export { default } from "next-auth/middleware"

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/profile/:path*",
        "/questionRequests/:path*",
        "/questions/:path*",
        "/templates/:path*",
        "/users/:path*"
    ]
}
