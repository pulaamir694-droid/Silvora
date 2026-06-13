// src/hooks/useSEO.js
import { useEffect } from 'react';

export const useSEO = ({ title, description, image, url }) => {
  useEffect(() => {
    const siteName = 'Silvora Accessories';
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    const defaultDesc = 'سيلفورا أكسسوارات — إكسسوارات فاخرة مع إمكانية التخصيص. توصيل لجميع محافظات مصر.';
    const finalDesc = description || defaultDesc;
    document.title = fullTitle;
    const setMeta = (name, content, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', finalDesc);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', finalDesc, true);
    setMeta('og:type', 'website', true);
    if (image) setMeta('og:image', image, true);
    if (url) setMeta('og:url', url, true);
  }, [title, description, image, url]);
};
