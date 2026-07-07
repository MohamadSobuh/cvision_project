const Input = ({ type, name, id, register, onChange,className = "" , ...rest }) => {

    const { onChange: registerOnChange, ...registerProps } = register(name);
    const combinedOnChange = (e) => {
        registerOnChange(e);
        if (onChange) {
            onChange(e);
        }
    };
    return (

        <input
            type={type}
            className="form-control"
            name={name}
            id={id}
            placeholder=" "
            {...registerProps}
            onChange={combinedOnChange}
            {...rest}
            style={{
                borderRadius: "15px",

            }}
        />
    );
};

export default Input;