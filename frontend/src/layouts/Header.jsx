
import style from "./Header.module.css";
import profileImg from "../images/profileImg.PNG";
import { useEffect, useMemo, useCallback } from 'react';
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUserFlow } from "../context/UserFlowContext";

export default function Header({ language, setLanguage }) {
    const { i18n } = useTranslation();
    const { user } = useUserFlow();

    useEffect(() => {
        document.documentElement.dir = (language || i18n.language) === 'ar' ? 'rtl' : 'ltr';
    }, [language, i18n.language]);

    const currentUser = useMemo(() => user || {}, [user]);

    const storedFirstName = useMemo(() => currentUser.firstname || currentUser.first_name || "Israa", [currentUser]);
    const storedLastName = useMemo(() => currentUser.lastname || currentUser.last_name || "Shtaiwi", [currentUser]);

    const handleLanguageChange = useCallback((e) => {
        const newLang = e.target.value;
        i18n.changeLanguage(newLang);
        localStorage.setItem("language", newLang);
        if (setLanguage) {
            setLanguage(newLang);
        }
    }, [i18n, setLanguage]);

    return (
        <header className={`${style.header}`}>
            <div className={`${style.headerContent}`}>
                <select name='lang' className={`${style.selectLang}`} value={language || i18n.language || 'en'} onChange={handleLanguageChange}>
                    <option value="en">ENG</option>
                    <option value="ar">AR</option>
                </select>
                <Link to="profile">
                    <img src={currentUser.image || profileImg} alt="Profile" className={`${style.imgProfile} rounded-circle`} />
                </Link>
                <h6>{storedFirstName} {storedLastName}</h6>
            </div>
        </header>
    );
}