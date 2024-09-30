import { FC, PropsWithChildren } from "react";
import styles from './form.module.scss';
import classnames from 'classnames';

interface IButtonProps {
  type?: 'primary' | 'default';
  onClick: () => void;
}

const Button: FC<PropsWithChildren<IButtonProps>> = ({ type: _type, onClick, children }) => {
  const type = _type || 'default';

  return (
    <div className={classnames(styles.button, type === 'primary' && styles.primary)}>
      <button onClick={onClick}>{children}</button>
    </div>
  )
};

export default Button;
