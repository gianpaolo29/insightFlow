import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-background p-6 md:p-10">
            {/* Gradient background decoration */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-violet-500/6 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <AppLogoIcon className="size-10" />
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {title}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-sm">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
