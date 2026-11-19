import { useState } from 'react';

export default function PublicSelect({ id, value, onChange, placeholder, options, required, error, requiredMessage, ...props }) {
  const [showRequiredError, setShowRequiredError] = useState(false);
  const message = error || (required && showRequiredError && !value ? requiredMessage : '');

  return (
    <div>
      <select
        {...props}
        id={id}
        value={value}
        required={required}
        onChange={onChange}
        onInvalid={() => setShowRequiredError(true)}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? `${id}-error` : undefined}
        className="public-select"
      >
        <option value="">{placeholder}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {message && <p id={`${id}-error`} className="public-select-error">{message}</p>}
    </div>
  );
}
