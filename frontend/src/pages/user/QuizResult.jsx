import style from "./TaskAssQuiz.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import CircularScore from '../../components/ui/CircularScore';
import { useUserFlow } from '../../context/UserFlowContext';
import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaTimesCircle, FaBookOpen } from "react-icons/fa";
import { useEffect } from "react";

export default function QuizResult({ language }) {
    const { t } = useTranslation();

    const navigate = useNavigate();
    const { state } = useLocation();
    const { placementScore } = useUserFlow();
    const score = state?.score ?? placementScore;
    const mode = state?.mode;
    const isTask = mode === "task";
    const passed = state?.passed ?? false;

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
    }

    useEffect(() => {
        ensureAuth();
    }, []);
    return (
        <div className={language === 'ar' ? style.quizResultAr : style.quizResultEn}>
            <div className={style.bgGrid} />

            <CircularScore score={score} />

            <div className={style.card}>

                <div className={style.emoji}>
                    {!isTask ? (
                        <FaBookOpen />
                    ) : passed ? (
                        <FaCheckCircle color="#00e5c3" />
                    ) : (
                        <FaTimesCircle color="#ff4d4f" />
                    )}
                </div>

                <h2 className={style.title}>
                    <b>
                        {!isTask
                            ? t('quizResultTitle')
                            : passed
                                ? t('taskCompleted')
                                : t('taskFailed')}
                    </b>
                </h2>

                <p className={style.description}>
                    {!isTask ? (
                        t('descriptionQuizResult')
                    ) : passed ? (
                        t('taskSuccessMsg')
                    ) : (
                        t('taskFailMsg')
                    )}
                </p>
            </div>
            <button
                className={style.planBtn}
                onClick={() => navigate('/user/plan')}
            >
                <b>
                    {isTask
                        ? t('returnPlan')
                        : t('viewPlan')}
                </b>
            </button>
        </div>
    );
}
