import { Link, router, usePage } from '@inertiajs/react';
import {
    FileUp,
    LogOut,
    Menu,
    Settings,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
import type { BreadcrumbItem, NavItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const mainNavItems: NavItem[] = [
    {
        title: 'Datasets',
        href: '/',
        icon: FileUp,
    },
    {
        title: 'Settings',
        href: edit(),
        icon: Settings,
    },
];

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage();
    const { auth } = page.props;
    const user = auth.user!;
    const getInitials = useInitials();
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const [showLogout, setShowLogout] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 items-center gap-4 px-4 md:max-w-7xl">
                    {/* Mobile Menu */}
                    <div className="lg:hidden">
                        <Sheet>
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
                                    >
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-sm">
                                            <Sparkles className="size-4" />
                                        </div>
                                        <span className="text-base font-semibold">
                                            InsightFlow
                                        </span>
                                    </Link>
                                </SheetHeader>
                                <nav className="flex-1 space-y-1 px-3 py-3">
                                    {mainNavItems.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                                isCurrentOrParentUrl(item.href)
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                            }`}
                                        >
                                            {item.icon && (
                                                <item.icon className="size-4" />
                                            )}
                                            {item.title}
                                        </Link>
                                    ))}
                                </nav>
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
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-sm">
                            <Sparkles className="size-4" />
                        </div>
                        <span className="hidden text-base font-semibold sm:inline">
                            InsightFlow
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="ml-2 hidden h-full items-center gap-1 lg:flex">
                        {mainNavItems.map((item) => {
                            const active = isCurrentOrParentUrl(item.href);
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
                                    {item.icon && (
                                        <item.icon className="size-4" />
                                    )}
                                    {item.title}
                                    {active && (
                                        <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User menu */}
                    <div className="ml-auto flex items-center gap-2">
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
            {breadcrumbs.length > 1 && (
                <div className="border-b border-border/50">
                    <div className="mx-auto flex h-10 items-center px-4 md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}

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
        </>
    );
}
