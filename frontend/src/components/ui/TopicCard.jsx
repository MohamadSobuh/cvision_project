import React, { useState, useEffect, useRef } from 'react';
import style from "../../pages/admin/AddTopics.module.css";
import { FaBookOpen, FaEllipsisH, FaTasks, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

const TopicCard = ({ topic, language, t, onEditClick, onDeleteClick }) => {
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
    console.log(topic);

    return (
        <div className={style.topicCard}>

            <div className={style.cardHeader}>
                <div className={style.headerLeftGroup}>
                    <div className={style.iconBox}>
                        <FaBookOpen />
                    </div>
                    <span className={`${style.difficultyBadge} ${topic.difficulty?.toLowerCase() === 'easy' ? style.diffEasy : topic.difficulty?.toLowerCase() === 'medium' ? style.diffMedium : style.diffHard}`}>
                        {topic.difficulty?.toLowerCase() === 'easy' ? t('easy') : topic.difficulty?.toLowerCase() === 'medium' ? t('medium') : t('hard')}
                    </span>
                </div>

                <div className={style.menuContainer} ref={menuRef}>
                    <FaEllipsisH
                        className={style.moreIcon}
                        onClick={() => setShowMenu(!showMenu)}
                    />

                    {showMenu && (
                        <div className={`${style.dropdownMenu} ${language === 'ar' ? style.menuAr : style.menuEn}`}>

                            <button className={style.menuItem} onClick={() => {
                                onEditClick(topic);
                                setShowMenu(false);
                            }}>
                                <FaEdit className={`${language === 'ar' ? 'ms-2' : 'me-2'} text-success`} /> {t('editTopic')}
                            </button>

                            <button className={style.menuItem} onClick={() => {
                                onDeleteClick(topic.id);
                                setShowMenu(false);
                            }}>
                                <FaTrash className={`${language === 'ar' ? 'ms-2' : 'me-2'} text-danger`} /> {t('delete')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <h4 className={style.topicTitle}>{topic.title}</h4>
            <p className={style.topicDesc}>{topic.desc}</p>

            <hr className={style.cardDivider} />
            <div className={style.taskCount}>
                <FaTasks size={14} className={language === 'ar' ? 'ms-2' : 'me-2'} />
                <span>{topic.tasks || 0} {t?.tasks}</span>
            </div>

            <hr className={style.cardDivider} />

            <div className={style.cardFooter}>
                <span className={style.categoryTag}>{topic.category}</span>
            </div>
        </div>
    );
};

export default TopicCard;