import style from "./EndOfPlan.module.css";
import { FaTrophy, FaCheckCircle, FaTasks, FaStar, FaMedal, FaHome } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";


export default function EndOfPlan({ language }) {
    const { t, i18n } = useTranslation();
    

    const location = useLocation();
    const stats = location.state?.stats;

    return (
        <div className={language === 'ar' ? style.endPlanAr : style.endPlanEn}>
            <div className={style.bgGrid} />

            <div className={style.card}>
                <div className={style.trophy}>
                    <FaTrophy />
                </div>
                <p className={style.completed}> <FaMedal /><b>{t('planCompleted')}</b></p>
                <h1><b>{t('congratulations')}</b></h1>
                <div className={style.des}>
                    <p>{t('descriptionLine1')}
                        <br />
                        {t('descriptionLine2')}
                    </p>
                </div>

                <div className={style.stats}>
                    <div className={style.statBox}>
                        <FaCheckCircle style={{ color: "#1A83A8" }} />
                        <br />
                        <b> {stats
                            ? `${stats.completedTasks}/${stats.totalTasks}`
                            : "12/12"} </b>
                        <p>{t('tasks')}</p>
                    </div>

                    <div className={style.statBox}>
                        <FaTasks style={{ color: "#5041c4" }} />
                        <br />
                        <b> {`${stats?.completedTasks ?? 12}/${stats?.totalTasks ?? 12}`} </b>
                        <p>{t('quizzes')}</p>
                    </div>

                    <div className={style.statBox}>
                        <FaStar style={{ color: "rgb(255, 208, 0)" }} />
                        <br />
                        <b> {stats?.score ?? 90}%</b>
                        <p>{t('score')}</p>
                    </div>
                </div>

                <hr />

                <Link to="/user/dashboard" className={style.toDashOrPlan}>
                    <FaHome />
                    <b>{t('returnDashboard')}</b>
                </Link>

            </div>

        </div>
    )
}
