import { useEffect } from 'preact/hooks';
import { TeamConfig } from '../../worker/types';

interface SEOHeadProps {
  teamConfig?: TeamConfig;
  pageTitle?: string;
  pageDescription?: string;
  pageImage?: string;
  currentUrl?: string;
}

export function SEOHead({ 
  teamConfig, 
  pageTitle, 
  pageDescription, 
  pageImage, 
  currentUrl 
}: SEOHeadProps) {
  
  useEffect(() => {
    // Update document title
    const title = pageTitle || 
      (teamConfig?.name ? `${teamConfig.name} - AI Legal Assistant` : 'Blawby AI - Intelligent Legal Assistant & Chat Interface');
    document.title = title;

    // Update meta tags dynamically
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const updateMetaName = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update Open Graph tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', pageDescription || 
      (teamConfig?.description || 'Get instant legal guidance, document analysis, and matter creation with Blawby\'s AI-powered legal assistant. Available nationwide for legal professionals and individuals seeking legal information.'));
    updateMetaTag('og:url', currentUrl || (typeof window !== 'undefined' ? window.location.href : ''));
    updateMetaTag('og:image', pageImage || 
      (teamConfig?.profileImage || 'https://ai.blawby.com/team-profile-demo.png'));
    updateMetaTag('og:site_name', teamConfig?.name || 'Blawby AI');

    // Update Twitter tags
    updateMetaName('twitter:title', title);
    updateMetaName('twitter:description', pageDescription || 
      (teamConfig?.description || 'Get instant legal guidance, document analysis, and matter creation with Blawby\'s AI-powered legal assistant. Available nationwide for legal professionals and individuals seeking legal information.'));
    updateMetaName('twitter:image', pageImage || 
      (teamConfig?.profileImage || 'https://ai.blawby.com/team-profile-demo.png'));

    // Update standard meta tags
    updateMetaName('description', pageDescription || 
      (teamConfig?.description || 'Get instant legal guidance, document analysis, and matter creation with Blawby\'s AI-powered legal assistant. Available nationwide for legal professionals and individuals seeking legal information.'));

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentUrl || (typeof window !== 'undefined' ? window.location.href : ''));

  }, [teamConfig, pageTitle, pageDescription, pageImage, currentUrl]);

  return null; // This component doesn't render anything
}
