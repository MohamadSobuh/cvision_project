import React from 'react';

const AdminInput = ({ type = "text", placeholder, registerProps, ...rest }) => {
    return (
        <input
            type={type}
            placeholder={placeholder || " "}
            {...registerProps}  
            {...rest}
            style={{
                borderRadius: "5px",
                backgroundColor: "#E6F7F9",
                color: "#1A83A8",
                padding: "10px",
                border: "1px solid #1A83A8",
                width: "100%",
            }}
        />
    );
};

export default AdminInput;