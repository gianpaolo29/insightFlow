import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            switch (data.type) {
                case 'success':
                    toast.success(data.message);
                    break;
                case 'error':
                    toast.error(data.message);
                    break;
                case 'warning':
                    toast.warning(data.message);
                    break;
                case 'info':
                    toast.info(data.message);
                    break;
            }
        });
    }, []);
}
