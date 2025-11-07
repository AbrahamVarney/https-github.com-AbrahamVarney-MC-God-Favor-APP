import { useEffect } from 'react';

/**
 * A side-effect hook that updates the application's favicon and apple-touch-icon
 * based on the provided data URL.
 * @param appIcon The base64 data URL of the icon to set.
 */
export const useAppIcon = (appIcon?: string) => {
    useEffect(() => {
        if (!appIcon) return;

        const setLinkHref = (selector: string, href: string) => {
            let linkElement = document.querySelector<HTMLLinkElement>(selector);
            if (linkElement) {
                linkElement.href = href;
            }
        };

        setLinkHref('link[rel="icon"]', appIcon);
        setLinkHref('link[rel="apple-touch-icon"]', appIcon);
        
    }, [appIcon]);
};
