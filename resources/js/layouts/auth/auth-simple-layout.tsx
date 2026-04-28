import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-background p-6 md:p-10">
            {/* Animated gradient orbs */}
            <div className="pointer-events-none fixed inset-0">
                <motion.div
                    className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl"
                    animate={{
                        x: [0, 60, -30, 0],
                        y: [0, -40, 20, 0],
                        scale: [1, 1.15, 0.95, 1],
                    }}
                    transition={{
                        duration: 18,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-3xl"
                    animate={{
                        x: [0, -50, 40, 0],
                        y: [0, 30, -50, 0],
                        scale: [1, 0.9, 1.1, 1],
                    }}
                    transition={{
                        duration: 22,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute top-1/3 left-1/4 h-[300px] w-[300px] rounded-full bg-pink-500/8 blur-3xl"
                    animate={{
                        x: [0, 40, -60, 0],
                        y: [0, -60, 30, 0],
                        scale: [1, 1.2, 0.85, 1],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </div>

            {/* Floating particles */}
            <div className="pointer-events-none fixed inset-0">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute size-1.5 rounded-full bg-primary/20"
                        style={{
                            left: `${15 + i * 14}%`,
                            top: `${20 + ((i * 37) % 60)}%`,
                        }}
                        animate={{
                            y: [0, -30, 10, 0],
                            x: [0, 15, -10, 0],
                            opacity: [0.2, 0.6, 0.3, 0.2],
                        }}
                        transition={{
                            duration: 8 + i * 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.8,
                        }}
                    />
                ))}
            </div>

            <motion.div
                className="relative z-10 w-full max-w-sm"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href="/"
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <motion.div
                                className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 200,
                                    damping: 15,
                                    delay: 0.2,
                                }}
                                whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                                <Sparkles className="size-7" />
                            </motion.div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <motion.div
                            className="space-y-2 text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                        >
                            <h1 className="text-xl font-semibold tracking-tight">
                                {title}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        </motion.div>
                    </div>
                    <motion.div
                        className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-lg shadow-black/5 backdrop-blur-md"
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.45 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
