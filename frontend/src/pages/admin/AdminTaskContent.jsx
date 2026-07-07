import React, { useEffect ,useState} from 'react';
import { FiBookOpen } from "react-icons/fi";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";
import styles from './AdminTaskContent.module.css';
import { useNavigate } from 'react-router-dom';
import { useAdminFlow } from '../../context/AdminFlowContext';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import { signupSchemaForTasks } from "../../utils/validationSchema";
import AdminInput from '../../components/ui/AdminInput';
import InputError from "../../components/ui/InputError";
import { useTranslation } from "react-i18next";

import  Notification  from "../../components/ui/Notification";
import api from '../../utils/axios';
import { getVideoEmbedUrl } from '../../utils/video';

export default function AdminTaskContent({ language }) {
    const navigate = useNavigate();
    const { activeTask, topics, fetchTopics } = useAdminFlow();
    const { t, i18n } = useTranslation();
    const [message, setMessage] = useState({ show: false, text: "", type: "success" });
    
    const showMessage = (text, type = "success") => {
        setMessage({ show: true, text, type });
        setTimeout(() => {
            setMessage(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(signupSchemaForTasks),
    });

    useEffect(() => {
        if (activeTask) {
            reset({
                task: activeTask.task,
                topic: activeTask.topic_id,
                content: activeTask.content,
                videoUrl: getVideoEmbedUrl(activeTask.video_url),
                imageUrl: activeTask.image_url,
            });
        } else {
            navigate('/admin/tasks');
        }
    }, [activeTask, reset, navigate]);

    useEffect(() => {
        if (topics.length === 0) {
            fetchTopics();
        }
    }, [fetchTopics, topics.length]);
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

    const onSubmit = async (data) => {
        if (!activeTask) return;

        const selectedTopicId = Number(data.topic || activeTask.topic_id);

        if (!Number.isInteger(selectedTopicId)) {
            showMessage(language === "ar" ? "يرجى اختيار الموضوع" : "Please select a topic", "error");
            return;
        }

        const payload = {
            title: data.task,
            topic_id: selectedTopicId,
            content: data.content,
            video_url: getVideoEmbedUrl(data.videoUrl) || null,
            image_url: data.imageUrl?.trim() || null,
        };

        try {
            if (!ensureAuth()) return;
            const response = await api.put(`/dashboard/tasks/${activeTask.id}/`, payload);
            console.log(response.data, "response update task");
            navigate('/admin/tasks',{
                state: {
                    message: language === "ar" ? "تم تحديث المهمة بنجاح" : "Task updated successfully",
                    type: "success"
                }
            });
        } catch (err) {
            console.error("Error updating task:", err);
            const apiError = err.response?.data;
            const fallbackMessage = language === "ar" ? "فشل تحديث المهمة. يرجى المحاولة مرة أخرى." : "Failed to update task. Please try again.";
            const detail = apiError && typeof apiError === "object"
                ? Object.entries(apiError).map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`).join(" | ")
                : "";
            showMessage(detail || fallbackMessage, "error");
        }
    };

    if (!activeTask) return <div className={styles.container}>Loading...</div>;

    const taskData = {
        lesson_number: "01",
        title: activeTask.task,
        description: activeTask.content,
        image_url: activeTask.image_url,
        video_url: activeTask.video_url,
    };
    console.log(taskData);

    return (
        <div className={language === 'ar' ? styles.taskAr : styles.taskEn}>
            <Notification
                show={message.show}
                text={message.text}
                type={message.type}
            />
            <div className={styles.bgGrid} />

            <div className={styles.banner}>
                <div className={styles.bannerIconWrapper}>
                    <FiBookOpen size={42} className={styles.bookIcon} />
                </div>
                <div className={styles.bannerText}>
                    <span className={styles.lessonSub}>Lesson {taskData.lesson_number}</span>
                    <h2 className={styles.lessonTitle}>{taskData.title}</h2>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className={styles.mainCard}>

                    <div style={{ flex: '1 1 40%' }}>
                        <h3 className={styles.cardTitle}>{taskData.title}</h3>

                    </div>
                    <br />
                    <div style={{ flex: '1 1 50%' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#1A83A8', fontWeight: '500' }}>{t('editTaskName')}</label>
                        <AdminInput type="text" name="task" placeholder={t('editTaskTitle')} registerProps={register("task")} />
                        <InputError error={errors.task} />
                    </div>


                  <br />
                  
                    <div style={{ flex: '1 1 50%' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#1A83A8', fontWeight: '500' }}>{t('editTaskContent')}</label>
                        <textarea {...register("content")} rows={6} placeholder={t('editTaskContent')} style={{ width: "100%", borderRadius: "8px", border: "1px solid #1A83A8", padding: "12px", backgroundColor: "#E6F7F9", color: "#1A83A8", outline: "none", boxSizing: "border-box", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} />
                        <InputError error={errors.content} />
                    </div>

                    <br />
                    <div style={{ flex: '1 1 40%' }}>
                        <p className={styles.cardDescription} style={{ marginBottom: 10 }}><strong>{t('topicSection')}</strong><br />{t('selectTopic')}</p>
                    </div>
                    <div style={{ flex: '1 1 50%' }}>
                        <select {...register("topic")} defaultValue={activeTask.topic_id || ""} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #1A83A8", backgroundColor: "#E6F7F9", color: "#1A83A8", outline: "none", fontSize: "14px" }}>
                            <option value={activeTask.topic_id}>{activeTask.topic}</option>
                            {topics && topics.map((topic) => (
                                <option key={topic.id} value={topic.id}>{topic.title}</option>
                            ))}
                        </select>
                        <InputError error={errors.topic} />
                    </div>

                    <br />
                    <div className={styles.mediaRow}>
                        <div className={styles.mediaBoxImage} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'flex-start' }}>
                            {taskData.image_url && <img src={taskData.image_url} alt="Task" style={{ maxWidth: '100%', borderRadius: '8px' }} />}
                            <span className={styles.mediaTextImg}>{t('imageSupport')}</span>

                            <div style={{ width: '100%', marginTop: 'auto' }}>
                                <label style={{
                                    display: 'block', marginBottom: '8px', color: '#92A6E3', fontWeight: '500',
                                    textAlign: i18n.language === 'ar' ? 'right' : 'left',
                                }}>{t('imageUrl')}</label>
                                <AdminInput type="url" name="imageUrl" placeholder="https://..." registerProps={register("imageUrl")} />
                                <InputError error={errors.imageUrl} />
                            </div>
                        </div>

                        <div className={styles.mediaBoxVideo} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'flex-start' }}>
                            {taskData.video_url ? (
                                <iframe
                                    src={getVideoEmbedUrl(taskData.video_url)}
                                    frameBorder="0"
                                    allowFullScreen
                                    title="Task Video"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    style={{ width: '100%', borderRadius: '8px' }}
                                ></iframe>
                            ) : null}
                            <span className={styles.mediaTextVid}>{t('videoSupport')}</span>

                            <div style={{ width: '100%', marginTop: 'auto' }}>
                                <label style={{
                                    display: 'block', marginBottom: '8px', color: '#D9AEFB', fontWeight: '500',
                                    textAlign: i18n.language === 'ar' ? 'right' : 'left',
                                }}>{t('videoUrl')}</label>
                                <AdminInput type="url" name="videoUrl" placeholder="https://..." registerProps={register("videoUrl")} />
                                <InputError error={errors.videoUrl} />
                            </div>
                        </div>
                    </div>

                </div>

                <div className={styles.footerNav} style={{ marginTop: '24px' }}>
                    <button type="button" className={styles.navButtonLeft} onClick={() => navigate('/admin/tasks')}>
                        {language === 'ar'
                            ? <HiOutlineArrowRight size={24} />
                            : <HiOutlineArrowLeft size={24} />
                        }
                        <span>{t('cancel')}</span>
                    </button>
                    <button type="submit" style={{ backgroundColor: '#1A83A8', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'background-color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#07526B'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1A83A8'}>
                        <span>{t('saveChanges')}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
