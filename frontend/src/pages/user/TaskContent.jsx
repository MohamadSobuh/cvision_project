import React from 'react';
import { FiBookOpen } from "react-icons/fi";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";
import styles from './TaskContent.module.css';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserFlow } from '../../context/UserFlowContext';
import { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import api from "../../utils/axios";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getVideoEmbedUrl } from "../../utils/video";

export default function TaskContent({ language }) {
    const navigate = useNavigate();
    const { planTaskId } = useParams();
    const { activeTask } = useUserFlow();
    const { t } = useTranslation();
    const [taskData, setTaskData] = useState(null);
    const [isImageOpen, setIsImageOpen] = useState(false);


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


    useEffect(() => {
        if (!ensureAuth()) return;
        const fetchTaskData = async () => {
            try {
                const response = await api.get(`/userr/task-content/${planTaskId}/`);
                setTaskData(response.data);
            } catch (error) {
                console.error('Error fetching task data:', error);
            }
        };
        fetchTaskData();
    }, [activeTask, planTaskId]);

    if (!taskData) {
        return <LoadingScreen />;
    }

    const embedVideoUrl = getVideoEmbedUrl(taskData.video_url);
    
    return (
        <div className={language === 'ar' ? styles.taskAr : styles.taskEn}>
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

            <div className={styles.mainCard}>
                <h3 className={styles.cardTitle}>{taskData.title}</h3>
                <p className={styles.cardDescription}>{taskData.description}</p>

                <div className={styles.mediaRow}>
                    <div className={styles.mediaBoxImage}>
                        {taskData.image_url && (
                            <button
                                type="button"
                                className={styles.imageButton}
                                onClick={() => setIsImageOpen(true)}
                                aria-label="Open task image"
                            >
                                <img src={taskData.image_url} alt="Task" className={styles.img} />
                            </button>
                        )}
                    </div>

                    <div className={styles.mediaBoxVideo}>
                        {embedVideoUrl && (
                            <iframe
                                src={embedVideoUrl}
                                frameBorder="0"
                                allowFullScreen
                                title="Task Video"
                                referrerPolicy="strict-origin-when-cross-origin"
                                className={styles.videoFrame}
                            ></iframe>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.footerNav}>
                <button className={styles.navButtonLeft} onClick={() => navigate('/user/plan')}>
                    {language === 'ar'
                        ? <HiOutlineArrowRight size={24} />
                        : <HiOutlineArrowLeft size={24} />
                    }
                    <span>{t('backToPlan')}</span>
                </button>
                <button className={styles.navButtonRight} onClick={() => navigate(`/user/quiz/${planTaskId}`, {
                    state: {
                        mode: "task",
                        activeTask: activeTask || { id: Number(planTaskId), title: taskData.title },
                    }
                })}>
                    <span>{t('goToQuiz')}</span>
                    {language === 'ar'
                        ? <HiOutlineArrowLeft size={24} />
                        : <HiOutlineArrowRight size={24} />
                    }
                </button>
            </div>

            {isImageOpen && taskData.image_url && (
                <div className={styles.imageOverlay} onClick={() => setIsImageOpen(false)}>
                    <div className={styles.imagePreview} onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className={styles.closeImageButton}
                            onClick={() => setIsImageOpen(false)}
                            aria-label="Close image preview"
                        >
                            ×
                        </button>
                        <img src={taskData.image_url} alt="Task enlarged" />
                    </div>
                </div>
            )}
        </div>
    );
}
