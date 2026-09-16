import { BASE_LABELS, SUPPORTED_BASES } from '../utils/converter';

/**
 * 进制下拉选择器。
 * 转换页与练习页共用，避免两处各写一份 option 渲染逻辑。
 */
export default function BaseSelect({
  id,
  label,
  value,
  onChange,
  disabled = false,
  exclude = null,
  hint,
}) {
  const options = exclude === null ? SUPPORTED_BASES : SUPPORTED_BASES.filter((b) => b !== exclude);

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((base) => (
          <option key={base} value={base}>
            {BASE_LABELS[base].name}（{base}）
          </option>
        ))}
      </select>
      {hint ? <span className="muted">{hint}</span> : null}
    </div>
  );
}
