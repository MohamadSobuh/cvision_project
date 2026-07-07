import React from 'react';
import { FiBookOpen, FiImage } from "react-icons/fi";
import { FaPlayCircle } from "react-icons/fa";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";
import styles from './AdminTaskContent.module.css';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAdminFlow } from '../../context/AdminFlowContext';
import { useTranslation } from "react-i18next";
import { getVideoEmbedUrl } from '../../utils/video';

export default function ViewTaskContent({ language }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { activeTask } = useAdminFlow();
    const [taskData, setTaskData] = useState(null);

    const Data = {
        "lesson_number": "01",
        "title": activeTask.task,
        "description": activeTask.content,
        "image_url": activeTask.image_url,
        "video_url": activeTask.video_url,
        "quiz_id": activeTask.quiz_id,
        "is_completed": activeTask.is_completed
    };
    console.log("activeTask", activeTask);

    useEffect(() => {
        const fetchTaskData = async () => {
            try {
                console.log(activeTask);
                setTaskData(Data);
            } catch (error) {
                console.error('Error fetching task data:', error);
            }
        };
        fetchTaskData();
    }, [activeTask]);

    if (!activeTask || !taskData) return <div>Loading...</div>;

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
                        {taskData.image_url && <img src={taskData.image_url} alt="Task" />}
                        <span className={styles.mediaTextImg}>Image support</span>
                    </div>

                    <div className={styles.mediaBoxVideo}>
                        {taskData.video_url && (
                            <iframe
                                src={getVideoEmbedUrl(taskData.video_url)}
                                frameBorder="0"
                                allowFullScreen
                                title="Task Video"
                                referrerPolicy="strict-origin-when-cross-origin"
                            ></iframe>
                        )}
                        <span className={styles.mediaTextVid}>Video support</span>
                    </div>
                </div>
            </div>

            <div className={styles.footerNav}>
                <button className={styles.navButtonLeft} onClick={() => navigate('/admin/tasks')}>
                    {language === 'ar'
                        ? <HiOutlineArrowRight size={24} />
                        : <HiOutlineArrowLeft size={24} />
                    }
                    <span>{t('backToTasks')}</span>
                </button>
                <button className={styles.navButtonRight} onClick={() => navigate('/admin/quiz')}>
                    <span>{t('goToQuiz')}</span>
                    {language === 'ar'
                        ? <HiOutlineArrowLeft size={24} />
                        : <HiOutlineArrowRight size={24} />
                    }
                </button>
            </div>
        </div>
    );
}
