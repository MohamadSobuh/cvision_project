import React from 'react';
import { FaHtml5, FaJs, FaReact, FaSlack } from 'react-icons/fa';
import style from './Plan.module.css';
import { FaPython } from 'react-icons/fa';

export default function TopicSection({ topic, isActive, onClick }) {
    const { title, description, difficulty, tasks } = topic;

    const getIcon = () => {
        if (title.toLowerCase().includes('html')) return FaHtml5;
        if (title.toLowerCase().includes('javascript')) return FaJs;
        if (title.toLowerCase().includes('react')) return FaReact;
        if (title.toLowerCase().includes('python')) return FaPython;
        return FaSlack;
    }
    const Icon = getIcon();



    const completedCount = tasks ? tasks.filter(task => task.status === 'completed').length : 0;
    const totalCount = tasks ? tasks.length : 0;
    const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);


    return (
        <div
            className={`${style.topicCard} ${isActive ? style.active : ''}`}
            onClick={() => onClick && onClick(topic)}
        >

            <div className={style.topicCardHeader}>
                <div className={style.topicTitleRow}>
                    <Icon size={24} />
                    <span>{title}</span>
                </div>
                <div className={`${style.difficultyBadge} ${difficulty === 'Easy' ? style.easy : difficulty === 'Medium' ? style.medium : style.hard}`}>
                    {difficulty}
                </div>
            </div>

            <div className={style.topicProgressRow}>
                <span>{completedCount}/{totalCount} tasks</span>
                <span>{progressPercent}%</span>
            </div>
            <div className={style.topicProgressBarContainer}>
                <div
                    className={style.topicProgressBarFill}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
