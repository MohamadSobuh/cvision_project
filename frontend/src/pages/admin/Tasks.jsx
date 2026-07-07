import { useCallback, useState, useEffect } from "react";
import style from "./AdminTables.module.css";
import { useTranslation } from "react-i18next";

import { FaTrash, FaFileAlt, FaQuestionCircle, FaVideo, FaImage, FaEdit, FaEye, FaTasks } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import AdminInput from '../../components/ui/AdminInput';
import InputError from "../../components/ui/InputError";
import { signupSchemaForTasks } from "../../utils/validationSchema";
import EmptyPage from "../../components/ui/EmptyPage";
import AdminDataState from "../../components/ui/AdminDataState";
import { useAdminFlow } from '../../context/AdminFlowContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FaSearch } from "react-icons/fa";
import { FaFilter } from "react-icons/fa";
import Notification from '../../components/ui/Notification';
import { useLocation } from "react-router-dom";
import api from '../../utils/axios';
import { getVideoEmbedUrl } from '../../utils/video';




export default function Tasks({ language }) {

    const [message, setMessage] = useState({ show: false, text: "", type: "success" });

    const showMessage = (text, type = "success") => {
        setMessage({ show: true, text, type });
        setTimeout(() => {
            setMessage(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const [tasks, setTasks] = useState([]);
    const [totalTasksCount, setTotalTasksCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const tasksPerPage = 4;
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const { topics, fetchTopics, loadingTopics, setActiveTask } = useAdminFlow();
    const navigate = useNavigate();
    const [filterInput, setFilterInput] = useState('');
    const [debouncedFilterInput, setDebouncedFilterInput] = useState('');
    const [filterTopic, setFilterTopic] = useState('');
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);







    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(signupSchemaForTasks)
    });
    const { t } = useTranslation();
    


    useEffect(() => {
        if (location.state?.message) {
            showMessage(location.state.message, location.state.type);
        }
    }, [location.state]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedFilterInput(filterInput);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [filterInput]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedFilterInput, filterTopic]);

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

    const loadPageData = useCallback(async () => {
        if (!ensureAuth()) return;

        setLoading(true);
        setLoadError(false);
        try {
            const [tasksResponse, topicsLoaded] = await Promise.all([
                api.get("/dashboard/tasks/", {
                    params: {
                        paginate: 1,
                        summary: 1,
                        page: currentPage,
                        page_size: tasksPerPage,
                        search: debouncedFilterInput || undefined,
                        topic: filterTopic || undefined,
                    }
                }),
                topics.length ? Promise.resolve(true) : fetchTopics(),
            ]);
            if (!topicsLoaded) {
                throw new Error("Topics could not be loaded");
            }
            setTasks(tasksResponse.data.results || tasksResponse.data);
            setTotalTasksCount(tasksResponse.data.count ?? tasksResponse.data.length);
        } catch (err) {
            console.error("Error loading tasks page:", err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [currentPage, debouncedFilterInput, ensureAuth, fetchTopics, filterTopic, tasksPerPage, topics.length]);

    useEffect(() => {
        loadPageData();
    }, [loadPageData]);
    //  const handleEditChange = (e) => {
    //     const { name, value } = e.target;
    //     setEditData(prev => ({ ...prev, [name]: value }));
    // };

    // const handleSave = () => {
    //     // هون ال
    //     setTaskData(editData);
    //     setIsEditing(false);
    // };

    // const handleCancel = () => {
    //     setEditData(taskData);
    //     setIsEditing(false);
    // };
    const openTaskPage = async (task, path) => {
        if (!ensureAuth()) return;

        try {
            const response = await api.get(`/dashboard/tasks/${task.id}/`);
            setActiveTask(response.data);
            navigate(path);
        } catch (err) {
            console.error("Error loading task details:", err);
            showMessage(language === "ar" ? "تعذر تحميل تفاصيل المهمة" : "Could not load task details", "error");
        }
    };

    const handleShowEditPage = async (data) => {
        openTaskPage(data, '/admin/editTask');
    }
    const handleView = (task) => {
        openTaskPage(task, '/admin/viewTaskContent');
    };
    const handleDelete = async () => {
        try {
            if (!ensureAuth()) return;
            const response = await api.delete(`/dashboard/tasks/${showDeleteModal}/`);
            console.log(response)
            setTasks(tasks.filter(task => task.id !== showDeleteModal));
            setTotalTasksCount(prev => Math.max(prev - 1, 0));
            setShowDeleteModal(null);
            showMessage(language === "ar" ? "تم حذف المهمة بنجاح" : "Task deleted successfully", "success");
        } catch (err) {
            setShowDeleteModal(null);
            console.error("Error deleting task:", err);
            showMessage(language === "ar" ? "حدث خطأ" : "An error occurred", "error");
        }
    };
    const totalPagesFilter = Math.ceil(totalTasksCount / tasksPerPage);
    const currentTasksFilter = tasks;

    const handleNext = () => setCurrentPage(prev => (
        prev < totalPagesFilter ? prev + 1 : prev
    ));

    const handlePrev = () => setCurrentPage(prev => (
        prev > 1 ? prev - 1 : prev
    ));
    



    const onSubmit = async (data) => {
        console.log(data);
        const payload = {
            title: data.task,
            topic_id: Number(data.topic),
            content: data.content,
            video_url: getVideoEmbedUrl(data.videoUrl),
            image_url: data.imageUrl,
        };
        console.log("Payload to be sent:", payload);
        try {
            if (!ensureAuth()) return;
            const response = await api.post("/dashboard/tasks/", payload);
            console.log(response.data);
            showMessage(language === "ar" ? "تم إضافة المهمة بنجاح" : "Task added successfully", "success");
            reset();
            setShowModal(false);
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                loadPageData();
            }
        }
        catch (err) {
            setShowModal(false);
            console.error("Error adding task:", err);
            showMessage(language === "ar" ? "حدث خطأ" : "An error occurred", "error");
        }
    };




    return (
        <div className={language === "ar" ? style.TasksPageArabic : style.TasksPage}>
            <Notification
                show={message.show}
                text={message.text}
                type={message.type}
            />
            {loading ? (
                <AdminDataState
                    title={t("loadingTasks")}
                    message={t("loadingTasksWait")}
                />
            ) : loadError ? (
                <AdminDataState
                    type="error"
                    title={t("tasksLoadError")}
                    message={t("adminLoadErrorMessage")}
                    retryLabel={t("retry")}
                    onRetry={loadPageData}
                />
            ) : tasks.length === 0 ? (
                <EmptyPage
                    icon={<FaTasks />}
                    title={t('emptyTasksTitle')}
                    message={t('emptyTasksMessage')}
                    btnText={t('addTaskbtn')}
                    onClick={() => setShowModal(true)}
                />
            ) : (
                <>
                    <div className='row align-items-center justify-content-between mb-4'>
                        <div className={style.bgGrid} />

                        <div className='col-md-6'>
                            <h1><b>{t('titleTaskPage')}</b></h1>
                            <p>{t('descriptionTaskPage')}</p>
                        </div>
                        <div className={`col-md-6 ${language === 'ar' ? 'text-start' : 'text-end'}`}>
                            <button
                                className={language === 'ar' ? style.addTaskbtnAr : style.addTaskbtn}
                                onClick={() => setShowModal(true)}
                            >
                                <b>{t('addTaskbtn')}</b>
                            </button>
                        </div>
                        <div className="col-md-6">
                            <div className={style.searchContainer}>
                                <FaSearch className={style.searchIcon} />
                                <input
                                    type="text"
                                    placeholder={t('search')}
                                    className={style.searchInput}
                                    value={filterInput}
                                    onChange={(e) => setFilterInput(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className={style.filterContainer}>
                                <FaFilter className={style.filterIcon} />

                                <select
                                    className={style.filterSelect}
                                    value={filterTopic}
                                    onChange={(e) => setFilterTopic(e.target.value)}
                                >
                                    <option value="">{t('allTopics')}</option>
                                    {topics.map(topic => (
                                        <option key={topic.id} value={topic.title}>
                                            {topic.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className={style.ForTasks}>
                        <table className={style.tasksTable}>
                            <thead>
                                <tr>
                                    <th>{t('taskNameLabel')}</th>
                                    <th>{t('topicLabel')}</th>
                                    <th>{t('res')}</th>
                                    <th>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentTasksFilter.map(task => (
                                    <tr key={task.id}>
                                        <td>
                                            <div className={style.taskInfo}>
                                                <FaFileAlt className={style.fileIcon} />
                                                <p>{task.title || task.task}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={style.topicBadge}>{task.topic}</span>
                                        </td>
                                        <td>
                                            <div className={style.resources}>
                                                {task.resources?.includes("quiz") && <div className={style.iconCircleHelp}><FaQuestionCircle /></div>}
                                                {task.resources?.includes("video") && <div className={style.iconCircleVideo}><FaVideo /></div>}
                                                {task.resources?.includes("image") && <div className={style.iconCircleImage}><FaImage /></div>}
                                            </div>
                                        </td>
                                        <td>

                                            <FaEye className={style.actionIcon} onClick={() => handleView(task)} style={{ color: "#1A83A8" }} />

                                            <FaEdit className={style.actionIcon} onClick={() => handleShowEditPage(task)} style={{ color: "#1A83A8" }} />
                                            <FaTrash className={style.actionIcon} onClick={() => setShowDeleteModal(task.id)} style={{ color: "red" }} />
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

            {showDeleteModal && (
                <div className={style.modalOverlay} onClick={() => setShowDeleteModal(null)}>
                    <div className={style.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={style.modalTitle}>{t('confirm')}</h2>
                        <p>{t('confirmDeleteDesc')}</p>
                        <div className={style.modalButtons}>
                            <button className={style.btnOutline} onClick={() => setShowDeleteModal(null)}>{t('confirmDeleteCancel')}</button>
                            <button className={style.btnActive} style={{ backgroundColor: "red", borderColor: "red" }} onClick={() => handleDelete(showDeleteModal)}>
                                {t('confirmDeleteBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className={style.modalOverlay}>
                    <div className={style.modalContent}>
                        {loadingTopics ? (
                            <div className={style.loading}>
                                <FaSpinner className={style.spinner} />
                            </div>
                        ) : (
                            <>
                                <h2 style={{ marginBottom: "20px", color: "#1A83A8" }}>{t('addTask')}</h2>
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div style={{ marginBottom: "15px" }}>
                                        <label>{t('taskNameLabel')}</label>
                                        <AdminInput type="text" name="task" placeholder={t('enterTaskName')} registerProps={register("task")} />
                                        <InputError error={errors.task} />
                                    </div>

                                    <div style={{ marginBottom: "15px" }}>
                                        <label>{t('topicLabel')}</label>
                                        <select {...register("topic")} defaultValue="" className={style.customSelect} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #1A83A8", backgroundColor: "#E6F7F9", color: "#1A83A8" }}>
                                            <option value="" disabled hidden>{t('selTopic')}</option>
                                            {topics.map((topic) => (
                                                <option key={topic.id} value={topic.id}>{topic.title}</option>
                                            ))}
                                        </select>
                                        <InputError error={errors.topic} />
                                    </div>

                                    <div style={{ marginBottom: "15px" }}>
                                        <label>{t('contentLabel')}</label>
                                        <textarea {...register("content")} rows={3} placeholder={t('contentDes')} style={{ width: "100%", borderRadius: "5px", border: "1px solid #1A83A8", padding: "10px", backgroundColor: "#E6F7F9", color: "#1A83A8" }} />
                                        <InputError error={errors.content} />
                                    </div>

                                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                                        <div style={{ flex: 1 }}>
                                            <label>{t('videoUrlLabel')}</label>
                                            <AdminInput type="url" name="videoUrl" placeholder="https://..." registerProps={register("videoUrl")} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label>{t('imageUrlLabel')}</label>
                                            <AdminInput type="url" name="imageUrl" placeholder="https://..." registerProps={register("imageUrl")} />
                                        </div>
                                    </div>

                                    <div className={style.modalButtons}>
                                        <button type="button" className={style.btnOutline} onClick={() => setShowModal(false)}>{t('cancel')}</button>
                                        <button type="submit" className={style.btnActive}>{t('save')}</button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
