import style from "./TaskAssQuiz.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import CircularScore from '../../components/ui/CircularScore';
import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export default function TaskAnswerResalt({ language }) {
    const { t } = useTranslation();

    const navigate = useNavigate();
    const { state } = useLocation();
    const score = Number(state?.score) || 0;
    const passed = score >= 80;

   

    
    return (
        <div className={language === 'ar' ? style.quizResultAr : style.quizResultEn}>
            <div className={style.bgGrid} />

            <CircularScore score={score} />

            <div className={style.card}>
                <div className={style.emoji}>
                    {passed ? (
                        <FaCheckCircle color="#00e5c3" />
                    ) : (
                        <FaTimesCircle color="#ff4d4f" />
                    )}
                </div>

                <h2 className={style.title}>
                    <b>{passed ? t('taskCompleted') : t('taskFailed')}</b>
                </h2>

                <p className={style.description}>
                    {passed ? t('taskSuccessMsg') : t('taskFailMsg')}
                </p>
            </div>
            <button
                className={style.planBtn}
                onClick={() => navigate('/user/plan')}
            >
                <b>{t('returnPlan')}</b>
            </button>
        </div>
    );
}