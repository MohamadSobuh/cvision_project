import React, { useState } from 'react';
import style from "../user/UserProfile.module.css";
import { FaTrash, FaEdit } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import profileImg from "../../images/profileImg.PNG";
import { useUserFlow } from '../../context/UserFlowContext';
import { useEffect } from "react";
import axios from "axios";
import Notification from '../../components/ui/Notification';
import { useLocation } from "react-router-dom";
import api from '../../utils/axios';


export default function AdminProfile({ t, language }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user ,setUser} = useUserFlow();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [adminProfile, setAdminProfile] = useState(null);
    const [message, setMessage] = useState({ show: false, text: "", type: "success" });
    


    const showMessage = (text, type = "success") => {
        setMessage({ show: true, text, type });
        setTimeout(() => {
            setMessage(prev => ({ ...prev, show: false }));
        }, 3000);
    };
    useEffect(() => {
        if (location.state?.message) {
            showMessage(location.state.message, location.state.type);
        }
    }, [location.state]);
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

    const fetchAdminProfile = async () => {
        if (!ensureAuth()) return;
        const response = await api.get("/userr/profile/");
        setAdminProfile(response.data);
        console.log(response.data, "response data");
        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
    }
    useEffect(() => {
        fetchAdminProfile();
    }, []);


    
    const handleDeleteAccount = async () => {
        if (!ensureAuth()) return;
        await api.delete("/user/profile/delete/");
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        showMessage(language === "ar" ? "تم حذف الحساب بنجاح" : "Profile deleted successfully", "success");
        navigate("/login");

    };
    if (!t) return <div className="text-center p-5">Loading...</div>;
    if (!user) return <div className="text-center p-5">Loading profile...</div>;
    return (
        <div className={language === 'ar' ? style.fullAr : style.fullEn}>
            <Notification
                show={message.show}
                text={message.text}
                type={message.type}
            />
                                <div className={style.bgGrid} />
            
            <div className={style.profile}>
                <div className={style.center}>
                    <img src={adminProfile?.image || profileImg} alt="Profile" className={`${style.imgProfile} rounded-circle`} />
                </div>

                <form>
                    <div className="row">
                        <div className="form-group col-md-6">
                            <label className={style.text}><b>{t('firstNameLabel')}</b></label>
                            <div className="form-control bg-light">{adminProfile?.firstname}</div>
                        </div>
                        <div className="form-group col-md-6">
                            <label className={style.text}><b>{t('lastNameLabel')}</b></label>
                            <div className="form-control bg-light">{adminProfile?.lastname}</div>
                        </div>
                    </div>

                    <div className="form-group mt-3">
                        <label className={style.text}><b>{t('emailLabel')}</b></label>
                        <div className="form-control bg-light">{adminProfile?.email}</div>
                    </div>


                </form>

                <Link to="edit" className="alert alert-info w-100 mt-4 p-2 d-flex align-items-center justify-content-center text-decoration-none">
                    <FaEdit className="me-2" /> <b>{t('edit')}</b>
                </Link>
                <hr className={style.hr} />
                <button
                    type="button"
                    className='alert alert-danger w-100 p-2 d-flex align-items-center justify-content-center'
                    onClick={() => setShowDeleteModal(true)}
                >
                    <FaTrash className="me-2" /> <b>{t('delete')}</b>
                </button>

                {showDeleteModal && (
                    <div className={style.modalOverlay}>
                        <div className={style.modalBox}>

                            <h3 className={style.modalTitle}>
                                {language === "ar" ? "تحذير!" : "Warning!"}
                            </h3>

                            <p className={style.modalText}>
                                {language === "ar"
                                    ? "هل أنت متأكد أنك تريد حذف الحساب؟"
                                    : "Are you sure you want to delete your account?"}
                            </p>

                            <div className={style.modalButtons}>

                                <button
                                    className={style.cancelBtn}
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    {language === "ar" ? "إلغاء" : "Cancel"}
                                </button>

                                <button
                                    className={style.deleteBtn}
                                    onClick={() => {
                                        handleDeleteAccount();
                                        console.log("Deleted");
                                        setShowDeleteModal(false);
                                    }}
                                >
                                    {language === "ar" ? "نعم، احذف" : "Yes, Delete"}
                                </button>

                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
