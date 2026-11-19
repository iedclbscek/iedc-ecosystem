import { CircleAlert } from 'lucide-react';
import './form-alert.css';

export default function FormAlert({ children, id, className = '', role = 'alert' }) {
  return (
    <div id={id} className={`op-alert ${className}`} role={role}>
      <CircleAlert className="op-alert-icon" size={17} aria-hidden="true" />
      <div className="op-alert-content">{children}</div>
    </div>
  );
}
