import React, { useState } from 'react';
import style from "./UserProfile.module.css";
import { FaTrash, FaEdit } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import profileImg from "../../images/profileImg.PNG";
import { useUserFlow } from '../../context/UserFlowContext';
import { useEffect } from 'react';
import api from '../../utils/axios';



export default function UserProfile({ t, language }) {
    const navigate = useNavigate();
    const { user } = useUserFlow();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userProfile, setUserProfile] = useState({});

    const logout = () => {
        localStorage.removeItem("accessToken");
        // localStorage.removeItem("refresh_token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");
        localStorage.removeItem("user");
        localStorage.removeItem("userFirstName");
        localStorage.removeItem("userLastName");
        localStorage.removeItem("userEmail");
    }
    const ensureAuth = () => {
        const token = localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (!token || token === "undefined" || role !== "user") {
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
    const fetchProfile = async () => {
        if (!ensureAuth()) return;
        try {
            const response = await api.get("/userr/profile/");
            setUserProfile(response.data);
            console.log(response.data, "response data");
        } catch (error) {
            console.log(error);
        }
    }
    useEffect(() => {
        fetchProfile();
    }, []);

    const handleDeleteAccount = async () => {
        if (!ensureAuth()) return;
        try {
            await api.delete("/userr/profile/delete/");
            navigate("/login", {
                state: {
                    message: language === "ar" ? "تم حذف الحساب بنجاح" : "Account deleted successfully",
                    type: "success"
                }
            });
            setShowDeleteModal(false);
            logout();
        } catch (error) {
            console.log(error);
        }
    };
    if (!t) return <div className="text-center p-5">Loading...</div>;
    if (!user) return <div className="text-center p-5">Loading profile...</div>;
    return (
        <div className={language === 'ar' ? style.fullAr : style.fullEn}>
            <div className={style.bgGrid} />

            <div className={style.profile}>
                <div className={style.center}>
                    <img src={userProfile.image || profileImg} alt="Profile" className={`${style.imgProfile} rounded-circle`} />
                </div>

                <form>
                    <div className="row">
                        <div className="form-group col-md-6">
                            <label className={style.text}><b>{t('firstNameLabel')}</b></label>
                            <div className="form-control bg-light">{userProfile.firstname}</div>
                        </div>
                        <div className="form-group col-md-6">
                            <label className={style.text}><b>{t('lastNameLabel')}</b></label>
                            <div className="form-control bg-light">{userProfile.lastname}</div>
                        </div>
                    </div>

                    <div className="form-group mt-3">
                        <label className={style.text}><b>{t('emailLabel')}</b></label>
                        <div className="form-control bg-light">{userProfile.email}</div>
                    </div>

                    <div className="form-group mt-3">
                        <label className={style.text}><b>{t('fieldLabel')}</b></label>
                        <div className="form-control bg-light">{userProfile.field}</div>
                    </div>

                    <div className="form-group mt-3">
                        <label className={style.text}><b>{t('bio', 'Bio')}</b></label>
                        <div className="form-control bg-light text-wrap" style={{ minHeight: "76px" }}>
                            {userProfile.bio || t('noBio', 'No bio added yet.')}
                        </div>
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
                                    onClick={handleDeleteAccount}
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
