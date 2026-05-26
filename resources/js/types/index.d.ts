export interface User {
    id: string;
    name: string;
    email: string;
    email_verified_at?: string;
}

export interface NavItem {
    label: string;
    href: string;
    icon: string;
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        permissions: string[];
    };
    navGroups: NavGroup[];
};
