// Demo mode utilities
// When NEXT_PUBLIC_DEMO_MODE is true, bypass Supabase authentication

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_USERS = {
    admin: {
        id: "demo-admin-001",
        email: "admin@demo.com",
        display_name: "Demo Admin",
        role: "admin" as const,
    },
    employee: {
        id: "demo-employee-001",
        email: "staff@demo.com",
        display_name: "Demo Staff",
        role: "employee" as const,
    },
};

export type DemoUser = typeof DEMO_USERS.admin | typeof DEMO_USERS.employee;

// Cookie name for demo session
export const DEMO_SESSION_COOKIE = "demo_user_role";

// Get demo user from role
export function getDemoUser(role: "admin" | "employee"): DemoUser {
    return DEMO_USERS[role];
}
