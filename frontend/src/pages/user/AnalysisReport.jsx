import { useEffect } from 'react'
import style from "./AnalysisReport.module.css";
import { useTranslation } from "react-i18next";

import CircularScore from '../../components/ui/CircularScore';
import { useUserFlow } from '../../context/UserFlowContext';
import { FaCheckCircle, FaExchangeAlt, FaExclamationCircle, FaLightbulb } from "react-icons/fa";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from '../../utils/axios';


export default function AnalysisReport({ language }) {
    const { analysisResult, setAnalysisResult, placementScore, cvId: contextCvId } = useUserFlow();
    const { cvId: routeCvId } = useParams();
    const cvId = routeCvId || contextCvId;
    const { state } = useLocation();
    const [searchParams] = useSearchParams();
    const source = state?.source || searchParams.get("source");
    const isNew = state?.mode === "new";
    const selectedField = state?.selectedField;
    const navigate = useNavigate();
        console.log("cvId",cvId);


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
    
    const fetchAnalysisResult = async() => {
        if(!ensureAuth()) return;
        
        try{
            const response = await api.get(`/userr/analysis-report/${cvId}/`, {
                params: source ? { source } : {}
            });
            setAnalysisResult(response.data);
            console.log(response.data);
        }
        catch (error) {
            console.log(error);
        }
    }


    useEffect(() => {
        fetchAnalysisResult();
    }, [cvId, source]);

    function getScoreDes(score) {
        if (score < 50) return "Needs Improvement";
        if (score < 80) return "Good CV";
        return "Excellent CV!";
    }

    function getColor(score) {
        if (score < 50) return "#f4a0a0";
        if (score < 80) return "#ffbb3e";
        return "#84f4a8";
    }

    const { t } = useTranslation();


    const strengthsList = analysisResult?.strengths || [];
    const weaknessesList = analysisResult?.weaknesses || [];

    return (
        <div className={language === 'ar' ? style.reportAr : style.reportEn}>
            <div className={style.bgGrid} />

            <p className={style.feildStyle}>Feild : <b>{analysisResult?.field || "NOT SPECIFIED"}</b></p>

            <h1 className={style.reportTitle}><b>{t('reportTitle')}</b></h1>
            <div className={`row ${style.headReport}`}>

                <div className='col-md-3'>
                    <CircularScore score={analysisResult.score} />
                </div>
                <div className={`col-md-8 ${style.headReportText}`}>
                    <h2 style={{ "--score-color": getColor(analysisResult.score) }} className={language === 'ar' ? style.ScoreTextEn : style.ScoreText}>{getScoreDes(analysisResult.score)}</h2>
                    <p className={language === 'ar' ? style.decCVEn : style.decCV}>{analysisResult?.recommendations?.[0] || "No recommendations available"}</p>
                </div>
            </div>

            <div className='row'>

                <div className=' col-md-6'>
                    <div className={style.bgGrid} />

                    <div className={style.strengths}>
                        <div className={style.strengtWeakhHeader}>
                            <FaCheckCircle className={style.headIcons} />
                            <h3>{t('strengths')}</h3>
                        </div>

                        {strengthsList.map((item) => (
                            <div className={style.strengthStyle}>
                               <b>{typeof item === 'object' ? (item.skill || item.title || "Skill") : item}</b>
                                <p>{typeof item === 'object' ? item.matched_text : ''}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className=' col-md-6'>
                    <div className={style.weaknesses}>
                        <div className={style.strengtWeakhHeader}>
                            <FaExclamationCircle className={style.headIcons} />
                            <h3>{t('weaknesses')}</h3>
                        </div>

                        {weaknessesList.map((item) => (
                            <div className={style.weakStyle}>
                               <b>{typeof item === 'object' ? (item.skill || item.title || "Skill") : item}</b>
                               <p>{typeof item === 'object' ? item.reason : ''}</p>
                            </div>
                        ))}

                    </div>
                </div>
            </div>

            <div className={style.startAssessQuiz}>
                <FaLightbulb className={style.iconForStartAssessment} />
                {isNew ? <>
                    <h2>{t('readyToValidate')}</h2>
                    <p>{t('TakeAdaptiveQuiz')}</p>
                </>
                    : <> <h2>{t('readyToValidateF')}</h2>
                        <p>{t('TakeAdaptiveQuizF')}</p></>}

                <div className={style.assessmentActions}>
                    <button className={style.startAssessment} onClick={() => isNew && navigate('/user/InitalAssQuiz', {
                        state: {
                            weaknesses: analysisResult.weaknesses,
                            mode: "assessment",
                            selectedField: analysisResult.field || selectedField,
                            cvId
                        }
                    })} disabled={!isNew} >

                        {isNew
                            ? t('startQuiz')
                            : `Your Quiz Score: ${placementScore || 0}%`}
                    </button>
    
                </div>
            </div>
        </div>
    )
}

