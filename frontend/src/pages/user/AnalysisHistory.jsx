import React, { useEffect, useState } from 'react';
import style from "./AnalysisHistory.module.css";
import { useTranslation } from "react-i18next";

import { FaExchangeAlt, FaFileAlt } from "react-icons/fa";
import { useUserFlow } from '../../context/UserFlowContext';
import { useNavigate } from "react-router-dom";
import EmptyPage from "../../components/ui/EmptyPage";
import emptyHistory from "../../images/emptyHistory.png";
import api from "../../utils/axios";
import { notify } from "../../utils/toast";





export default function AnalysisHistory({ language }) {
    const { history,setHistory, setCvId} = useUserFlow(); /*  هاد رح نستخدمها بس يكون الربط كلو شغال*/
    // const [fakeHistory, setFakeHistory] = useState([]);
    const [preparingId, setPreparingId] = useState(null);
    const navigate = useNavigate();
    const { t } = useTranslation();



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


    const fetchHistory = async() => {
        if (!ensureAuth()) return;
        try{
                const response = await api.get("/userr/analysis-history/");
                setHistory(response.data);
                console.log(response.data);
            }
        catch (error) {
                console.log(error);
            }
        }

    useEffect(() => {
        fetchHistory();
        
    }, []);

    const handleViewAnalysis = (item) => {
        const analysisId = item.analysisId || item.cv_id || item.id;
        const sourceQuery = item.source ? `?source=${item.source}` : "";
        setCvId(item.cv_id || analysisId);
        navigate(`/user/analysisReport/${analysisId}${sourceQuery}`, {
            state: {
                mode: "history",
                source: item.source,
                score: item.score
            }
        });
    };

    const handleUseForPlan = async (item) => {
        if (!ensureAuth()) return;
        const analysisId = item.analysisId || item.cv_id || item.id;

        try {
            setPreparingId(item.id);
            const source = item.source || (item.cv_id ? "cv" : "history");
            const response = await api.post(
                `/userr/analysis-history/${analysisId}/prepare-cv/`,
                { source }
            );
            const selectedCvId = response.data.cv_id;
            if (!selectedCvId) {
                throw new Error("Missing prepared CV id");
            }
            setCvId(selectedCvId);

            if (response.data.requires_assessment === false) {
                navigate("/user/plan", {
                    state: {
                        learningPlanId: response.data.learning_plan_id,
                        cvId: selectedCvId,
                    }
                });
                return;
            }

            navigate(`/user/analysisReport/${selectedCvId}?source=cv`, {
                state: {
                    mode: "new",
                    source: "cv",
                    selectedField: item.field,
                    score: item.score,
                    cvId: selectedCvId
                }
            });
        } catch (error) {
            console.error("Error preparing analysis CV:", error);
            notify(
                language === "ar"
                    ? "تعذر تجهيز هذا التحليل لخطة التعلم"
                    : "Could not prepare this analysis for the learning plan",
                "error"
            );
        } finally {
            setPreparingId(null);
        }
    };

    return (
        <div className={language === 'ar' ? style.historyAr : style.historyEn}>

            {history.length === 0 ? (
                <EmptyPage
                    icon={<img src={emptyHistory} width="200" height="150" />}
                    title={t('emptyHistoryTitle')}
                    message={t('emptyHistoryMessage')}
                    btnText={t('upload')}
                    onClick={() => navigate("/user/upload")}
                />
            ) : (<>

                <div className={style.historyHead}>
                                <div className={style.bgGrid} />
                    
                    <p className={style.journey}>{t('journey')}</p>
                    <h1><b>{t('analysisHistoryTitle')}</b></h1>
                    <p>{t('analysisHistoryDesc')}</p>
                </div>

                <div className={style.cards}>
                    {history.map((item) => (
                        <div key={item.id} className={style.historyCard}>
                            <div className={style.left}>
                                <div className={style.cardIcon}>
                                    <FaFileAlt className={style.iconForCard} />
                                </div>

                                <div>
                                    <p className={style.feildTitle}>
                                        <b>{item.field}</b>
                                    </p>
                                    <p className={style.cvFileName}>
                                        {item.fileName}
                                    </p>
                                </div>
                            </div>

                            <div className={style.actions}>
                                <button
                                    type="button"
                                    className={style.viewFullAn}
                                    onClick={() => handleViewAnalysis(item)}
                                >
                                    {t('viewFullAnalysis')}
                                </button>
                                <button
                                    type="button"
                                    className={style.usePlanBtn}
                                    onClick={() => handleUseForPlan(item)}
                                    disabled={preparingId === item.id}
                                >
                                    <FaExchangeAlt />
                                    {preparingId === item.id
                                        ? t('preparingCv', 'Preparing...')
                                        : t('useForPlan', 'Use for plan')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </>)}

        </div >
    )
}
