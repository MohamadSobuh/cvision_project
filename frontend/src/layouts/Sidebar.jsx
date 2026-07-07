import style from "./SidebarAdminUser.module.css";
import { NavLink, Link } from "react-router-dom";
import { FaUpload, FaHistory, FaClipboardList, FaSignOutAlt, FaBars, FaThLarge, FaTimes, FaFlag } from "react-icons/fa";
import logo from "./../images/logo.png";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState } from 'react';

export default function Sidebar({ language }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { t, i18n } = useTranslation();
  const logout = () => {
    localStorage.removeItem("accessToken");
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
      <nav className={`${style.nav} ${language === "ar" ? style['nav-rtl'] : ''} ${open ? style.navOpen : ''}`}>
        <img src={logo} alt="logo" className={`${style.logo}`} />

        <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/user/dashboard"> <FaThLarge className="m-3" />{t('dash')}</NavLink>
        <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/user/upload"> <FaUpload className="m-3" />{t('upload')}</NavLink>
        <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/user/analysisHistory"> <FaHistory className="m-3" />{t('history')}</NavLink>
        <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/user/plan"> <FaClipboardList className="m-3" />{t('plan')}</NavLink>
        <div className={style.bottomLinks}>
          <hr />
          <NavLink className={({ isActive }) => `${style.links} ${isActive ? style.activeLink : ''}`} to="/user/report"> <FaClipboardList className="m-3" />{t('report')}</NavLink>

          <Link className={`${style.links} ${style.logout}`} to="/" onClick={logout}>
            {t('logout')}
            <FaSignOutAlt className="m-3" />
          </Link>
        </div>
      </nav>

    </>
  );
}


