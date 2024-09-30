declare module '*.css';
declare module '*.less';
declare module '*.module.scss' {
  const classes: { [key: string]: any };
  export default classes;
}
declare module '*.scss';
declare module '*.png';
declare module '*.jpg';
declare module '*.svg' {
  export function ReactComponent(props: React.SVGProps<SVGSVGElement>): React.ReactElement;
  const url: string;
  export default url;
}

declare const env: string | undefined;
