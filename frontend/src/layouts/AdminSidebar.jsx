import style from "./SidebarAdminUser.module.css";
import { NavLink, Link } from "react-router-dom";
import { FaThLarge, FaUsers, FaBookOpen, FaListUl, FaQuestionCircle, FaCog, FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa";
import lightlogo from "../images/lightlogo.png";
import { useTranslation } from "react-i18next";

import { useState, useEffect } from 'react';
export default function AdminSidebar({ language }) {

    const [userImg, setUserImg] = useState({ image: "" });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setUserImg({
            image: lightlogo
        });
    }, []);

    const { t, i18n } = useTranslation();
    const logout = () => {
        localStorage.removeItem("accessToken");
        // localStorage.removeItem("refresh_token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");
        localStorage.removeItem("user");
        localStorage.removeItem("userFirstName");
        localStorage.removeItem("userLastName");
        localStorage.removeItem("userEmail");

        navigate("/");
    }


    return (
        <>
            <button
                className={`${style.menuBtn} ${language === 'ar' ? style['menuBtn-rtl'] : ''}`}
                onClick={() => setOpen(!open)}
            >
                {open ? <FaTimes /> : <FaBars />}
            </button>

            <nav className={`${style.nav} ${language === 'ar' ? style['nav-rtl'] : ''} ${open ? style.navOpen : ''}`}
            >

                    <img src={userImg.image} alt="adminImg" className={`${style.logo} `} />

                <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/admin/dashboard">
                    <FaThLarge className="m-3" />{t('dash')}
                </NavLink>

                <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/admin/users">
                    <FaUsers className="m-3" />{t('user')}
                </NavLink>

                <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/admin/topics">
                    <FaBookOpen className="m-3" />{t('topic')}
                </NavLink>

                <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/admin/tasks">
                    <FaListUl className="m-3" />{t('task')}
                </NavLink>

                <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/admin/quiz">
                    <FaQuestionCircle className="m-3" />{t('quiz')}
                </NavLink>

                <div className={style.bottomLinks}>
                    <hr />

                    <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/admin/settings">
                        <FaCog className="m-3" />{t('setting')}
                    </NavLink>

                    <Link className={`${style.links} ${style.logout}`} to="/" onClick={logout}>
                        {t('logout')}<FaSignOutAlt className="m-3" />
                    </Link>
                </div>

            </nav>
        </>
    );
}
