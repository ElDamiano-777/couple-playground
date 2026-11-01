const petTypes = [
  [`Cat`, `🐈 Cat`],
  [`Dog`, `🐕 Dog`],
  [`Bird`, `🐦 Bird`],
  [`Rabbit`, `🐇 Rabbit`],
  [`Hamster`, `🐹 Hamster`],
  [`Guinea pig`, `🐹 Guinea pig`],
  [`Fish`, `🐟 Fish`],
  [`Turtle`, `🐢 Turtle`],
  [`Reptile`, `🦎 Reptile`],
  [`Other`, `🐾 Other animal`],
] as const;

export default function PetTypeSelect({ id, value, disabled, onChange }: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const existingType = value && !petTypes.some(([type]) => type === value);
  return <>
    <label htmlFor={id}>Pet type (optional)</label>
    <select id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      <option value="">Choose an animal</option>
      {petTypes.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
      {existingType && <option value={value}>{value} (current)</option>}
    </select>
  </>;
}
