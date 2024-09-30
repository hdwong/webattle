import { FC } from "react";
import styles from './form.module.scss';
import classnames from 'classnames';

interface IInputProps {
  label: string;
  type?: string;
  className?: string;
  style?: React.CSSProperties;
  value?: string;
  onChange: (value: string) => void;
}

const Input: FC<IInputProps> = ({ label, type: _type, className, style, value, onChange }) => {
  const type = _type || 'text';

  return (
    <div className={classnames(styles.input, className)} style={style}>
      <input type={type} placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
};

export default Input;
