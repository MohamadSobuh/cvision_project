import React, { useState, useEffect, useRef } from 'react';
import style from "../../pages/admin/Quiz.module.css";
import { FaCheckCircle, FaTimesCircle, FaEllipsisH, FaEdit, FaTrash, FaQuestionCircle } from "react-icons/fa";

const QuestionCard = ({ question, language, t, onEditClick, onDeleteClick }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="card shadow-sm border-0 p-4 mb-4 position-relative" style={{ borderRadius: '20px' }}>

            <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="d-flex gap-2 flex-wrap align-items-center">
                    <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: '#E0F2F1', color: '#07526B' }}>
                        {question.type}
                    </span>
                    <span className={style.quizSub}>
                        <span className="mx-1">•</span> {question.topic}<span className="mx-1">•</span> {question.task}
                    </span>
                </div>

                <div className={style.menuContainer} ref={menuRef}>
                    <FaEllipsisH
                        className={style.moreIcon}
                        onClick={() => setShowMenu(!showMenu)}
                        style={{ cursor: 'pointer', color: '#6997A4' }}
                    />

                    {showMenu && (
                        <div className={`${style.dropdownMenu} ${language === 'ar' ? style.menuAr : style.menuEn}`}>
                            <button className={style.menuItem} onClick={() => {
                                onEditClick(question);
                                setShowMenu(false);
                            }}>
                                <FaEdit className={`${language === 'ar' ? 'ms-2' : 'me-2'} text-success`} />
                                {t('edit')}
                            </button>

                            <button className={style.menuItem} onClick={() => {
                                onDeleteClick(question.id);
                                setShowMenu(false);
                            }}>
                                <FaTrash className={`${language === 'ar' ? 'ms-2' : 'me-2'} text-danger`} />
                                {t('delete')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* نص السؤال */}
            <h5 className={style.quizTitle} style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                {question.text}
            </h5>

            {/* الخيارات */}
            <div className="row g-2">
                {question.options.map((option, index) => (
                    <div key={index} className="col-12 col-md-6">
                        <div
                            className={`p-3 h-100 d-flex align-items-center justify-content-between border rounded-3`}
                            style={{
                                backgroundColor: option.isCorrect ? '#E8F5E9' : '#F5F5F5',
                                borderColor: option.isCorrect ? '#4CAF50' : '#E0E0E0',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <span className="small" style={{ color: '#082F43', fontWeight: option.isCorrect ? '600' : '400' }}>
                                {option.text}
                            </span>

                            {option.isCorrect ? (
                                <FaCheckCircle className="text-success" />
                            ) : (
                                <FaTimesCircle className="text-muted" style={{ opacity: 0.3 }} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuestionCard;