import React from 'react'

const InputError = ({ error }) => {
    if (!error) return null;
    return (
        <p style={{ color: "#cc0000", background:"#ffe6e6" ,
             padding:"10px" , borderRadius:"5px" ,
            marginTop:"10px" , fontSize:"12px" , textAlign:"center"}}>{error.message}</p>

    )
}

export default InputError