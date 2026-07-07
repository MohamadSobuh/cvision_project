// src/pages/user/ProfileContainer.jsx
import React, { useState, useEffect } from 'react';


export default function ProfileContainer({ user, children, setUser }) {
    const [formData, setFormData] = useState(user);
    useEffect(() => {
        if (user) setFormData(user);
    }, [user]);

    const handelEditButton = () => {
        setFormData(user)

    }
    const handelChange = (e) => {
        console.log(e)
        setFormData({ ...formData, [e.target.name]: e.target.value })

    }
    const handelSave = () => {
        setUser(formData)

    }

    return (
        <div className="profile-wrapper">
            {typeof children === 'function' ? children({ formData, handelChange, handelSave }) : children}
        </div>
    );
}