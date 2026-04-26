import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

const fadeIn: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const fadeInScale: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
};

const slideInLeft: Variants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
};

const slideInRight: Variants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const staggerItem: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export function FadeIn({
    children,
    delay = 0,
    className,
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function FadeInScale({
    children,
    delay = 0,
    className,
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            variants={fadeInScale}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.4, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function SlideIn({
    children,
    direction = 'left',
    delay = 0,
    className,
}: {
    children: ReactNode;
    direction?: 'left' | 'right';
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            variants={direction === 'left' ? slideInLeft : slideInRight}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerContainer({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            variants={staggerItem}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function AnimatedCard({
    children,
    delay = 0,
    className,
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: 'easeOut' }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function CountUp({
    value,
    className,
}: {
    value: number;
    className?: string;
}) {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={className}
        >
            <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    duration: 0.6,
                    ease: 'easeOut',
                    type: 'spring',
                    stiffness: 100,
                }}
            >
                {value.toLocaleString()}
            </motion.span>
        </motion.span>
    );
}

export function AnimatedProgressBar({
    percentage,
    colorClass,
}: {
    percentage: number;
    colorClass: string;
}) {
    return (
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className={`h-full rounded-full ${colorClass}`}
        />
    );
}

export function PulseGlow({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            animate={{
                boxShadow: [
                    '0 0 0 0 rgba(var(--primary), 0)',
                    '0 0 0 8px rgba(var(--primary), 0.1)',
                    '0 0 0 0 rgba(var(--primary), 0)',
                ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export { motion };
