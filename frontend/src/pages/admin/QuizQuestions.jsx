import React, { useCallback, useRef, useState, useEffect } from 'react';
import style from "./Quiz.module.css";
import QuestionCard from "../../components/ui/QuestionCard";
import { useTranslation } from "react-i18next";

import AddQuestionsForm from "./AddQuestionsForm";
import EmptyPage from "../../components/ui/EmptyPage";
import AdminDataState from "../../components/ui/AdminDataState";
import { FaQuestionCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { FaFilter } from "react-icons/fa";
import Notification from '../../components/ui/Notification';
import api from '../../utils/axios';


const QuizQuestions = ({ language = 'en' }) => {
    const [questions, setQuestions] = useState([]);
    const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();
    const questionsPerPage = 4;
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [tasksFromDB, setTasksFromDB] = useState([]);
    const [filterTopic, setFilterTopic] = useState('');
    const [filterQuestionType, setFilterQuestionType] = useState('');
    const [filterTask, setFilterTask] = useState('');
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const filtersLoadedRef = useRef(false);

    const [message, setMessage] = useState({ show: false, text: "", type: "success" });

    const showMessage = (text, type = "success") => {
        setMessage({ show: true, text, type });
        setTimeout(() => {
            setMessage(prev => ({ ...prev, show: false }));
        }, 3000);
    };
    const ensureAuth = useCallback(() => {
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
    }, [language, navigate]);
    
    
    const handleEdit = async (data) => {
        console.log(data, "data before update");
        if (!ensureAuth()) return;

        try {
            const response = await api.put(`/dashboard/questions/${showEditModal.id}/`, data);
            
            console.log(response.data, "response");
            setQuestions(prevQuestions =>
                prevQuestions.map((q) =>
                    q.id === showEditModal.id ? response.data : q
                )
            );
            setShowEditModal(null);
            showMessage(language === "ar" ? "تم تعديل السؤال بنجاح" : "Question updated successfully", "success");
        } catch (error) {
            setShowEditModal(null);
            console.error("Error updating question:", error.response?.data || error);
            showMessage(language === "ar" ? "حدث خطأ" : "An error occurred", "error");
        }
    };
    const handleDelete = async () => {
        if (!ensureAuth()) return;
        try {
            await api.delete(`/dashboard/questions/${showDeleteModal}/`);
            setQuestions(questions.filter((q) => q.id !== showDeleteModal));
            setTotalQuestionsCount(prev => Math.max(prev - 1, 0));
            showMessage(language === "ar" ? "تم حذف السؤال بنجاح" : "Question deleted successfully", "success");
            setShowDeleteModal(null);
        } catch (error) {
            setShowDeleteModal(null);
            console.error("Error fetching questions:", error);
            showMessage(language === "ar" ? "حدث خطأ" : "An error occurred", "error");
        }
    };

    const { t } = useTranslation();

    const loadPageData = useCallback(async () => {
        if (!ensureAuth()) return;

        setLoading(true);
        setLoadError(false);
        try {
            const [questionsResponse, tasksResponse, topicsResponse] = await Promise.all([
                api.get("/dashboard/questions/", {
                    params: {
                        paginate: 1,
                        page: currentPage,
                        page_size: questionsPerPage,
                        topic: filterTopic || undefined,
                        question_type: filterQuestionType || undefined,
                        task: filterTask || undefined,
                    }
                }),
                filtersLoadedRef.current ? Promise.resolve(null) : api.get("/dashboard/tasks/", {
                    params: {
                        summary: 1,
                    }
                }),
                filtersLoadedRef.current ? Promise.resolve(null) : api.get("/dashboard/topics/"),
            ]);
            setQuestions(questionsResponse.data.results || questionsResponse.data);
            setTotalQuestionsCount(questionsResponse.data.count ?? questionsResponse.data.length);
            if (tasksResponse) {
                setTasksFromDB(tasksResponse.data);
            }
            if (topicsResponse) {
                setTopics(topicsResponse.data);
            }
            filtersLoadedRef.current = true;
        } catch (error) {
            console.error("Error loading questions page:", error);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [currentPage, ensureAuth, filterQuestionType, filterTask, filterTopic, questionsPerPage]);

    useEffect(() => {
        loadPageData();
    }, [loadPageData]);

    const handleAdd = async (data) => {
        console.log(data);
        console.log(data.task, "task");

        const optionsArray = [
            { text: data.options[0].text, is_Correct: data.options[0].isCorrect },
            { text: data.options[1].text, is_Correct: data.options[1].isCorrect },
            { text: data.options[2].text, is_Correct: data.options[2].isCorrect },
            { text: data.options[3].text, is_Correct: data.options[3].isCorrect }
        ];
        console.log(optionsArray, "optionsArray");

        const correctIndex = optionsArray.findIndex(opt => opt.is_Correct);
        const correctLetter = ["A", "B", "C", "D"][correctIndex] || "A";

        const getServerType = (type) => {
            if (type === "Task Quiz") return "task_quiz";
            if (type === "Placement Test") return "placement";
            return type;
        };

        const payload = {
            question_type: getServerType(data.type),
            question_text: data.text,
            task: data.task || null,
            correct_answer: correctLetter,
            order: 1,
            options: optionsArray
        };
        console.log(payload, "payload");
        if (!ensureAuth()) return;
        try {
            const response = await api.post("/dashboard/questions/", payload);
            showMessage(language === "ar" ? "تم إضافة السؤال بنجاح" : "Question added successfully", "success");
            console.log(response.data, "questions");
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                loadPageData();
            }
        } catch (error) {
            console.error("Server Validation Error:", error.response?.data);
            showMessage(language === "ar" ? "حدث خطأ" : "An error occurred", "error");
        }


        setShowAddModal(false);
    };
    useEffect(() => {
        setCurrentPage(1);
    }, [filterTopic, filterQuestionType, filterTask]);

    const totalPagesFilter = Math.ceil(totalQuestionsCount / questionsPerPage);
    const currentQuestionsFilter = questions;

    const handleNext = () => currentPage < totalPagesFilter && setCurrentPage(prev => prev + 1);
    const handlePrev = () => currentPage > 1 && setCurrentPage(prev => prev - 1);

    return (
        <div className={language === 'ar' ? style.dashArabic : style.dash} dir={language === 'ar' ? 'rtl' : 'ltr'}>
            {loading ? (
                <AdminDataState
                    title={t("loadingQuestions")}
                    message={t("loadingQuestionsWait")}
                />
            ) : loadError ? (
                <AdminDataState
                    type="error"
                    title={t("questionsLoadError")}
                    message={t("adminLoadErrorMessage")}
                    retryLabel={t("retry")}
                    onRetry={loadPageData}
                />
            ) : questions.length === 0 ? (
                <EmptyPage
                    icon={<FaQuestionCircle />}
                    title={t('emptyQuestionsTitle')}
                    message={t('emptyQuestionsMessage')}
                    btnText={t('addQuestion')}
                    onClick={() => setShowAddModal(true)}
                />
            ) : (
                <>
                    <div className='row align-items-center justify-content-between mb-4'>
                        <div className={style.bgGrid} />

                        <div className='col-md-6'>
                            <h1><b>{t('quizTitle')}</b></h1>
                            <p>{t('quizSub')}</p>
                        </div>
                        <div className={`col-md-6 ${language === 'ar' ? 'text-start' : 'text-end'}`}>
                            <button onClick={() => setShowAddModal(true)} className={style.btnAdd}>
                                + {t('addQuestion')}
                            </button>
                        </div>
                        <div className="col-md-12">
                            <br />
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <div className={style.filterSelectContainer}>
                                        <FaFilter className={style.filterIcon} />
                                        <select
                                            className={style.customSelect}
                                            value={filterTopic}
                                            onChange={(e) => setFilterTopic(e.target.value)}
                                        >
                                            <option value="">{t('allTopics')}</option>
                                            {topics.map((topic) => (
                                                <option key={topic.id} value={topic.title}>
                                                    {topic.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="col-md-4">
                                    <div className={style.filterSelectContainer}>
                                        <FaFilter className={style.filterIcon} />
                                        <select
                                            className={style.customSelect}
                                            value={filterQuestionType}
                                            onChange={(e) => setFilterQuestionType(e.target.value)}
                                        >
                                            <option value="">{t('allTypesQuestions')}</option>
                                            <option value="task_quiz">{t('taskQuiz')}</option>
                                            <option value="placement">{t('placementTest')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="col-md-4">
                                    <div className={style.filterSelectContainer}>
                                        <FaFilter className={style.filterIcon} />
                                        <select
                                            className={style.customSelect}
                                            value={filterTask}
                                            onChange={(e) => setFilterTask(e.target.value)}
                                        >
                                            <option value="">{t('allTasks')}</option>
                                            {tasksFromDB.map((task) => (
                                                <option key={task.id} value={task.task}>
                                                    {task.task}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className='row'>
                        {currentQuestionsFilter.map((q) => (
                            <div key={q.id} className='col-lg-6 mb-4'>
                                <QuestionCard
                                    question={q}
                                    language={language}
                                    onEditClick={(question) => setShowEditModal(question)}
                                    onDeleteClick={(id) => setShowDeleteModal(id)}
                                    t={t}
                                />
                            </div>
                        ))}
                    </div>
                </>
            )}

            {showAddModal && (
                <AddQuestionsForm t={t} handleAdd={handleAdd} tasksFromDB={tasksFromDB} onClose={() => setShowAddModal(false)} />
            )}
            {showEditModal && (
                <AddQuestionsForm t={t} formData={showEditModal} handleEdit={handleEdit} tasksFromDB={tasksFromDB} onClose={() => setShowEditModal(null)} />
            )}
            {showDeleteModal && (
                <div className={style.modalOverlay} onClick={() => setShowDeleteModal(null)}>
                    <div className={style.modalContent} onClick={e => e.stopPropagation()}>
                        <h2 className={style.modalTitle}>{t('confirm')}</h2>
                        <p>{t('confirmDeleteDesc')}</p>
                        <div className={style.modalButtons}>
                            <button className={style.btnOutline} onClick={() => setShowDeleteModal(null)}>{t('confirmDeleteCancel')}</button>
                            <button className={style.btnActive} style={{ backgroundColor: 'red', borderColor: 'red' }} onClick={handleDelete}>{t('confirmDeleteBtn')}</button>
                        </div>
                    </div>
                </div>
            )}

            {totalPagesFilter > 1 && (

                <div className={style.foot}>
                    <button className={style.btnOutline} onClick={handlePrev}>{t('prev')}</button>
                    <button className={style.btnActive} style={{ background: "#1A83A8" }}>{currentPage}</button>
                    <button className={style.btnOutline} onClick={handleNext}>{t('next')}</button>
                </div>
            )}
            <Notification
                show={message.show}
                text={message.text}
                type={message.type}
            />
        </div>
    );
};

export default QuizQuestions;
