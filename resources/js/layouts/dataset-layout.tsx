import { Link, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Database,
    FileUp,
    GitCompareArrows,
    LayoutDashboard,
    Lightbulb,
    LogOut,
    Menu,
    Settings,
    Sparkles,
    Wrench,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { BreadcrumbItem, User } from '@/types';

type Dataset = {
    id: number;
    name?: string;
};

export default function DatasetLayout({
    children,
    breadcrumbs = [],
}: {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}) {
    const page = usePage<{ dataset?: Dataset; auth: { user: User } }>();
    const dataset = page.props.dataset;
    const user = page.props.auth.user;
    const { isCurrentUrl } = useCurrentUrl();
    const getInitials = useInitials();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showLogout, setShowLogout] = useState(false);

    const navItems = useMemo(() => {
        const items = [
            {
                title: 'Upload',
                href: '/',
                icon: FileUp,
                color: 'from-blue-500 to-blue-600',
            },
        ];

        if (dataset && 'id' in dataset) {
            const id = dataset.id;
            items.push(
                {
                    title: 'Profile',
                    href: `/datasets/${id}/profile`,
                    icon: Database,
                    color: 'from-emerald-500 to-emerald-600',
                },
                {
                    title: 'Clean',
                    href: `/datasets/${id}/clean`,
                    icon: Wrench,
                    color: 'from-violet-500 to-violet-600',
                },
                {
                    title: 'Compare',
                    href: `/datasets/${id}/compare`,
                    icon: GitCompareArrows,
                    color: 'from-amber-500 to-amber-600',
                },
                {
                    title: 'Analyze',
                    href: `/datasets/${id}/analyze`,
                    icon: Lightbulb,
                    color: 'from-rose-500 to-rose-600',
                },
                {
                    title: 'Visualize',
                    href: `/datasets/${id}/visualize`,
                    icon: BarChart3,
                    color: 'from-cyan-500 to-cyan-600',
                },
                {
                    title: 'Dashboard',
                    href: `/datasets/${id}/dashboard`,
                    icon: LayoutDashboard,
                    color: 'from-pink-500 to-pink-600',
                },
            );
        }

        return items;
    }, [dataset]);

    return (
        <AppShell variant="header">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 items-center gap-4 px-4 md:max-w-7xl">
                    {/* Mobile hamburger */}
                    <div className="lg:hidden">
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-9"
                                >
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="flex w-72 flex-col bg-background p-0"
                            >
                                <SheetTitle className="sr-only">
                                    Navigation
                                </SheetTitle>
                                <SheetHeader className="border-b px-4 py-4">
                                    <Link
                                        href="/"
                                        className="flex items-center gap-2.5"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-sm">
                                            <Sparkles className="size-4" />
                                        </div>
                                        <span className="text-base font-semibold">
                                            InsightFlow
                                        </span>
                                    </Link>
                                </SheetHeader>

                                {/* Mobile nav items */}
                                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
                                    <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Workflow
                                    </p>
                                    {navItems.map((item) => {
                                        const active = isCurrentUrl(item.href);

                                        return (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                onClick={() =>
                                                    setMobileOpen(false)
                                                }
                                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                                    active
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                                }`}
                                            >
                                                <div
                                                    className={`flex size-7 items-center justify-center rounded-md ${
                                                        active
                                                            ? `bg-gradient-to-br ${item.color} text-white shadow-sm`
                                                            : 'bg-muted'
                                                    }`}
                                                >
                                                    <item.icon className="size-3.5" />
                                                </div>
                                                {item.title}
                                            </Link>
                                        );
                                    })}

                                    {dataset &&
                                        'name' in dataset &&
                                        dataset.name && (
                                            <>
                                                <div className="my-3 border-t" />
                                                <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                    Active Dataset
                                                </p>
                                                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5">
                                                    <Database className="size-4 text-emerald-600 dark:text-emerald-400" />
                                                    <span className="truncate text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                                        {dataset.name}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                </nav>

                                {/* Mobile user info */}
                                <div className="border-t p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-9">
                                            <AvatarImage
                                                src={user.avatar}
                                                alt={user.name}
                                            />
                                            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {user.name}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex shrink-0 items-center gap-2"
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 200,
                                damping: 15,
                            }}
                            className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-sm"
                        >
                            <Sparkles className="size-4" />
                        </motion.div>
                        <span className="hidden text-base font-semibold sm:inline">
                            InsightFlow
                        </span>
                    </Link>

                    {/* Desktop navigation */}
                    <nav className="ml-2 hidden h-full items-center gap-0.5 lg:flex">
                        {navItems.map((item) => {
                            const active = isCurrentUrl(item.href);

                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className={`relative flex h-full items-center gap-1.5 px-3 text-sm font-medium transition-colors ${
                                        active
                                            ? 'text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <item.icon className="size-4" />
                                    <span>{item.title}</span>
                                    {active && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className={`absolute right-0 bottom-0 left-0 h-0.5 bg-gradient-to-r ${item.color}`}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 300,
                                                damping: 25,
                                            }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right side */}
                    <div className="ml-auto flex items-center gap-2">
                        {/* User menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-9 rounded-full p-0"
                                >
                                    <Avatar className="size-8">
                                        <AvatarImage
                                            src={user.avatar}
                                            alt={user.name}
                                        />
                                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56"
                                align="end"
                                sideOffset={8}
                            >
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {user.name}
                                        </p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem asChild>
                                        <Link
                                            className="w-full cursor-pointer"
                                            href={edit()}
                                        >
                                            <Settings className="mr-2 size-4" />
                                            Settings
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => setShowLogout(true)}
                                >
                                    <LogOut className="mr-2 size-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <AppContent variant="header">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                >
                    {children}
                </motion.div>
            </AppContent>

            <ConfirmDialog
                open={showLogout}
                onOpenChange={setShowLogout}
                title="Log out?"
                description="Are you sure you want to log out of your account?"
                confirmLabel="Log out"
                onConfirm={() => {
                    router.flushAll();
                    router.post(logout.url());
                }}
            />
        </AppShell>
    );
}
