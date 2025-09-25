import { useState, useEffect } from 'react';

export const useAnimatedMount = (delay = 0) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return isVisible;
};

export const useIntersectionObserver = (options = {}) => {
  const [ref, setRef] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    observer.observe(ref);

    return () => {
      if (ref) {
        observer.unobserve(ref);
      }
    };
  }, [ref, options]);

  return [setRef, isVisible];
};

export const usePreferenceAnimation = (index) => {
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  const style = {
    opacity: isVisible ? 1 : 0,
    transform: `translateY(${isVisible ? 0 : '20px'})`,
    transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
    transitionDelay: `${index * 0.1}s`
  };

  return [ref, style];
};
