import { useCallback, useEffect, useMemo, useState } from 'react';
import planEmpty from "../../images/planEmpty.png";
import { useTranslation } from "react-i18next";
import EmptyPage from "../../components/ui/EmptyPage";
import AdminDataState from "../../components/ui/AdminDataState";
import { useNavigate } from "react-router-dom";
import style from "./Plan.module.css";
import TopicList from "./TopicList";
import TaskList from "./TaskList";
import { useUserFlow } from '../../context/UserFlowContext';
import api from '../../utils/axios';


export default function Plan({ language }) {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [activeTopicId, setActiveTopicId] = useState(null);
    const { setActiveTask } = useUserFlow();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const loadPlan = useCallback(async () => {
        setLoading(true);
        setLoadError(false);

        try {
            const response = await api.get("/userr/learning-plan/");
            setPlan(response.data);
            setActiveTopicId(response.data.modules?.[0]?.id ?? null);
        } catch (error) {
            setPlan(null);
            setActiveTopicId(null);

            if (error.response?.status !== 404) {
                console.error("Error loading learning plan:", error);
                setLoadError(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPlan();
    }, [loadPlan]);

    const planData = useMemo(() => plan?.modules || [], [plan?.modules]);
    const selectedTopic = useMemo(
        () => planData.find((topic) => topic.id === activeTopicId),
        [planData, activeTopicId],
    );

    const handleTaskClick = async (task) => {
        setActiveTask(task);
        if (task.status === "pending") {
            try {
                await api.patch(`/userr/learning-plan/tasks/${task.id}/`, {
                    status: "in_progress",
                });
            } catch (error) {
                console.error(error);
            }
        }
        navigate(`/user/task/${task.id}`);
    };

    return (
        <div className={language === 'ar' ? style.planContainerAr : style.planContainerEn}>
            <div className={style.bgGrid} />
            {loading ? (
                <AdminDataState
                    title={t("loadingPlan")}
                    message={t("loadingPlanWait")}
                />
            ) : loadError ? (
                <AdminDataState
                    type="error"
                    title={t("planLoadError")}
                    message={t("planLoadErrorMessage")}
                    retryLabel={t("retry")}
                    onRetry={loadPlan}
                />
            ) : !plan ? (
                <EmptyPage
                    icon={<img src={planEmpty} width="200" alt="" />}
                    title={t('assessmentRequiredTitle')}
                    message={t('assessmentRequiredMessage')}
                    btnText={t('goToHistory')}
                    onClick={() => navigate("/user/analysisHistory")}
                />
            ) : (
                <>
                    <div className={style.planHead}><b>{plan.target_field}</b> {t("planTitle")}</div>
                    <div className={style.headerRow}>
                        <div className={style.headerLeft}>
                            <h1 className={style.planTitle}><b>{plan.title}</b></h1>
                            {plan.source_cv_file_name && (
                                <p className={style.cvSourceLabel}>
                                    {t('planCvSource', 'Using CV')}: <b>{plan.source_cv_file_name}</b>
                                </p>
                            )}
                            <p className={style.planSubtitle}>{plan.description}</p>
                            {plan.unavailable_skills?.length > 0 && (
                                <p className={style.planSubtitle}>
                                    Content not yet available: {plan.unavailable_skills.join(", ")}
                                </p>
                            )}
                        </div>
                        <div className={style.headerRight}>
                            <div className={style.overallProgressContainer}>
                                <div className={style.progressLabelRow}>
                                    <span>{t('overallProgress')}</span>
                                    <span>{plan.completed_tasks}/{plan.total_tasks} {t('tasks')}</span>
                                </div>
                                <div className={style.progressBarContainer}>
                                    <div className={style.progressBarFill} style={{ width: `${plan.progress_percentage}%` }} />
                                </div>
                                <div className={style.progressPercent}>{plan.progress_percentage}%</div>
                            </div>
                        </div>
                    </div>
                    {planData.length === 0 ? (
                        <EmptyPage
                            icon={<img src={planEmpty} width="200" alt="" />}
                            title="No remaining learning gaps"
                            message="Your placement result did not assign any available learning modules."
                            btnText={t('changeCv', 'Change CV')}
                            onClick={() => navigate("/user/analysisHistory")}
                        />
                    ) : (
                        <div className={style.mainContent}>
                            <TopicList
                                planData={planData}
                                activeTopicId={activeTopicId}
                                onTopicClick={(topic) => setActiveTopicId(topic.id)}
                            />
                            <TaskList
                                activeTopic={selectedTopic}
                                onTaskClick={handleTaskClick}
                                language={language}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
