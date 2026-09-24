import { useEffect, useState, type AnchorHTMLAttributes } from 'react';

/** Hash routing keeps the prototype deployable as static files anywhere. */
const read = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setPath(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export const navigate = (to: string) => {
  window.location.hash = to;
};

export function Link({ to, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={`#${to}`} {...rest} />;
}
