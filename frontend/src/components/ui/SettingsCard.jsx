import React from 'react';
import style from "../../pages/admin/Settings.module.css";
const SettingsCard = ({ title, subTitle, icon: Icon, children }) => {
    return (
        <div className={style.settingsCard}>
            <div className={style.cardHeader}>
                <div className={style.iconBox}>
                    <Icon size={24} />
                </div>
                <div>
                    <h5 className="mb-0 fw-bold">{title}</h5>
                    <small className="text-muted">{subTitle}</small>
                </div>
            </div>
            <div className="card-body p-0">
                {children}
            </div>
        </div>
    );
};

export default SettingsCard;