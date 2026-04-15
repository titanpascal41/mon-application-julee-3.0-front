import React, { useState, useEffect } from "react";
import { chargerSocietes } from "../data/societes";

const SocieteInput = ({
  label,
  id,
  name,
  value,
  onChange,
  multiple = false,
  required = false,
}) => {
  const [societes, setSocietes] = useState([]);

  useEffect(() => {
    const loadSocietes = async () => {
      const data = await chargerSocietes();
      setSocietes(data);
    };
    loadSocietes();
    
  }, []);

  const handleChange = (e) => {
    const selectedValue = multiple
      ? Array.from(e.target.selectedOptions, (option) => option.value)
      : e.target.value;
    onChange(selectedValue);
  };

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id}>
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={id}
        name={name}
        value={value || (multiple ? [] : "")}
        onChange={handleChange}
        multiple={multiple}
        required={required}
      >
        <option value="">Sélectionner une société</option>
        {societes.map((societe) => (
          <option key={societe.id} value={societe.id}>
            {societe.nom}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SocieteInput;
