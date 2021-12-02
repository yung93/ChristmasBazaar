import "./Selector.css";
import {Controller} from 'react-hook-form';
import {useState, useCallback} from "react";

const Selector = (props) => {
  const {options, control, name, multiple, onSelect, required, full, defaultValue} = props;

  const handleSelect = useCallback((selected, selectedValue, onChange) => {
    let temp = multiple ? [...selected] : [];
    if (selected.includes(selectedValue)) {
        temp = selected.filter((value) => value !== selectedValue);
    } else {
      temp.push(selectedValue);
    }
    onChange(temp);
    onSelect && onSelect(temp);
  }, [multiple]);

  return (
    <Controller
      control={control}
      name={name}
      defaultValue={defaultValue}
      render={({
                 field: { onChange, onBlur, value: selected, name, ref },
                 fieldState: { invalid, isTouched, isDirty, error },
                 formState,
               }) => (
        <div
          className="container noselect"
          style={{flexDirection: full ? 'column' : 'row'}}
        >
          {
            options.map(({label, value}) => {
              const active = selected && selected.includes(value);
              return (
                <div
                  className={`select-button${active ? ' active' : ''}`}
                  onClick={() => handleSelect(selected || [], value, onChange)}
                  key={`${name}_${value}`}
                >
                  {label}
                </div>
              )
            })
          }
        </div>
      )}
      rules={{
        required: (value) => {
          if(!required) return true;
          return (!!value && value.length > 0)
        }
      }}
    />
  )

}

export default Selector;
