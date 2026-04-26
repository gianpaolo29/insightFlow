import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import Swal from 'sweetalert2';
import type { FlashToast } from '@/types/ui';

const iconMap: Record<FlashToast['type'], 'success' | 'info' | 'warning' | 'error'> = {
    success: 'success',
    info: 'info',
    warning: 'warning',
    error: 'error',
};

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: iconMap[data.type],
                title: data.message,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
        });
    }, []);
}
