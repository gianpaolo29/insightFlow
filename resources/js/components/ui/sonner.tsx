import { Toaster as SonnerToaster } from 'sonner';
import { useFlashToast } from '@/hooks/use-flash-toast';

function Toaster() {
    useFlashToast();

    return (
        <SonnerToaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
                className: 'shadow-lg',
            }}
        />
    );
}

export { Toaster };
