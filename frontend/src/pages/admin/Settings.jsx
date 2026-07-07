import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import style from "./Settings.module.css";
import SettingsCard from "../../components/ui/SettingsCard";
import { FaGlobe, FaLock, FaSave } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import Notification from '../../components/ui/Notification';
import api from '../../utils/axios';


const Settings = () => {
    const { t, i18n } = useTranslation();
    const language = i18n.language;
    const navigate = useNavigate();
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    const handleLanguageChange = (event) => {
        const newLanguage = event.target.value;
        console.log(newLanguage, "newLanguage");

        i18n.changeLanguage(newLanguage);
        document.documentElement.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem("language", newLanguage);
    };

    const [siteSettings, setSiteSettings] = useState({
        siteName: "CVision",
        defaultLanguage: "en",
        sessionTimeout: 30,
        twoFactorAuth: false,
    });

    const [loading, setLoading] = useState(true);

    const [message, setMessage] = useState({ show: false, text: "", type: "success" });

    const showMessage = (text, type = "success") => {
        setMessage({ show: true, text, type });
        setTimeout(() => {
            setMessage(prev => ({ ...prev, show: false }));
        }, 3000);
    };
    const ensureAuth = () => {
        const token = localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (!token || token === "undefined" || role !== "admin") {
            navigate("/login", {
                state: {
                    message: language === "ar" ? "انتهت جلسة التسجيل، يرجى تسجيل الدخول مجدداً" : "Session expired, please log in again",
                    type: "error"
                }
            });
            return false;
        }
        return true;
    };
    useEffect(() => {
        const fetchSettings = async () => {
            if (!ensureAuth()) return;
            try {
                const response = await api.get("/dashboard/settings/");
                console.log(response.data, "response");

                if (response.data) {
                    setSiteSettings(prev => ({
                        ...prev,
                        siteName: response.data.siteName || prev.siteName,
                        defaultLanguage: response.data.defaultLanguage || prev.defaultLanguage,
                        sessionTimeout: response.data.sessionTimeout || prev.sessionTimeout,
                        twoFactorAuth: response.data.twoFactorAuth !== undefined ? response.data.twoFactorAuth : prev.twoFactorAuth
                    }));

                }
            } catch (error) {
                console.error("Error fetching settings:", error.response?.data || error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [navigate]);

    const handleSiteChange = (e) => {
        const { name, value } = e.target;
        setSiteSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSecurityChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSiteSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        if (!ensureAuth()) return;
        try {
            const response = await api.post("/dashboard/settings/", { ...siteSettings });
            console.log(response.data, "response");
            if (response.data.defaultLanguage) {
                handleLanguageChange({ target: { value: response.data.defaultLanguage } });

            }
        } catch (error) {
            console.error("Error updating settings:", error.response?.data || error);
        }
        console.log("Saving Settings:", { ...siteSettings });
        showMessage(language === 'ar' ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
    };



    return (

        <div className={language === 'ar' ? style.settingsPageAr : style.settingsPage} dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className={style.bgGrid} />

            <div className="row align-items-center mb-4">
                <div className='col-md-6'>
                    <h1 className="fw-bold" style={{ color: '#082F43' }}>{t('settingsTitle')}</h1>
                    <p style={{ color: '#546e7a' }}>{t('settingsSub')}</p>
                </div>
                <div className={`col-md-6 ${language === 'ar' ? 'text-start' : 'text-end'}`}>
                    <button className={style.btnAdd} onClick={handleSave}>
                        <FaSave className="me-2" /> {t('saveSettings')}
                    </button>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-6">
                    <SettingsCard
                        title={t('generalSettings')}
                        subTitle={t('generalSettingsSub')}
                        icon={FaGlobe}
                    >
                        <div className="mb-3">
                            <label className={style.label}>{t('siteNameLabel')}</label>
                            <input
                                type="text"
                                name="siteName"
                                className={`form-control ${style.inputField}`}
                                value={siteSettings.siteName}
                                onChange={handleSiteChange}
                            />
                        </div>
                        <div className="mb-3">
                            <label className={style.label}>{t('defaultLanguageLabel')}</label>
                            <select
                                name="defaultLanguage"
                                className={`form-select ${style.inputField}`}
                                value={siteSettings.defaultLanguage}
                                onChange={handleSiteChange}
                            >
                                <option value="en" selected={siteSettings.defaultLanguage === "en"}>{t('english')}</option>
                                <option value="ar" selected={siteSettings.defaultLanguage === "ar"}>{t('arabic')}</option>
                            </select>
                        </div>
                    </SettingsCard>
                </div>

                <div className="col-lg-6">
                    <SettingsCard
                        title={t('securitySettings')}
                        subTitle={t('securitySettingsSub')}
                        icon={FaLock}
                    >
                        <div className="mb-3">
                            <label className={style.label}>{t('sessionTimeoutLabel')}</label>
                            <input
                                type="number"
                                name="sessionTimeout"
                                className={`form-control ${style.inputField}`}
                                value={siteSettings.sessionTimeout}
                                onChange={handleSecurityChange}
                            />
                        </div>
                    </SettingsCard>
                </div>
            </div>
            <Notification
                show={message.show}
                text={message.text}
                type={message.type}
            />
        </div>

    );
};

export default Settings;