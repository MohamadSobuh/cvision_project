import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import style from './SessionTimeout.module.css';
import { useTranslation } from 'react-i18next';
import { FiClock } from 'react-icons/fi';

export default function SessionTimeout() {
    const navigate = useNavigate();
    const location = useLocation();
    const timeoutRef = useRef(null);
    const timeoutMsRef = useRef(null);
    const lastTokenRef = useRef(null);
    const [isTimedOut, setIsTimedOut] = useState(false);
    const { t, i18n } = useTranslation();

    const handleConfirmLogout = () => {
        setIsTimedOut(false);
        navigate("/login");
    };

    const logout = useCallback(() => {
        if (localStorage.getItem("accessToken")) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userId");
            localStorage.removeItem("user");
            localStorage.removeItem("userFirstName");
            localStorage.removeItem("userLastName");
            
            setIsTimedOut(true);
        }
    }, []);

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (timeoutMsRef.current && localStorage.getItem("accessToken")) {
            timeoutRef.current = setTimeout(logout, timeoutMsRef.current);
        }
    }, [logout]);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");

        if (token && token !== "undefined" && token !== lastTokenRef.current) {
            lastTokenRef.current = token;

            axios.get("http://127.0.0.1:8000/api/dashboard/settings/", {
                headers: { Authorization: `Token ${token}` }
            }).then(response => {
                const timeoutMinutes = response.data?.sessionTimeout || 30;
                timeoutMsRef.current = timeoutMinutes * 60 * 1000;
                resetTimeout();
            }).catch(error => {
                console.error("Error setting up session timeout:", error);
                timeoutMsRef.current = 30 * 60 * 1000;
                resetTimeout();
            });
        } else if (!token || token === "undefined") {
            // User logged out
            lastTokenRef.current = null;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
    }, [location.pathname, resetTimeout]);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token || token === "undefined") {
            return undefined;
        }

        const events = ['mousemove', 'keydown', 'click', 'scroll'];

        const handleActivity = () => {
            if (!isTimedOut) {
                resetTimeout();
            }
        };

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [location.pathname, resetTimeout, isTimedOut]);

    if (!isTimedOut) return null;

    const currentLanguage = i18n.language || "en";
    const dirClass = currentLanguage === "ar" ? style.rtl : style.ltr;

    return (
        <div className={`${style.overlay} ${dirClass}`}>
            <div className={style.modal}>
                <div className={style.iconWrapper}>
                    <FiClock className={style.icon} />
                </div>
                <div className={style.title}>
                    {t('sessionExpiredTitle', 'Session Expired')}
                </div>
                <div className={style.message}>
                    {t('sessionExpiredMessage', 'Your session has timed out due to inactivity. Please log in again to continue.')}
                </div>
                <button className={style.button} onClick={handleConfirmLogout}>
                    {t('returnToLogin', 'Return to Login')}
                </button>
            </div>
        </div>
    );
}
