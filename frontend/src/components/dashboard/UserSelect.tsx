import React, { useMemo, useRef, useState } from "react";
import { useNetwork } from "./NetworkContext";

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  excludeId?: string;
}

export default function UserSelect({ value, onChange, placeholder = "Select user…", excludeId }: UserSelectProps): React.ReactElement {
  const { users } = useNetwork();
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      users.filter(
        (u: any) =>
          u.id !== excludeId &&
          u.name.toLowerCase().includes(search.toLowerCase())
      ),
    [users, search, excludeId]
  );

  const selectedName = users.find((u: any) => u.id === value)?.name ?? "";

  function select(id: string): void {
    onChange(id);
    setSearch("");
    setOpen(false);
  }

  function handleBlur(e: React.FocusEvent): void {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }

  return (
    <div className="user-select" ref={ref} onBlur={handleBlur}>
      <input
        className="search-input"
        placeholder={selectedName || placeholder}
        value={open ? search : selectedName}
        onFocus={() => { setOpen(true); setSearch(""); }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        readOnly={!open}
      />
      {value && (
        <button
          className="user-select-clear"
          onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); onChange(""); setSearch(""); }}
          aria-label="Clear"
        >
          ×
        </button>
      )}
      {open && filtered.length > 0 && (
        <ul className="user-select-dropdown">
          {filtered.slice(0, 100).map((u: any) => (
            <li
              key={u.id}
              className={`user-select-option${u.id === value ? " selected" : ""}`}
              onMouseDown={() => select(u.id)}
            >
              {u.name}
            </li>
          ))}
          {filtered.length > 100 && (
            <li className="user-select-more">
              +{filtered.length - 100} more — type to narrow
            </li>
          )}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <ul className="user-select-dropdown">
          <li className="user-select-more">No matches</li>
        </ul>
      )}
    </div>
  );
}