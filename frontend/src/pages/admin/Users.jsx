import { useCallback, useMemo, useState, useEffect } from 'react';
import style from "./AdminTables.module.css";
import Admin from "../../images/Admin.jpg";
import profileImg from "../../images/profileImg.PNG";
import { useTranslation } from "react-i18next";

import { FaTrash, FaUsers } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import AdminInput from '../../components/ui/AdminInput';
import InputError from "../../components/ui/InputError";
import EmptyPage from "../../components/ui/EmptyPage";
import AdminDataState from "../../components/ui/AdminDataState";
import { signupSchema } from "../../utils/validationSchema";
import { FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Notification from "../../components/ui/Notification";
import api from '../../utils/axios';

export default function Users({ language }) {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const usersPerPage = 4;
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [filterInput, setFilterInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    // const [imgSrc, setImgSrc] = useState(user.image);
    const [message, setMessage] = useState({ show: false, text: "", type: "success" });

    const showMessage = (text, type = "success") => {
        setMessage({ show: true, text, type });
        setTimeout(() => {
            setMessage(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const { t } = useTranslation();


    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(signupSchema)
    });
    const ensureAuth = useCallback(() => {
        const token = localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (!token || token === "undefined" || role !== "admin") {
            showMessage(language === 'ar' ? "انتهت جلسة التسجيل، يرجى تسجيل الدخول مجدداً" : "Session expired, please log in again", "error");
            navigate("/login");
            return false;
        }
        return true;
    }, [language, navigate]);

    const loadUsers = useCallback(async () => {
        if (!ensureAuth()) return;

        setLoading(true);
        setLoadError(false);
        try {
            const response = await api.get("/dashboard/profiles/");
            setUsers(response.data);
        } catch (err) {
            console.error("Error fetching users:", err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [ensureAuth]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleDelete = async () => {
        if (!ensureAuth()) return;
        try {
            const response = await api.delete(`/dashboard/profiles/${showDeleteModal}/`);
            if (response.status === 200 || response.status === 204) {
                setUsers(users.filter(user => user.id !== showDeleteModal));
                setShowDeleteModal(null);
                showMessage(language === "ar" ? "تم حذف المستخدم بنجاح" : "User deleted successfully", "success");
            }
        } catch (err) {
            console.error("Error deleting user:", err);
            setShowDeleteModal(null);
            showMessage(language === "ar" ? "فشل حذف المستخدم" : "Failed to delete user", "error");
        }
    };
    const usersFilter = useMemo(
        () => users.filter(user => {
            const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
            const searchInput = filterInput.toLowerCase();
            return fullName.includes(searchInput);
        }),
        [filterInput, users],
    );

    const totalPagesFilter = Math.ceil(usersFilter.length / usersPerPage);
    const indexOfLastUserFilter = currentPage * usersPerPage;
    const indexOfFirstUserFilter = indexOfLastUserFilter - usersPerPage;
    const currentUsersFilter = usersFilter.slice(indexOfFirstUserFilter, indexOfLastUserFilter);

    const handleNext = () => setCurrentPage(prev => (
        prev < totalPagesFilter ? prev + 1 : prev
    ));
    const handlePrev = () => setCurrentPage(prev => (
        prev > 1 ? prev - 1 : prev
    ));

    useEffect(() => {
        setCurrentPage(1);
    }, [filterInput]);

    const onSubmit = async (data) => {
        const name = data.first_name + " " + data.last_name;
        const payload = {
            image: Admin,
            name: name,
            email: data.email,
            password: data.password,
            role: data.role,
            joinDate: new Date().toISOString().split('T')[0],
            learningPlan: "----",
            Progress: "0%",
            CVnumbers: 0,
        };
        try {
            const response = await api.post("/dashboard/profiles/", payload);

            if (response.status === 201 || response.status === 200) {
                const newUser = {
                    ...response.data,
                    image: Admin,
                    learningPlan: response.data.learningPlan || "----",
                    Progress: response.data.Progress || "0%",
                    CVnumbers: response.data.CVnumbers || 0,
                };
                setUsers(prev => [...prev, newUser]);
                reset();
                setShowModal(false);
                showMessage(language === "ar" ? "تم إضافة المستخدم بنجاح" : "User added successfully", "success");
            }
        } catch (error) {
            console.error("تفاصيل الخطأ من السيرفر:", error.response?.data);
            showMessage(language === "ar" ? "فشلت الإضافة" : "Failed to add user", "error");
            reset();
            setShowModal(false);
        }
    };
    console.log("Validation Errors:", errors);
    console.log("Users Filter:", usersFilter);
    console.log("Users:", users);


    return (
        <div className={language === 'ar' ? style.usersPageArabic : style.usersPage}>
            {loading ? (
                <AdminDataState
                    title={t("loadingUsers")}
                    message={t("loadingUsersWait")}
                />
            ) : loadError ? (
                <AdminDataState
                    type="error"
                    title={t("usersLoadError")}
                    message={t("adminLoadErrorMessage")}
                    retryLabel={t("retry")}
                    onRetry={loadUsers}
                />
            ) : users.length === 0 ? (
                <EmptyPage
                    icon={<FaUsers />}
                    title={t('emptyUsersTitle')}
                    message={t('emptyUsersMessage')}
                    btnText={t('addUser')}
                    onClick={() => setShowModal(true)}
                />
            ) : (
                <>

                    <div className='row align-items-center justify-content-between mb-4'>
                        <div className={style.bgGrid} />

                        <div className='col-md-6'>
                            <h1><b>{t('title')}</b></h1>
                            <p>{t('descriptionUsersPage')}</p>
                        </div>
                        <div className={`col-md-6 ${language === 'ar' ? 'text-start' : 'text-end'}`}>
                            <button
                                className={language === 'ar' ? style.addUserbtnAr : style.addUserbtn}
                                onClick={() => setShowModal(true)}
                            >
                                <b>{t('addUser')}</b>
                            </button>
                        </div>
                        <div className="col-md-6">
                            <div className={style.searchContainer}>
                                <FaSearch className={language === 'ar' ? style.searchIconAr : style.searchIcon} />
                                <input
                                    type="text"
                                    className={`${style.searchInput} ${language === 'ar' ? style.searchInputAr : ''}`}
                                    placeholder={t('search')}
                                    value={filterInput}
                                    onChange={(e) => setFilterInput(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={style.ForUsers}>
                        <table className={style.usersTable}>
                            <thead>
                                <tr>
                                    <th>{t('user')}</th>
                                    <th>{t('learningPlan')}</th>
                                    <th>{t('progress')}</th>
                                    <th>{t('cvs')}</th>
                                    <th>{t('joinDate')}</th>
                                    <th>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentUsersFilter.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className={style.userInfo}>
                                                <img src={user.image || profileImg} alt="Profile" className={`${style.imgProfile} rounded-circle`} />
                                                <div className={style.userText}>
                                                    <b>{user.first_name} {user.last_name}</b>
                                                    <span>{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{user.learningPlan}</td>
                                        <td>
                                            <div className={style.progressContainer}>
                                                <div className={style.progressBar}>
                                                    <div className={style.progressFill} style={{ width: `${user.Progress}%` }}></div>
                                                </div>
                                                <span>{user.Progress}</span>
                                            </div>
                                        </td>
                                        <td className={style.center}>{user.CVnumbers}</td>
                                        <td>{user.joinDate}</td>

                                        <td className={style.center}>
                                            <FaTrash
                                                className={style.actionIcon}
                                                onClick={() => setShowDeleteModal(user.id)}
                                                style={{ color: "#ff0000" }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className={style.foot}>
                            <button className={style.btnOutline} onClick={handlePrev}>{t('prev')}</button>
                            <button className={style.btnActive} style={{ background: "#1A83A8" }}>{currentPage}</button>
                            <button className={style.btnOutline} onClick={handleNext}>{t('next')}</button>
                        </div>
                    </div>
                </>
            )}


            {showModal && (
                <div className={style.modalOverlay}>
                    <div className={style.modalContent}>
                        <h2 style={{ marginBottom: "20px", color: "#1A83A8" }}>{t('addForm')}</h2>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className={style.formRow}>
                                <div style={{ flex: 1 }}>
                                    <label>{t('firstNameLabel')}</label>
                                    <AdminInput
                                        type="text"
                                        name="first_name"
                                        placeholder={t('enterFirstName')}
                                        registerProps={register("first_name")}
                                    />
                                    <InputError error={errors.first_name} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>{t('lastNameLabel')}</label>
                                    <AdminInput
                                        type="text"
                                        name="last_name"
                                        placeholder={t('enterLastName')}
                                        registerProps={register("last_name")}
                                    />
                                    <InputError error={errors.last_name} />
                                </div>
                            </div>

                            <div style={{ marginBottom: "15px" }}>
                                <label>{t('emailLabel')}</label>
                                <AdminInput
                                    type="email"
                                    name="email"
                                    placeholder={t('email')}
                                    registerProps={register("email")}
                                />
                                <InputError error={errors.email} />
                            </div>

                            <div style={{ marginBottom: "15px" }}>
                                <label>{t('pass')}</label>
                                <AdminInput
                                    type="password"
                                    name="password"
                                    placeholder={t('pass')}
                                    registerProps={register("password")}
                                />
                                <InputError error={errors.password} />
                            </div>

                            <div style={{ marginBottom: "15px" }}>
                                <label>{t('role')}</label>
                                <select
                                    {...register("role")}
                                    style={{
                                        borderRadius: "5px",
                                        backgroundColor: "#E6F7F9",
                                        color: "#1A83A8",
                                        padding: "10px",
                                        border: "1px solid #1A83A8",
                                        width: "100%",
                                    }}
                                >
                                    <option value="user">{t('user')}</option>
                                    <option value="admin">{t('admin')}</option>
                                </select>
                            </div>

                            <div className={style.modalButtons}>
                                <button type="button" className={style.btnOutline} onClick={() => setShowModal(false)}>
                                    {t('cancel')}
                                </button>
                                <button type="submit" className={style.btnActive}>{t('save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className={style.modalOverlay} onClick={() => setShowDeleteModal(null)} >
                    <div className={style.modalContent} onClick={(e) => e.stopPropagation()} >
                        <h2 className={style.modalTitle}>{t('confirm')}</h2>
                        <p>{t('confirmDeleteDesc')}</p>

                        <div className={style.modalButtons}>
                            <button className={style.btnOutline} onClick={() => setShowDeleteModal(null)}>
                                {t('confirmDeleteCancel')}
                            </button>

                            <button className={style.btnActive} style={{ backgroundColor: "red", borderColor: "red" }}
                                onClick={() => {
                                    handleDelete(showDeleteModal);
                                    setShowDeleteModal(null);
                                }} >
                                {t('confirmDeleteBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

           <Notification show={message.show} text={message.text} type={message.type} />

        </div>
    );
}
