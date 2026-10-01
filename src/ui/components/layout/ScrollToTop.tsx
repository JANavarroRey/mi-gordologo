import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Al cambiar de ruta, sube el scroll del main (y del window) al inicio. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
