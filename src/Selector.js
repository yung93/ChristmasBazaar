import "./Selector.css";
import {Controller} from 'react-hook-form';
import {useState, useCallback} from "react";

const Selector = (props) => {
  const {options, control, name, multiple, onSelect, required, full} = props;
  const [selected, setSelected] = useState([]);

  const handleSelect = useCallback((selectedValue, onChange) => {
    let temp = multiple ? [...selected] : [];
    if (selected.includes(selectedValue)) {
        temp = selected.filter((value) => value !== selectedValue);
    } else {
      temp.push(selectedValue);
    }
    setSelected(temp);
    onChange(temp);
    onSelect && onSelect(temp);
  }, [multiple, selected]);

  return (
    <Controller
      control={control}
      name={name}
      render={({
                 field: { onChange, onBlur, value, name, ref },
                 fieldState: { invalid, isTouched, isDirty, error },
                 formState,
               }) => (
        <div
          className="container noselect"
          style={{flexDirection: full ? 'column' : 'row'}}
        >
          {
            options.map(({label, value}) => {
              const active = selected.includes(value);
              return (
                <div
                  className={`select-button${active ? ' active' : ''}`}
                  onClick={() => handleSelect(value, onChange)}
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
